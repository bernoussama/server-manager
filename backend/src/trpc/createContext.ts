import { type Context } from '@ts-node-express/api';
import { type AuthRequest } from '../middlewares/authMiddleware';

export function createContext({ req }: { req: AuthRequest }): Context {
  return {
    user: req.user,
  };
} 