import { v4 as uuidv4 } from 'uuid';

// Mock data for fallback
let mockUsers = [
  {
    id: '1',
    username: 'Alice',
    age: 25,
    hobbies: ['Reading', 'Hiking'],
    friends: ['2', '3'],
    createdAt: new Date().toISOString(),
    popularityScore: 7.5
  },
  {
    id: '2',
    username: 'Bob',
    age: 30,
    hobbies: ['Cooking', 'Surfing'],
    friends: ['1', '3'],
    createdAt: new Date().toISOString(),
    popularityScore: 5.0
  },
  {
    id: '3',
    username: 'Charlie',
    age: 28,
    hobbies: ['Music'],
    friends: ['1', '2'],
    createdAt: new Date().toISOString(),
    popularityScore: 3.0
  },
  {
    id: '4',
    username: 'Diana',
    age: 22,
    hobbies: ['Painting'],
    friends: ['5'],
    createdAt: new Date().toISOString(),
    popularityScore: 2.5
  },
  {
    id: '5',
    username: 'Eve',
    age: 35,
    hobbies: ['Dancing', 'Traveling'],
    friends: ['4'],
    createdAt: new Date().toISOString(),
    popularityScore: 6.0
  }
];

let mockEdges = [
  { id: 'e1', source: '1', target: '2' },
  { id: 'e2', source: '1', target: '3' },
  { id: 'e3', source: '2', target: '3' },
  { id: 'e4', source: '4', target: '5' }
];

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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

// API functions with fallback mocks
export const api = {
  // Users
  async getUsers(): Promise<User[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/users`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      mockUsers = data.data; // Sync with real data if available
      return data.data;
    } catch (error) {
      console.warn('API failed, using mocks:', error);
      return mockUsers;
    }
  },

  async getUser(id: string): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      return data.data;
    } catch (error) {
      const user = mockUsers.find(u => u.id === id);
      if (!user) throw new Error('User not found');
      return user;
    }
  },

  async createUser(user: { username: string; age: number }): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      const newUser = data.data;
      mockUsers.push(newUser); // Sync mock
      return newUser;
    } catch (error) {
      const newId = uuidv4();
      const newUser: User = {
        id: newId,
        ...user,
        hobbies: [],
        friends: [],
        createdAt: new Date().toISOString(),
        popularityScore: 1.0
      };
      mockUsers.push(newUser);
      return newUser;
    }
  },

  async updateUser(id: string, updates: { username?: string; age?: number }): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      const updatedUser = data.data;
      const index = mockUsers.findIndex(u => u.id === id);
      if (index > -1) mockUsers[index] = updatedUser;
      return updatedUser;
    } catch (error) {
      const index = mockUsers.findIndex(u => u.id === id);
      if (index === -1) throw new Error('User not found');
      mockUsers[index] = { ...mockUsers[index], ...updates };
      mockUsers[index].popularityScore = Math.max(1, mockUsers[index].hobbies.length + mockUsers[index].friends.length * 0.5);
      return mockUsers[index];
    }
  },

  async deleteUser(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      mockUsers = mockUsers.filter(u => u.id !== id);
      mockEdges = mockEdges.filter(e => e.source !== id && e.target !== id);
    } catch (error) {
      const index = mockUsers.findIndex(u => u.id === id);
      if (index === -1) throw new Error('User not found');
      mockUsers.splice(index, 1);
      mockEdges = mockEdges.filter(e => e.source !== id && e.target !== id);
    }
  },

  // Friendships
  async createFriendship(userId1: string, userId2: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId1}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId2 }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      const newEdge = data.data;
      mockEdges.push(newEdge);
      // Update popularity
      [userId1, userId2].forEach(id => {
        const index = mockUsers.findIndex(u => u.id === id);
        if (index > -1) mockUsers[index].popularityScore += 0.5;
      });
      return newEdge;
    } catch (error) {
      if (userId1 === userId2) throw new Error('Cannot friend yourself');
      const existing = mockEdges.find(e => (e.source === userId1 && e.target === userId2) || (e.source === userId2 && e.target === userId1));
      if (existing) throw new Error('Friendship already exists');
      const newId = uuidv4();
      const newEdge = { id: newId, source: userId1, target: userId2 };
      mockEdges.push(newEdge);
      // Update popularity
      [userId1, userId2].forEach(id => {
        const index = mockUsers.findIndex(u => u.id === id);
        if (index > -1) mockUsers[index].popularityScore += 0.5;
      });
      return newEdge;
    }
  },

  async removeFriendship(userId1: string, userId2: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId1}/unlink`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId2 }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      mockEdges = mockEdges.filter(e => !((e.source === userId1 && e.target === userId2) || (e.source === userId2 && e.target === userId1)));
      // Update popularity
      [userId1, userId2].forEach(id => {
        const index = mockUsers.findIndex(u => u.id === id);
        if (index > -1) mockUsers[index].popularityScore = Math.max(1, mockUsers[index].hobbies.length + mockUsers[index].friends.length * 0.5);
      });
    } catch (error) {
      mockEdges = mockEdges.filter(e => !((e.source === userId1 && e.target === userId2) || (e.source === userId2 && e.target === userId1)));
      [userId1, userId2].forEach(id => {
        const index = mockUsers.findIndex(u => u.id === id);
        if (index > -1) mockUsers[index].popularityScore = Math.max(1, mockUsers[index].hobbies.length + mockUsers[index].friends.length * 0.5);
      });
    }
  },

  // Graph data
  async getGraphData(): Promise<{ nodes: any[]; edges: any[] }> {
    try {
      const response = await fetch(`${API_BASE_URL}/graph`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      // Sync mocks
      mockUsers = data.data.nodes.map((n: any) => ({
        id: n.id,
        username: n.username,
        age: n.age,
        hobbies: n.hobbies,
        friends: [], // Requery if needed
        createdAt: new Date().toISOString(),
        popularityScore: n.popularityScore
      }));
      mockEdges = data.data.edges;
      return data.data;
    } catch (error) {
      console.warn('API failed, using mocks for graph:', error);
      const nodes = mockUsers.map(user => ({
        id: user.id,
        username: user.username,
        age: user.age,
        popularityScore: user.popularityScore,
        hobbies: user.hobbies
      }));
      return { nodes, edges: mockEdges };
    }
  },

  // Hobbies
  async getHobbies(): Promise<Hobby[]> {
    try {
      const users = await this.getUsers();
      const hobbySet = new Set<string>();
      users.forEach(user => user.hobbies.forEach((hobby: string) => hobbySet.add(hobby)));
      return Array.from(hobbySet).map((name, index) => ({
        id: `hobby-${index}`,
        name
      }));
    } catch (error) {
      // Fallback default hobbies
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
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/hobbies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hobbyName }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      const index = mockUsers.findIndex(u => u.id === userId);
      if (index > -1 && !mockUsers[index].hobbies.includes(hobbyName)) {
        mockUsers[index].hobbies.push(hobbyName);
        mockUsers[index].popularityScore += 1;
      }
    } catch (error) {
      const index = mockUsers.findIndex(u => u.id === userId);
      if (index > -1 && !mockUsers[index].hobbies.includes(hobbyName)) {
        mockUsers[index].hobbies.push(hobbyName);
        mockUsers[index].popularityScore += 1;
      }
    }
  }
};
