import type { Request, Response, NextFunction } from 'express';
import { hasAdminUser, createAdminUser } from '../lib/adminInit';
import logger from '../lib/logger';
import { z } from 'zod';

// Validation schema for admin setup
const adminSetupSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
});

/**
 * Check if admin setup is required
 */
export async function checkAdminSetup(req: Request, res: Response, next: NextFunction) {
  try {
    const adminExists = await hasAdminUser();
    
    res.status(200).json({ 
      setupRequired: !adminExists,
      message: adminExists ? 'Admin user already exists' : 'Admin setup required'
    });
  } catch (error) {
    logger.error('Error checking admin setup:', error);
    res.status(500).json({ message: 'Failed to check admin setup' });
  }
}

/**
 * Create the first admin user via web interface
 */
export async function setupAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    // First check if admin already exists
    const adminExists = await hasAdminUser();
    if (adminExists) {
      return res.status(409).json({ message: 'Admin user already exists' });
    }

    // Validate request body
    const validation = adminSetupSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Invalid input',
        errors: validation.error.errors
      });
    }

    const { email, password } = validation.data;

    // Create admin user
    await createAdminUser(email, password);

    logger.info(`First admin user created successfully: ${email}`);
    
    res.status(201).json({ 
      message: 'Admin user created successfully',
      email: email
    });
  } catch (error) {
    logger.error('Error setting up admin:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({ message: error.message });
      }
    }
    
    res.status(500).json({ message: 'Failed to create admin user' });
  }
} 