// Error Types

// Extended Error type with status code
export interface AppError extends Error {
  statusCode?: number;
} 