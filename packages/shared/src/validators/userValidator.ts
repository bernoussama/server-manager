import { z } from 'zod';

// Validator for user registration/signup input
export const userSignupInput = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
});
export type UserSignupInputType = z.infer<typeof userSignupInput>;

// Validator for user login input
export const userLoginInput = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string(),
});
export type UserLoginInputType = z.infer<typeof userLoginInput>;

// Validator for creating a new user input (e.g., admin operation)
// This aligns with the backend's current capability (email, password only due to DB model)
export const userCreateInput = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
});
export type UserCreateInputType = z.infer<typeof userCreateInput>;

// Validator for updating a user input
// This aligns with the backend's current capability (email only due to DB model)
export const userUpdateInput = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }).optional(),
}); 
export type UserUpdateInputType = z.infer<typeof userUpdateInput>;

// Validator for user ID input
export const userIdInput = z.object({
  id: z.number().int().positive({ message: 'User ID must be a positive integer' }),
});
export type UserIdInputType = z.infer<typeof userIdInput>;

// Schema for user data returned by the API (excludes sensitive fields like passwordHash)
export const userOutput = z.object({
  id: z.number().int(),
  email: z.string().email(),
  // Assuming Date objects are handled by tRPC (e.g., with superjson)
  // If dates are stringified in the API response, use z.string().datetime() or z.string()
  createdAt: z.coerce.date(), // Coerce to date as it comes from DB as number/string
  updatedAt: z.coerce.date(), // Coerce to date
});
export type UserOutputType = z.infer<typeof userOutput>;

// Schema for the response of the login endpoint
export const loginOutput = z.object({
  message: z.string(),
  token: z.string(),
  user: userOutput, // Embed the userOutput schema
});
export type LoginOutputType = z.infer<typeof loginOutput>;