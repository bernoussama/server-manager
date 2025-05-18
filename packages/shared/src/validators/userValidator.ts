import { z } from 'zod';

// Validator for user registration/signup
export const userSignupSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  name: z.string().optional(),
  age: z.number().positive().optional(),
});

// Validator for user login
export const userLoginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string(),
});

// Validator for creating a new user (admin operation)
export const createUserSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  age: z.number().int().positive({ message: 'Age must be a positive number' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }).optional(),
});

// Validator for updating a user
export const updateUserSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }).optional(),
  age: z.number().int().positive({ message: 'Age must be a positive number' }).optional(),
  email: z.string().email({ message: 'Please enter a valid email address' }).optional(),
}); 