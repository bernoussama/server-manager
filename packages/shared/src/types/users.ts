// User Types

// Database user type reference (produced from Drizzle)
export interface User {
  id: number;
  email: string;
  isAdmin: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  name?: string;
  age?: number;
}

// Type for inserting a new user with credentials
export interface NewUserWithPassword {
  email: string;
  password: string;
  isAdmin?: boolean;
  name?: string;
  age?: number;
}

// Type for inserting a new user in the database (internal)
export interface NewUserCredentials {
  email: string;
  passwordHash: string;
  isAdmin?: boolean;
  name?: string;
  age?: number;
}

// User data for the frontend
export interface UserResponse {
  id: number;
  email: string;
  isAdmin: boolean;
  name?: string;
  age?: number;
  createdAt?: string;
  updatedAt?: string;
}

// User creation payload
export interface CreateUserPayload {
  name: string;
  age: number;
  email: string;
  password?: string;
  isAdmin?: boolean;
}

// User update payload
export interface UpdateUserPayload {
  name?: string;
  age?: number;
  email?: string;
  isAdmin?: boolean;
}

// Login request payload
export interface LoginRequest {
  email: string;
  password: string;
}

// Login response
export interface LoginResponse {
  message: string;
  token: string;
  user: UserResponse;
}

// Auth request type for middleware
export interface AuthUser {
  id: number;
  email: string;
  isAdmin: boolean;
} 