import { Request, Response } from "express";
import { db } from "../lib/db";
import { users } from "../models/user";
import { eq } from "drizzle-orm";
// import { z } from "zod"; // Removed zod import, will use shared
import { authService } from '../lib/auth';
import logger from '../lib/logger';
import { createUserSchema, updateUserSchema } from '@server-manager/shared/validators'; // Import shared validators
import { ZodError } from 'zod'; // Import ZodError for handling validation errors

// Validation schema for user input (Removed)
// const userSchema = z.object({
//   name: z.string().min(2).max(50),
//   age: z.number().min(0).max(150),
//   email: z.string().email(),
// });

class UsersController {
  /**
   * Get all users
   */
  async getAllUsers(req: Request, res: Response) {
    try {
      const result = await db.select().from(users);
      
      logger.info(`Retrieved ${result.length} users`);
      res.status(200).json(result);
    } catch (error) {
      logger.error("Error fetching users:", error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  }

  /**
   * Get a specific user by ID
   */
  async getUserById(req: Request, res: Response) {
    const userId = parseInt(req.params.id, 10);
    
    if (isNaN(userId)) {
      logger.warn(`Invalid user ID provided: ${req.params.id}`);
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    try {
      const userResults = await db.select()
        .from(users)
        .where(eq(users.id, userId));
        
      if (userResults.length === 0) {
        logger.info(`User not found with ID: ${userId}`);
        return res.status(404).json({ message: 'User not found' });
      }
      
      const user = userResults[0];
      logger.info(`Retrieved user with ID: ${userId}`);
      res.status(200).json(user);
    } catch (error) {
      logger.error("Error fetching user:", error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  }

  /**
   * Create a new user
   */
  async createUser(req: Request, res: Response) {
    try {
      // Validate request body using shared schema
      const validatedData = createUserSchema.parse(req.body);
      const { email, password, name } = validatedData;

      // Check if user already exists
      const existingUser = await db.select()
        .from(users)
        .where(eq(users.email, email));
      
      if (existingUser.length > 0) {
        logger.warn(`Attempted to create user with existing email: ${email}`);
        return res.status(409).json({ message: 'User with this email already exists' });
      }
      
      const passwordHash = await authService.hashPassword(password || "defaultPassword123"); // Ensure password exists or use a default (consider implications)
      
      // Prepare data for insertion
      const newUserPayload = { email, name, passwordHash }; // name is now required
      // if (name) newUserPayload.name = name; // No longer conditional
      // if (age) newUserPayload.age = age; // Removed age

      // Insert the new user
      const result = await db.insert(users).values(newUserPayload).returning();
      
      logger.info(`Created new user with email: ${email}`);
      
      const user = result[0];
      
      // Create a sanitized user object without the password hash
      const userResponse = {
        id: user.id,
        email: user.email,
        name: user.name, // name is now part of the users table model
        // age: user.age,   // age removed
      };
      
      res.status(201).json(userResponse);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('User creation validation failed:', error.errors);
        return res.status(400).json({ message: 'Validation failed', errors: error.errors });
      }
      logger.error("Error creating user:", error);
      res.status(500).json({ message: 'Failed to create user' });
    }
  }

  /**
   * Update an existing user
   */
  async updateUser(req: Request, res: Response) {
    const userId = parseInt(req.params.id, 10);
    
    if (isNaN(userId)) {
      logger.warn(`Invalid user ID provided for update: ${req.params.id}`);
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    try {
      // Validate request body
      const validatedData = updateUserSchema.parse(req.body);
      const { email, name } = validatedData;

      // Check if user exists
      const userResults = await db.select()
        .from(users)
        .where(eq(users.id, userId));
      
      if (userResults.length === 0) {
        logger.info(`Attempted to update non-existent user with ID: ${userId}`);
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Build update object with only the provided fields
      const updateData: any = { updatedAt: new Date() };
      if (email !== undefined) updateData.email = email;
      if (name !== undefined) updateData.name = name; // name is part of the users table model
      // if (age !== undefined) updateData.age = age; // age removed
      
      // Update the user
      const result = await db.update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();
      
      logger.info(`Updated user with ID: ${userId}`);
      
      const updatedUser = result[0];
      
      // Create a sanitized user object without the password hash
      const userResponse = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name, // name is now part of the users table model
        // age: updatedUser.age,   // age removed
      };
      
      res.status(200).json(userResponse);
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn(`User update validation failed for ID ${userId}:`, error.errors);
        return res.status(400).json({ message: 'Validation failed', errors: error.errors });
      }
      logger.error("Error updating user:", error);
      res.status(500).json({ message: 'Failed to update user' });
    }
  }

  /**
   * Delete a user
   */
  async deleteUser(req: Request, res: Response) {
    const userId = parseInt(req.params.id, 10);
    
    if (isNaN(userId)) {
      logger.warn(`Invalid user ID provided for deletion: ${req.params.id}`);
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    try {
      // Delete the user
      const result = await db.delete(users)
        .where(eq(users.id, userId))
        .returning();
      
      if (result.length === 0) {
        logger.info(`Attempted to delete non-existent user with ID: ${userId}`);
        return res.status(404).json({ message: 'User not found' });
      }
      
      logger.info(`Deleted user with ID: ${userId}`);
      res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
      logger.error("Error deleting user:", error);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  }
}

export default new UsersController();

