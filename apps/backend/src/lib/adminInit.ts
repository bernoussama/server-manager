import { db } from './db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import logger from './logger';
import { isDatabaseInitialized, initializeDatabase } from './dbInit';

const SALT_ROUNDS = 10;

/**
 * Check if any admin user exists in the database
 */
export async function hasAdminUser(): Promise<boolean> {
  try {
    // First check if database is initialized
    const dbInitialized = await isDatabaseInitialized();
    if (!dbInitialized) {
      return false;
    }

    const adminUsers = await db.select().from(users).where(eq(users.isAdmin, true)).limit(1);
    return adminUsers.length > 0;
  } catch (error) {
    logger.error('Error checking for admin users:', error);
    return false; // Return false instead of throwing to allow setup
  }
}

/**
 * Create the first admin user
 */
export async function createAdminUser(email: string, password: string): Promise<void> {
  try {
    // Ensure database is initialized first
    const dbInitialized = await isDatabaseInitialized();
    if (!dbInitialized) {
      await initializeDatabase();
    }

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
    // First ensure database is initialized
    const dbInitialized = await isDatabaseInitialized();
    if (!dbInitialized) {
      logger.info('Database not initialized. Initializing database...');
      await initializeDatabase();
    }

    const adminExists = await hasAdminUser();
    
    if (!adminExists) {
      logger.info('No admin user found. Admin setup required via web interface.');
      logger.info('Please visit /admin/setup to create the first admin user.');
    } else {
      logger.info('Admin user already exists');
    }
  } catch (error) {
    logger.error('Failed to initialize admin user:', error);
    // Don't throw error to allow server to start for setup
    logger.info('Server will start in setup mode. Please visit /admin/setup to initialize.');
  }
} 