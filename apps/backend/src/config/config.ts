import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  logLevel: string;
  isDevelopment: boolean;
  useMockServices: boolean;
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  isDevelopment: process.env.NODE_ENV === 'development',
  // Use mock services in development or when explicitly enabled
  useMockServices: process.env.USE_MOCK_SERVICES === 'true' || process.env.NODE_ENV === 'development',
};

export default config;

