import express from 'express';
import serviceRoutes from './routes/serviceRoutes';
import userRoutes from './routes/usersRoutes';
import authRoutes from './routes/authRoutes';
import { errorHandler } from './middlewares/errorHandler';
import { corsMiddleware } from './middlewares/cors';
import dnsRoutes from './routes/dnsRoutes';

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

// Error handling
app.use(errorHandler);

export default app;
