import express from 'express';
import serviceRoutes from './routes/serviceRoutes';
import userRoutes from './routes/usersRoutes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/services', serviceRoutes);
app.use('/api/users', userRoutes);

// Error handling
app.use(errorHandler);

export default app;
