import { type Request, type Response, type NextFunction } from 'express';
import { db } from '../lib/db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import logger from '../lib/logger';

export interface AdminRequest extends Request {
  user?: {
    userId: number;
    email: string;
    isAdmin: boolean;
  };
}

/**
 * Middleware to check if the authenticated user is an admin
 * Should be used after authMiddleware
 */
export async function adminMiddleware(req: AdminRequest, res: Response, next: NextFunction) {
  try {
    // Check if user is authenticated (should be set by authMiddleware)
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Get user from database to check admin status
    const userArray = await db.select().from(users).where(eq(users.id, req.user.userId)).limit(1);
    
    if (userArray.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    const user = userArray[0];
    
    if (!user.isAdmin) {
      logger.warn(`Non-admin user ${user.email} attempted to access admin route`);
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Add admin status to request object
    req.user.isAdmin = true;
    
    next();
  } catch (error) {
    logger.error('Error in admin middleware:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 