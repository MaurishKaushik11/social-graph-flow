// Frontend API client for backend communication
const API_BASE_URL = 'http://localhost:3001/api';

interface User {
  id: string;
  username: string;
  age: number;
  hobbies: string[];
  friends: string[];
  createdAt: string;
  popularityScore: number;
}

interface Hobby {
  id: string;
  name: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// API functions
export const api = {
  // Users
  async getUsers(): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/users`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async getUser(id: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/${id}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async createUser(user: { username: string; age: number }): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async updateUser(id: string, user: { username?: string; age?: number }): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async deleteUser(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
  },

  // Friendships
  async createFriendship(userId1: string, userId2: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/users/${userId1}/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId2 }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  async removeFriendship(userId1: string, userId2: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users/${userId1}/unlink`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId2 }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
  },

  // Graph data
  async getGraphData(): Promise<{ nodes: any[]; edges: any[] }> {
    const response = await fetch(`${API_BASE_URL}/graph`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  // Hobbies (extracted from users for now)
  async getHobbies(): Promise<Hobby[]> {
    try {
      const users = await this.getUsers();
      const hobbySet = new Set<string>();

      users.forEach(user => {
        if (user.hobbies) {
          user.hobbies.forEach(hobby => hobbySet.add(hobby));
        }
      });

      // Convert to hobby objects with IDs
      return Array.from(hobbySet).map((name, index) => ({
        id: `hobby-${index}`,
        name
      }));
    } catch (error) {
      // Fallback: return default hobbies if API fails
      return [
        { id: 'hobby-1', name: 'Reading' },
        { id: 'hobby-2', name: 'Gaming' },
        { id: 'hobby-3', name: 'Cooking' },
        { id: 'hobby-4', name: 'Hiking' },
        { id: 'hobby-5', name: 'Photography' },
        { id: 'hobby-6', name: 'Music' },
        { id: 'hobby-7', name: 'Painting' },
        { id: 'hobby-8', name: 'Dancing' },
        { id: 'hobby-9', name: 'Sports' },
        { id: 'hobby-10', name: 'Traveling' },
      ];
    }
  },

  // Add hobby to user
  async addHobbyToUser(userId: string, hobbyName: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/hobbies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hobbyName }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
  }
};
