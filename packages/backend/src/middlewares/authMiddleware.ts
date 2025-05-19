import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../lib/db';
import { users } from '../models/user';
import { eq } from 'drizzle-orm';
import { AuthUser } from '@server-manager/shared';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export async function protect(req: AuthRequest, res: Response, next: NextFunction) {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };

      // Attach user to request object
      const userResult = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, decoded.userId)).limit(1);
      if (userResult.length > 0) {
        req.user = userResult[0];
        next();
      } else {
        res.status(401).json({ message: 'Not authorized, user not found' });
      }
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
} 