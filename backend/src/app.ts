import express from 'express';
import serviceRoutes from './routes/serviceRoutes';
import userRoutes from './routes/usersRoutes';
import authRoutes from './routes/authRoutes';
import { errorHandler } from './middlewares/errorHandler';
import { corsMiddleware } from './middlewares/cors';
import dnsRoutes from './routes/dnsRoutes';
import trpcRouter from './trpc/trpcRouter';

const app = express();

// Middlewares
app.use(corsMiddleware); // Use our custom CORS configuration
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dns', dnsRoutes);

// tRPC Router
app.use('/api', trpcRouter);

// Error handling
app.use(errorHandler);

export default app;
