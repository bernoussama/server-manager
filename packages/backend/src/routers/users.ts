import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { db } from '../lib/db';
import { users, User, NewUser } from '../models/user'; // User and NewUser types from model
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import logger from '../lib/logger';

const SALT_ROUNDS = 10; // Same as in authController

// Helper to sanitize user data (remove passwordHash)
const sanitizeUser = (user: User): Omit<User, 'passwordHash'> => {
  const { passwordHash, ...sanitized } = user;
  return sanitized;
};

// Zod schema for ID input
const idSchema = z.object({
  id: z.number().int().positive({ message: 'User ID must be a positive integer' }),
});

// Zod schema for creating a user (email and password)
const userCreateSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
});

// Zod schema for updating a user (only email can be updated based on current model)
const userUpdateSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }).optional(),
});


export const usersRouter = router({
  // Get all users
  getAll: publicProcedure
    .query(async () => {
      logger.info('(tRPC) Request to get all users');
      try {
        const result = await db.select().from(users);
        logger.info(`(tRPC) Retrieved ${result.length} users`);
        return result.map(sanitizeUser);
      } catch (error) {
        logger.error('(tRPC) Error fetching users:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch users',
          cause: error instanceof Error ? error : undefined,
        });
      }
    }),

  // Get a specific user by ID
  getById: publicProcedure
    .input(idSchema)
    .query(async ({ input }) => {
      const { id } = input;
      logger.info(`(tRPC) Request to get user by ID: ${id}`);
      try {
        const userArray = await db.select().from(users).where(eq(users.id, id)).limit(1);
        if (userArray.length === 0) {
          logger.info(`(tRPC) User not found with ID: ${id}`);
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }
        const user = userArray[0];
        logger.info(`(tRPC) Retrieved user with ID: ${id}`);
        return sanitizeUser(user);
      } catch (error) {
        logger.error(`(tRPC) Error fetching user with ID ${id}:`, error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch user',
          cause: error instanceof Error ? error : undefined,
        });
      }
    }),

  // Create a new user
  create: publicProcedure
    .input(userCreateSchema)
    .mutation(async ({ input }) => {
      const { email, password } = input;
      logger.info(`(tRPC) Request to create user with email: ${email}`);
      try {
        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existingUser.length > 0) {
          logger.warn(`(tRPC) Attempted to create user with existing email: ${email}`);
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'User with this email already exists',
          });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const newUser: NewUser = { email, passwordHash }; // Drizzle will handle createdAt/updatedAt

        const insertedUsers = await db.insert(users).values(newUser).returning();
        
        if (insertedUsers.length === 0 || !insertedUsers[0]) {
            logger.error(`(tRPC) Failed to insert user with email: ${email} into database.`);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to create user due to database error.',
            });
        }
        const user = insertedUsers[0];
        logger.info(`(tRPC) Created new user with email: ${email}, ID: ${user.id}`);
        return sanitizeUser(user);
      } catch (error) {
        logger.error(`(tRPC) Error creating user with email ${email}:`, error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create user',
          cause: error instanceof Error ? error : undefined,
        });
      }
    }),

  // Update an existing user
  update: publicProcedure
    .input(idSchema.merge(z.object({ data: userUpdateSchema }))) // Merge ID with update data
    .mutation(async ({ input }) => {
      const { id, data } = input;
      const { email } = data;
      logger.info(`(tRPC) Request to update user with ID: ${id}`);

      if (Object.keys(data).length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No update data provided.',
        });
      }
      
      try {
        // Check if user exists
        const userExists = await db.select({id: users.id}).from(users).where(eq(users.id, id)).limit(1);
        if (userExists.length === 0) {
          logger.info(`(tRPC) Attempted to update non-existent user with ID: ${id}`);
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        // If email is being updated, check if the new email already exists for another user
        if (email) {
            const existingUserWithNewEmail = await db.select()
                .from(users)
                .where(eq(users.email, email))
                .limit(1);
            if (existingUserWithNewEmail.length > 0 && existingUserWithNewEmail[0].id !== id) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: 'Another user with this email already exists.',
                });
            }
        }

        const updateData: Partial<Pick<User, 'email' | 'updatedAt'>> = {};
        if (email !== undefined) updateData.email = email;
        updateData.updatedAt = new Date(); // Drizzle's $defaultFn for updatedAt only works on insert

        const updatedUsers = await db.update(users)
          .set(updateData)
          .where(eq(users.id, id))
          .returning();

        if (updatedUsers.length === 0) {
            logger.error(`(tRPC) Failed to update user with ID: ${id}, update returned empty.`);
             throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to update user due to database error.',
            });
        }
        const updatedUser = updatedUsers[0];
        logger.info(`(tRPC) Updated user with ID: ${id}`);
        return sanitizeUser(updatedUser);
      } catch (error) {
        logger.error(`(tRPC) Error updating user with ID ${id}:`, error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update user',
          cause: error instanceof Error ? error : undefined,
        });
      }
    }),

  // Delete a user
  delete: publicProcedure
    .input(idSchema)
    .mutation(async ({ input }) => {
      const { id } = input;
      logger.info(`(tRPC) Request to delete user with ID: ${id}`);
      try {
        const deletedUsers = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
        if (deletedUsers.length === 0) {
          logger.info(`(tRPC) Attempted to delete non-existent user with ID: ${id}`);
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }
        logger.info(`(tRPC) Deleted user with ID: ${id}`);
        return { message: 'User deleted successfully', id };
      } catch (error) {
        logger.error(`(tRPC) Error deleting user with ID ${id}:`, error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete user',
          cause: error instanceof Error ? error : undefined,
        });
      }
    }),
});

export type UsersRouter = typeof usersRouter;
