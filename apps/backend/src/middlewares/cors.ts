import cors from 'cors';
import type { CorsOptions } from 'cors';

// Configure CORS options
const corsOptions: CorsOptions = {
  origin: [
    'http://localhost:5173', // Vite default dev server
    'http://localhost:4173', // Vite preview server
    'http://localhost:3000',
    // Add other allowed origins as needed
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
  optionsSuccessStatus: 204,
};

export const corsMiddleware = cors(corsOptions); 