import type { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../lib/db'; // Corrected import path
import { users, type NewUser } from '../models/user';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Store this in .env!
const SALT_ROUNDS = 10;

export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser: NewUser = { email, passwordHash };

    const insertedUser = await db.insert(users).values(newUser).returning();

    // Don't send passwordHash back
const userResponse = { id: insertedUser[0].id, email: insertedUser[0].email };


    res.status(201).json({ message: 'User created successfully', user: userResponse });
  } catch (error) {
    next(error);
  }
};

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body; // Corrected: removed trailing underscore

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const userArray = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (userArray.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const user = userArray[0];

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '1h', // Token expires in 1 hour
    });

    // Don't send passwordHash back
    const userResponse = { ...user };
    delete (userResponse as any).passwordHash;

    res.status(200).json({ message: 'Login successful', token, user: userResponse });
  } catch (error) {
    next(error);
  }
}; 