import { db } from './db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import logger from './logger';

const SALT_ROUNDS = 10;

/**
 * Check if any admin user exists in the database
 */
export async function hasAdminUser(): Promise<boolean> {
  try {
    const adminUsers = await db.select().from(users).where(eq(users.isAdmin, true)).limit(1);
    return adminUsers.length > 0;
  } catch (error) {
    logger.error('Error checking for admin users:', error);
    throw new Error('Failed to check admin users');
  }
}

/**
 * Create the first admin user
 */
export async function createAdminUser(email: string, password: string): Promise<void> {
  try {
    // Check if user with this email already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      throw new Error('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    await db.insert(users).values({
      email,
      passwordHash,
      isAdmin: true,
    });

    logger.info(`Admin user created successfully with email: ${email}`);
  } catch (error) {
    logger.error('Error creating admin user:', error);
    throw error;
  }
}

/**
 * Initialize admin user if none exists
 * This should be called during server startup
 */
export async function initializeAdmin(): Promise<void> {
  try {
    const adminExists = await hasAdminUser();
    
    if (!adminExists) {
      logger.info('No admin user found. Admin setup required via web interface.');
      logger.info('Please visit /admin/setup to create the first admin user.');
    } else {
      logger.info('Admin user already exists');
    }
  } catch (error) {
    logger.error('Failed to initialize admin user:', error);
    throw error;
  }
} 