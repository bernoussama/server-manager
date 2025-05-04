// src/test/lib/api/users.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { server } from '../../setup';
import { http, HttpResponse } from 'msw';
import { usersApi, User, CreateUserPayload, UpdateUserPayload } from '../../../lib/api/users';
import apiClient from '../../../lib/api';

// Spy on the apiClient methods
vi.spyOn(apiClient, 'get');
vi.spyOn(apiClient, 'post');
vi.spyOn(apiClient, 'patch');
vi.spyOn(apiClient, 'delete');

describe('Users API Client', () => {
  const API_BASE_URL = 'http://localhost:3000/api';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should fetch all users successfully', async () => {
      // Arrange
      const mockUsers: User[] = [
        { id: 1, name: 'John Doe', age: 30, email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', age: 28, email: 'jane@example.com' }
      ];
      
      server.use(
        http.get(`${API_BASE_URL}/users`, () => {
          return HttpResponse.json(mockUsers);
        })
      );
      
      // Act
      const result = await usersApi.getAllUsers();
      
      // Assert
      expect(result).toEqual(mockUsers);
      expect(apiClient.get).toHaveBeenCalledWith('/users');
    });
  });

  describe('getUserById', () => {
    it('should fetch a user by ID successfully', async () => {
      // Arrange
      const userId = 1;
      const mockUser: User = {
        id: userId,
        name: 'John Doe',
        age: 30,
        email: 'john@example.com'
      };
      
      server.use(
        http.get(`${API_BASE_URL}/users/${userId}`, () => {
          return HttpResponse.json(mockUser);
        })
      );
      
      // Act
      const result = await usersApi.getUserById(userId);
      
      // Assert
      expect(result).toEqual(mockUser);
      expect(apiClient.get).toHaveBeenCalledWith(`/users/${userId}`);
    });
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      // Arrange
      const createUserPayload: CreateUserPayload = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com'
      };
      
      const mockCreatedUser: User = {
        id: 1,
        ...createUserPayload
      };
      
      server.use(
        http.post(`${API_BASE_URL}/users`, async ({ request }) => {
          const body = await request.json();
          expect(body).toEqual(createUserPayload);
          return HttpResponse.json(mockCreatedUser);
        })
      );
      
      // Act
      const result = await usersApi.createUser(createUserPayload);
      
      // Assert
      expect(result).toEqual(mockCreatedUser);
      expect(apiClient.post).toHaveBeenCalledWith('/users', createUserPayload);
    });
  });

  describe('updateUser', () => {
    it('should update a user successfully', async () => {
      // Arrange
      const userId = 1;
      const updateUserPayload: UpdateUserPayload = {
        name: 'John Updated',
        age: 31
      };
      
      const mockUpdatedUser: User = {
        id: userId,
        name: 'John Updated',
        age: 31,
        email: 'john@example.com'
      };
      
      server.use(
        http.patch(`${API_BASE_URL}/users/${userId}`, async ({ request }) => {
          const body = await request.json();
          expect(body).toEqual(updateUserPayload);
          return HttpResponse.json(mockUpdatedUser);
        })
      );
      
      // Act
      const result = await usersApi.updateUser(userId, updateUserPayload);
      
      // Assert
      expect(result).toEqual(mockUpdatedUser);
      expect(apiClient.patch).toHaveBeenCalledWith(`/users/${userId}`, updateUserPayload);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user successfully', async () => {
      // Arrange
      const userId = 1;
      const mockResponse = { message: 'User deleted successfully' };
      
      server.use(
        http.delete(`${API_BASE_URL}/users/${userId}`, () => {
          return HttpResponse.json(mockResponse);
        })
      );
      
      // Act
      const result = await usersApi.deleteUser(userId);
      
      // Assert
      expect(result).toEqual(mockResponse);
      expect(apiClient.delete).toHaveBeenCalledWith(`/users/${userId}`);
    });
  });
});