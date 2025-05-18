import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from '@ts-node-express/api';
import { type Request, type Response, Router } from 'express';
import { createContext } from './createContext';
import { type AuthRequest } from '../middlewares/authMiddleware';

// Create router for tRPC endpoint
const trpcRouter = Router();

// Add tRPC API handler
trpcRouter.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req }) => createContext({ req: req as AuthRequest }),
  })
);

export default trpcRouter; 