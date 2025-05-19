import winston from 'winston';
import path from 'path';
import fs from 'fs';
import config from '../config/config';

// Define log directory
const logDir = 'logs';

// Create logs directory if it doesn't exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? `\n${info.stack}` : ''}`
  )
);

// Create transport instances
const transports: winston.transport[] = [
  // Always log to console
  new winston.transports.Console({
    format: consoleFormat,
  })
];

// In production, also log to files
if (config.nodeEnv === 'production') {
  transports.push(
    // Log error and above to error.log
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Log all levels to combined.log
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create the logger instance
const logger = winston.createLogger({
  level: config.logLevel,
  defaultMeta: { service: 'api-server' },
  transports,
  exitOnError: false,
});

export default logger; 