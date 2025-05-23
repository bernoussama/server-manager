import morgan, { StreamOptions } from 'morgan';
import logger from '../lib/logger';
import config from '../config/config';

// Create a stream that writes to our winston logger
const stream: StreamOptions = {
  // Use the http severity
  write: (message) => logger.http(message.trim()),
};

// Build morgan middleware based on environment
const morganMiddleware = morgan(
  // Use custom format for development, more concise for production
  config.nodeEnv === 'development'
    ? ':method :url :status :response-time ms - :res[content-length]'
    : 'combined',
  // Use our stream in both environments
  { stream }
);

export default morganMiddleware; 