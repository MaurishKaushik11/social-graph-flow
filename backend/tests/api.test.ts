import request from 'supertest';
import express from 'express';
import { randomUUID } from 'crypto';
import apiRoutes from '../src/routes/api';
import { UserService } from '../src/services/userService.js';
import { supabase } from '../src/database/connection.js';

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

describe('Cybernauts API Tests', () => {
  let userService: UserService;

  beforeAll(async () => {
    userService = new UserService();
  });

  beforeEach(async () => {
    // Clear database before each test
    await supabase.from('friendships').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('user_hobbies').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('hobbies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  });

  describe('User Management', () => {
    test('should create a new user', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ username: 'testuser', age: 25 });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe('testuser');
      expect(response.body.data.age).toBe(25);
    });

    test('should fetch all users', async () => {
      // Create test users
      await userService.createUser({ username: 'user1', age: 30 });
      await userService.createUser({ username: 'user2', age: 25 });

      const response = await request(app)
        .get('/api/users');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    test('should update a user', async () => {
      const user = await userService.createUser({ username: 'testuser', age: 25 });

      const response = await request(app)
        .put(`/api/users/${user.id}`)
        .send({ username: 'updateduser', age: 30 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe('updateduser');
      expect(response.body.data.age).toBe(30);
    });

    test('should delete a user without friendships', async () => {
      const user = await userService.createUser({ username: 'testuser', age: 25 });

      const response = await request(app)
        .delete(`/api/users/${user.id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should not delete a user with active friendships', async () => {
      const user1 = await userService.createUser({ username: 'user1', age: 25 });
      const user2 = await userService.createUser({ username: 'user2', age: 30 });

      await userService.createFriendship(user1.id, user2.id);

      const response = await request(app)
        .delete(`/api/users/${user1.id}`);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('active friendships');
    });
  });

  describe('Friendship Management', () => {
    let user1: any, user2: any;

    beforeEach(async () => {
      user1 = await userService.createUser({ username: 'user1', age: 25 });
      user2 = await userService.createUser({ username: 'user2', age: 30 });
    });

    test('should create a friendship', async () => {
      const response = await request(app)
        .post(`/api/users/${user1.id}/link`)
        .send({ userId: user2.id });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userId1).toBe(user1.id);
      expect(response.body.data.userId2).toBe(user2.id);
    });

    test('should not create duplicate friendship', async () => {
      await userService.createFriendship(user1.id, user2.id);

      const response = await request(app)
        .post(`/api/users/${user1.id}/link`)
        .send({ userId: user2.id });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    test('should not create self-friendship', async () => {
      const response = await request(app)
        .post(`/api/users/${user1.id}/link`)
        .send({ userId: user1.id });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    test('should remove a friendship', async () => {
      await userService.createFriendship(user1.id, user2.id);

      const response = await request(app)
        .delete(`/api/users/${user1.id}/unlink`)
        .send({ userId: user2.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Popularity Score Calculation', () => {
    let user1: any, user2: any;

    beforeEach(async () => {
      user1 = await userService.createUser({ username: 'user1', age: 25 });
      user2 = await userService.createUser({ username: 'user2', age: 30 });
    });

    test('should calculate score for user with no friends', async () => {
      const user = await userService.getUserById(user1.id);
      expect(user).not.toBeNull();
      expect(user!.popularityScore).toBe(0);
    });

    test('should calculate score for user with friends but no shared hobbies', async () => {
      await userService.createFriendship(user1.id, user2.id);

      const user = await userService.getUserById(user1.id);
      expect(user).not.toBeNull();
      expect(user!.popularityScore).toBe(1); // 1 friend + 0 shared hobbies
    });

    test('should calculate score with shared hobbies', async () => {
      // Add same hobby to both users
      const hobbyId = randomUUID();
      await supabase
        .from('hobbies')
        .insert({ id: hobbyId, name: 'Reading' });

      await supabase
        .from('user_hobbies')
        .insert([
          { user_id: user1.id, hobby_id: hobbyId },
          { user_id: user2.id, hobby_id: hobbyId }
        ]);

      await userService.createFriendship(user1.id, user2.id);

      const user = await userService.getUserById(user1.id);
      expect(user).not.toBeNull();
      expect(user!.popularityScore).toBe(1.5); // 1 friend + 1 shared hobby * 0.5
    });
  });

  describe('Graph Data', () => {
    test('should return graph data with nodes and edges', async () => {
      const user1 = await userService.createUser({ username: 'user1', age: 25 });
      const user2 = await userService.createUser({ username: 'user2', age: 30 });

      await userService.createFriendship(user1.id, user2.id);

      const response = await request(app)
        .get('/api/graph');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.nodes).toHaveLength(2);
      expect(response.body.data.edges).toHaveLength(1);
      expect(response.body.data.edges[0].source).toBe(user1.id);
      expect(response.body.data.edges[0].target).toBe(user2.id);
    });
  });

  describe('Error Handling', () => {
    test('should return 400 for invalid user data', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ username: 'ab', age: 0 }); // Invalid data

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/00000000-0000-0000-0000-000000000000');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('should return 409 for friendship conflicts', async () => {
      const user1 = await userService.createUser({ username: 'user1', age: 25 });
      const user2 = await userService.createUser({ username: 'user2', age: 30 });

      await userService.createFriendship(user1.id, user2.id);

      const response = await request(app)
        .post(`/api/users/${user1.id}/link`)
        .send({ userId: user2.id });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Validation', () => {
    test('should validate username length', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ username: 'a', age: 25 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.data[0].field).toBe('username');
    });

    test('should validate age range', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ username: 'testuser', age: 200 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.data[0].field).toBe('age');
    });

    test('should validate UUID format', async () => {
      const response = await request(app)
        .get('/api/users/invalid-uuid');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
