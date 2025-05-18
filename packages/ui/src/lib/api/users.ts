import apiClient from '../api';

// Types for user-related data
export interface User {
  id: number;
  name: string;
  age: number;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserPayload {
  name: string;
  age: number;
  email: string;
}

export interface UpdateUserPayload {
  name?: string;
  age?: number;
  email?: string;
}

/**
 * Users API module
 * Provides methods for interacting with user-related endpoints
 */
export const usersApi = {
  /**
   * Get all users
   */
  getAllUsers(): Promise<User[]> {
    return apiClient.get('/users');
  },

  /**
   * Get user by ID
   */
  getUserById(id: number): Promise<User> {
    return apiClient.get(`/users/${id}`);
  },

  /**
   * Create a new user
   */
  createUser(user: CreateUserPayload): Promise<User> {
    return apiClient.post('/users', user);
  },

  /**
   * Update an existing user
   */
  updateUser(id: number, user: UpdateUserPayload): Promise<User> {
    return apiClient.patch(`/users/${id}`, user);
  },

  /**
   * Delete a user
   */
  deleteUser(id: number): Promise<{ message: string }> {
    return apiClient.delete(`/users/${id}`);
  }
};

export default usersApi;