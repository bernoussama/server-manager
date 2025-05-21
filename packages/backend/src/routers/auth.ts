import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../lib/db';
import { users, NewUser } from '../models/user';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Store this in .env!
const SALT_ROUNDS = 10;

// Input schema for signup
const signupInputSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
});

// Input schema for login
const loginInputSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string(),
});

export const authRouter = router({
  signup: publicProcedure
    .input(signupInputSchema)
    .mutation(async ({ input }) => {
      const { email, password } = input;

      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingUser.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User already exists',
        });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const newUser: NewUser = { email, passwordHash };

      const insertedUsers = await db.insert(users).values(newUser).returning({
        id: users.id,
        email: users.email,
      });
      
      if (insertedUsers.length === 0 || !insertedUsers[0]) {
        throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create user',
        });
      }
      const userResponse = insertedUsers[0];

      return { message: 'User created successfully', user: userResponse };
    }),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(async ({ input }) => {
      const { email, password } = input;

      const userArray = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (userArray.length === 0) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        });
      }
      const user = userArray[0];

      if (!user.passwordHash) {
        // Should not happen if data integrity is maintained
        throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'User data incomplete',
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        });
      }

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
        expiresIn: '1h', // Token expires in 1 hour
      });
      
      // Prepare user response (omit passwordHash)
      const { passwordHash: _, ...userResponse } = user;

      return { message: 'Login successful', token, user: userResponse };
    }),
});

export type AuthRouter = typeof authRouter;
