import express from 'express';
import itemRoutes from './routes/itemRoutes';
import serviceRoutes from './routes/serviceRoutes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/items', itemRoutes);
app.use('/api/services', serviceRoutes);

// Error handling
app.use(errorHandler);

export default app;
