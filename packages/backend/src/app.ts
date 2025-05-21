import express from 'express';
import serviceRoutes from './routes/serviceRoutes';
import userRoutes from './routes/usersRoutes';
import authRoutes from './routes/authRoutes';
import { errorHandler } from './middlewares/errorHandler';
import { corsMiddleware } from './middlewares/cors';
import morganMiddleware from './middlewares/morgan';
import dnsRoutes from './routes/dnsRoutes';
import httpRoutes from './routes/httpRoutes'; // Add this
import systemMetricsRoutes from './routes/systemMetricsRoutes';
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dns', dnsRoutes);
app.use('/api/http', httpRoutes); // Add this
app.use('/api/system-metrics', systemMetricsRoutes);

// Error handling
app.use(errorHandler);

export default app;
