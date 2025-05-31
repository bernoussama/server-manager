import { migrate } from 'drizzle-orm/libsql/migrator';
import { db } from './db';
import { users } from '../db/schema';
import logger from './logger';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize the database by running migrations
 */
export async function initializeDatabase(): Promise<void> {
  try {
    logger.info('Initializing database...');
    
    // Run migrations
    const migrationsFolder = path.join(__dirname, '../../drizzle');
    await migrate(db, { migrationsFolder });
    
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Error initializing database:', error);
    throw new Error('Failed to initialize database');
  }
}

/**
 * Check if database tables exist by trying a simple query
 */
export async function isDatabaseInitialized(): Promise<boolean> {
  try {
    // Try to query the users table to see if it exists
    await db.select().from(users).limit(1);
    return true;
  } catch (error) {
    // If the query fails, the table probably doesn't exist
    return false;
  }
} 