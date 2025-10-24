import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/connection.js';
import { calculatePopularityScore } from '../database/schema.js';
import type { User, CreateUserRequest, UpdateUserRequest, Friendship, GraphData, GraphNode, GraphEdge } from '../types.js';
import { createUserSchema, updateUserSchema } from '../validation.js';

export class UserService {
  constructor(private db: Promise<any> = getDatabase()) {}

  async getAllUsers(): Promise<User[]> {
    const database = await this.db;

    const users = await database.getDatabase().all(`
      SELECT id, username, age, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    // Get hobbies and scores for each user
    const usersWithDetails = await Promise.all(
      users.map(async (user: any) => {
        const hobbies = await database.getDatabase().all(`
          SELECT h.name
          FROM hobbies h
          INNER JOIN user_hobbies uh ON h.id = uh.hobby_id
          WHERE uh.user_id = ?
        `, [user.id]);

        const popularityScore = await calculatePopularityScore(database.getDatabase(), user.id);

        // Get friends
        const friends = await database.getDatabase().all(`
          SELECT DISTINCT CASE
            WHEN user_id_1 = ? THEN user_id_2
            WHEN user_id_2 = ? THEN user_id_1
          END as friend_id
          FROM friendships
          WHERE user_id_1 = ? OR user_id_2 = ?
        `, [user.id, user.id, user.id, user.id]);

        return {
          id: user.id,
          username: user.username,
          age: user.age,
          hobbies: hobbies.map((h: any) => h.name),
          friends: friends.map((f: any) => f.friend_id),
          createdAt: user.created_at,
          popularityScore
        };
      })
    );

    return usersWithDetails;
  }

  async getUserById(id: string): Promise<User | null> {
    const database = await this.db;

    const user = await database.getDatabase().get(`
      SELECT id, username, age, created_at
      FROM users
      WHERE id = ?
    `, [id]);

    if (!user) return null;

    const hobbies = await database.getDatabase().all(`
      SELECT h.name
      FROM hobbies h
      INNER JOIN user_hobbies uh ON h.id = uh.hobby_id
      WHERE uh.user_id = ?
    `, [id]);

    const popularityScore = await calculatePopularityScore(database.getDatabase(), id);

    const friends = await database.getDatabase().all(`
      SELECT DISTINCT CASE
        WHEN user_id_1 = ? THEN user_id_2
        WHEN user_id_2 = ? THEN user_id_1
      END as friend_id
      FROM friendships
      WHERE user_id_1 = ? OR user_id_2 = ?
    `, [id, id, id, id]);

    return {
      id: user.id,
      username: user.username,
      age: user.age,
      hobbies: hobbies.map((h: any) => h.name),
      friends: friends.map((f: any) => f.friend_id),
      createdAt: user.created_at,
      popularityScore
    };
  }

  async createUser(data: CreateUserRequest): Promise<User> {
    const database = await this.db;

    // Validate input
    const validatedData = createUserSchema.parse(data);

    // Check if username already exists
    const existingUser = await database.getDatabase().get(
      'SELECT id FROM users WHERE username = ?',
      [validatedData.username]
    );

    if (existingUser) {
      throw new Error('Username already exists');
    }

    const userId = uuidv4();
    const result = await database.getDatabase().run(
      'INSERT INTO users (id, username, age) VALUES (?, ?, ?)',
      [userId, validatedData.username, validatedData.age]
    );

    const user = await this.getUserById(userId);
    if (!user) throw new Error('Failed to create user');

    return user;
  }

  async updateUser(id: string, data: UpdateUserRequest): Promise<User> {
    const database = await this.db;

    // Validate input
    const validatedData = updateUserSchema.parse(data);

    // Check if user exists
    const existingUser = await this.getUserById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Check if username is already taken by another user
    if (validatedData.username) {
      const usernameCheck = await database.getDatabase().get(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [validatedData.username, id]
      );

      if (usernameCheck) {
        throw new Error('Username already exists');
      }
    }

    // Update user
    const updateFields = [];
    const updateValues = [];

    if (validatedData.username) {
      updateFields.push('username = ?');
      updateValues.push(validatedData.username);
    }

    if (validatedData.age !== undefined) {
      updateFields.push('age = ?');
      updateValues.push(validatedData.age);
    }

    if (updateFields.length > 0) {
      updateValues.push(id);
      await database.getDatabase().run(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }

    const updatedUser = await this.getUserById(id);
    if (!updatedUser) throw new Error('Failed to update user');

    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    const database = await this.db;

    // Check if user exists
    const user = await this.getUserById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user has any friendships
    const friendships = await database.getDatabase().all(`
      SELECT id FROM friendships
      WHERE user_id_1 = ? OR user_id_2 = ?
    `, [id, id]);

    if (friendships.length > 0) {
      throw new Error('Cannot delete user with active friendships. Remove friendships first.');
    }

    // Delete user (cascading will handle user_hobbies)
    await database.getDatabase().run('DELETE FROM users WHERE id = ?', [id]);
  }

  async createFriendship(userId1: string, userId2: string): Promise<Friendship> {
    const database = await this.db;

    // Ensure userId1 < userId2 for consistent ordering
    const [id1, id2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

    // Check if both users exist
    const user1 = await this.getUserById(id1);
    const user2 = await this.getUserById(id2);

    if (!user1 || !user2) {
      throw new Error('One or both users not found');
    }

    // Check if friendship already exists
    const existingFriendship = await database.getDatabase().get(
      'SELECT id FROM friendships WHERE user_id_1 = ? AND user_id_2 = ?',
      [id1, id2]
    );

    if (existingFriendship) {
      throw new Error('Friendship already exists');
    }

    // Prevent self-friendship
    if (id1 === id2) {
      throw new Error('Cannot create friendship with yourself');
    }

    const friendshipId = uuidv4();
    await database.getDatabase().run(
      'INSERT INTO friendships (id, user_id_1, user_id_2) VALUES (?, ?, ?)',
      [friendshipId, id1, id2]
    );

    return {
      id: friendshipId,
      userId1: id1,
      userId2: id2,
      createdAt: new Date().toISOString()
    };
  }

  async removeFriendship(userId1: string, userId2: string): Promise<void> {
    const database = await this.db;

    // Ensure userId1 < userId2 for consistent ordering
    const [id1, id2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

    const result = await database.getDatabase().run(
      'DELETE FROM friendships WHERE user_id_1 = ? AND user_id_2 = ?',
      [id1, id2]
    );

    if (result.changes === 0) {
      throw new Error('Friendship not found');
    }
  }

  async getGraphData(): Promise<GraphData> {
    const database = await this.db;

    // Get all users with their details
    const users = await this.getAllUsers();

    // Create nodes
    const nodes: GraphNode[] = users.map(user => ({
      id: user.id,
      username: user.username,
      age: user.age,
      popularityScore: user.popularityScore,
      hobbies: user.hobbies
    }));

    // Create edges from friendships
    const friendships = await database.getDatabase().all(`
      SELECT id, user_id_1, user_id_2 FROM friendships
    `);

    const edges: GraphEdge[] = friendships.map(friendship => ({
      id: friendship.id,
      source: friendship.user_id_1,
      target: friendship.user_id_2
    }));

    return {
      nodes,
      edges
    };
  }
}
