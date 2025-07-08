import cors from 'cors';
import type { CorsOptions } from 'cors';

// Configure CORS options
const corsOptions: CorsOptions = {
  origin: true, // Allow all origins for now
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
  optionsSuccessStatus: 204,
};

export const corsMiddleware = cors(corsOptions); 