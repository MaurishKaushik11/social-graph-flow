export interface User {
  id: string;
  username: string;
  age: number;
  hobbies: string[];
  friends: string[];
  createdAt: string;
  popularityScore: number;
}

export interface CreateUserRequest {
  username: string;
  age: number;
}

export interface UpdateUserRequest {
  username?: string;
  age?: number;
}

export interface Friendship {
  id: string;
  userId1: string;
  userId2: string;
  createdAt: string;
}

export interface GraphNode {
  id: string;
  username: string;
  age: number;
  popularityScore: number;
  hobbies: string[];
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}
