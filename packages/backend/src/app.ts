import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers'; // Import the root tRPC router
import { errorHandler } from './middlewares/errorHandler';
import { corsMiddleware } from './middlewares/cors';
import morganMiddleware from './middlewares/morgan';
import logger from './lib/logger';

const app = express();

// Logging middleware
app.use(morganMiddleware);

// Middlewares
app.use(corsMiddleware); // Use our custom CORS configuration
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic info route to verify server is running
app.get('/api/info', (req, res) => {
  logger.info('Server info requested');
  res.json({ status: 'Server is running', timestamp: new Date() });
});

// tRPC middleware
app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    // createContext, // Optional: if you have a context function
  }),
);

// Error handling
// Note: tRPC errors are typically handled within tRPC itself, 
// but a general Express error handler can still be useful for other routes or middleware errors.
app.use(errorHandler);

export default app;
