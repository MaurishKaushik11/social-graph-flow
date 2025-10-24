import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../database/connection.js';
import { calculatePopularityScore } from '../database/schema.js';
import type { User, CreateUserRequest, UpdateUserRequest, Friendship, GraphData, GraphNode, GraphEdge } from '../types.js';
import { createUserSchema, updateUserSchema } from '../validation.js';

export class UserService {

  async getAllUsers(): Promise<User[]> {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, age, created_at')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Get hobbies and scores for each user
    const usersWithDetails = await Promise.all(
      users.map(async (user: any) => {
        const { data: userHobbies } = await supabase
          .from('user_hobbies')
          .select(`
            hobby_id,
            hobbies (
              name
            )
          `)
          .eq('user_id', user.id);

        const popularityScore = await calculatePopularityScore(user.id);

        // Get friends
        const { data: friendships } = await supabase
          .from('friendships')
          .select('user_id_1, user_id_2')
          .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

        const friends = friendships?.map((f: any) => f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1) || [];

        return {
          id: user.id,
          username: user.username,
          age: user.age,
          hobbies: userHobbies?.map((uh: any) => uh.hobbies.name) || [],
          friends,
          createdAt: user.created_at,
          popularityScore
        };
      })
    );

    return usersWithDetails;
  }

  async getUserById(id: string): Promise<User | null> {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, age, created_at')
      .eq('id', id)
      .single();

    if (error || !user) return null;

    const { data: userHobbies } = await supabase
      .from('user_hobbies')
      .select(`
        hobby_id,
        hobbies (
          name
        )
      `)
      .eq('user_id', id);

    const popularityScore = await calculatePopularityScore(id);

    const { data: friendships } = await supabase
      .from('friendships')
      .select('user_id_1, user_id_2')
      .or(`user_id_1.eq.${id},user_id_2.eq.${id}`);

    const friends = friendships?.map((f: any) => f.user_id_1 === id ? f.user_id_2 : f.user_id_1) || [];

    return {
      id: user.id,
      username: user.username,
      age: user.age,
      hobbies: userHobbies?.map((uh: any) => uh.hobbies.name) || [],
      friends,
      createdAt: user.created_at,
      popularityScore
    };
  }

  async createUser(data: CreateUserRequest): Promise<User> {
    // Validate input
    const validatedData = createUserSchema.parse(data);

    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', validatedData.username)
      .single();

    if (existingUser) {
      throw new Error('Username already exists');
    }

    const userId = uuidv4();
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({ id: userId, username: validatedData.username, age: validatedData.age })
      .select()
      .single();

    if (error || !newUser) throw new Error('Failed to create user');

    const user = await this.getUserById(userId);
    if (!user) throw new Error('Failed to create user');
    return user;
  }

  async updateUser(id: string, data: UpdateUserRequest): Promise<User> {
    // Validate input
    const validatedData = updateUserSchema.parse(data);

    // Check if user exists
    const existingUser = await this.getUserById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Check if username is already taken by another user
    if (validatedData.username) {
      const { data: usernameCheck } = await supabase
        .from('users')
        .select('id')
        .eq('username', validatedData.username)
        .neq('id', id)
        .single();

      if (usernameCheck) {
        throw new Error('Username already exists');
      }
    }

    // Update user
    const updatePayload: any = {};
    if (validatedData.username) updatePayload.username = validatedData.username;
    if (validatedData.age !== undefined) updatePayload.age = validatedData.age;

    const { data: updatedUserData, error } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedUserData) throw new Error('Failed to update user');

    const user = await this.getUserById(id);
    if (!user) throw new Error('Failed to retrieve updated user');
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    // Check if user exists
    const user = await this.getUserById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user has any friendships
    const { count: friendshipsCount, error: countError } = await supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .or(`user_id_1.eq.${id},user_id_2.eq.${id}`);

    if (countError) throw countError;
    if (friendshipsCount && friendshipsCount > 0) {
      throw new Error('Cannot delete user with active friendships. Remove friendships first.');
    }

    // Delete user (cascading will handle user_hobbies)
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteError) throw new Error('Failed to delete user');
  }

  async createFriendship(userId1: string, userId2: string): Promise<Friendship> {
    // Ensure userId1 < userId2 for consistent ordering
    const [id1, id2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

    // Check if both users exist
    const user1 = await this.getUserById(id1);
    const user2 = await this.getUserById(id2);

    if (!user1 || !user2) {
      throw new Error('One or both users not found');
    }

    // Check if friendship already exists
    const { data: existingFriendship } = await supabase
      .from('friendships')
      .select('id')
      .eq('user_id_1', id1)
      .eq('user_id_2', id2)
      .single();

    if (existingFriendship) {
      throw new Error('Friendship already exists');
    }

    // Prevent self-friendship
    if (id1 === id2) {
      throw new Error('Cannot create friendship with yourself');
    }

    const friendshipId = uuidv4();
    const { data: newFriendship, error } = await supabase
      .from('friendships')
      .insert({ id: friendshipId, user_id_1: id1, user_id_2: id2 })
      .select()
      .single();

    if (error || !newFriendship) throw new Error('Failed to create friendship');

    return {
      id: friendshipId,
      userId1: id1,
      userId2: id2,
      createdAt: newFriendship.created_at || new Date().toISOString()
    };
  }

  async removeFriendship(userId1: string, userId2: string): Promise<void> {
    // Ensure userId1 < userId2 for consistent ordering
    const [id1, id2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('user_id_1', id1)
      .eq('user_id_2', id2);

    if (error) throw new Error('Friendship not found');
  }

  async getGraphData(): Promise<GraphData> {
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
    const { data: friendships } = await supabase
      .from('friendships')
      .select('id, user_id_1, user_id_2');

    const edges: GraphEdge[] = (friendships || []).map((friendship: any) => ({
      id: friendship.id,
      source: friendship.user_id_1,
      target: friendship.user_id_2
    }));

    return {
      nodes,
      edges
    };
  }

  async addHobbyToUser(userId: string, hobbyName: string): Promise<void> {
    // Check if user exists
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get hobby id
    let { data: hobby, error: hobbyError } = await supabase
      .from('hobbies')
      .select('id')
      .eq('name', hobbyName)
      .single();

    if (hobbyError && hobbyError.code !== 'PGRST116') { // PGRST116 is no rows
      throw new Error('Failed to fetch hobby');
    }

    let hobbyId: string;
    if (!hobby) {
      hobbyId = uuidv4();
      const { error: insertError } = await supabase
        .from('hobbies')
        .insert({ id: hobbyId, name: hobbyName });

      if (insertError) throw new Error('Failed to create hobby');
    } else {
      hobbyId = hobby.id;
    }

    // Check if hobby already assigned to user
    const { data: existingHobby } = await supabase
      .from('user_hobbies')
      .select('id')
      .eq('user_id', userId)
      .eq('hobby_id', hobbyId)
      .single();

    if (existingHobby) {
      throw new Error('Hobby already assigned to user');
    }

    // Assign hobby to user
    const { error: assignError } = await supabase
      .from('user_hobbies')
      .insert({ user_id: userId, hobby_id: hobbyId });

    if (assignError) throw new Error('Failed to assign hobby');
  }
}
