/**
 * Error Handling Middleware
 * Centralized error handling for the VTMS API
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
  details?: any;
}

/**
 * Custom error class for application errors
 */
export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;
  public code: string;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.name = 'CustomError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error class
 */
export class ValidationError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends CustomError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND', true);
    this.name = 'NotFoundError';
  }
}

/**
 * Unauthorized error class
 */
export class UnauthorizedError extends CustomError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED', true);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden error class
 */
export class ForbiddenError extends CustomError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN', true);
    this.name = 'ForbiddenError';
  }
}

/**
 * Database error class
 */
export class DatabaseError extends CustomError {
  constructor(message: string = 'Database operation failed', details?: any) {
    super(message, 500, 'DATABASE_ERROR', true, details);
    this.name = 'DatabaseError';
  }
}

/**
 * External service error class
 */
export class ExternalServiceError extends CustomError {
  constructor(service: string, message: string = 'External service error', details?: any) {
    super(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', true, details);
    this.name = 'ExternalServiceError';
  }
}

/**
 * Main error handler middleware
 */
export function errorHandler(
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error
  logError(error, req);

  // Default error values
  let statusCode = error.statusCode || 500;
  let errorCode = error.code || 'INTERNAL_ERROR';
  let message = error.message || 'Internal server error';
  let details = error.details;

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
  } else if (error.name === 'CastError') {
    // Mongoose/Sequelize cast error
    statusCode = 400;
    errorCode = 'INVALID_ID';
    message = 'Invalid ID format';
  } else if (error.name === 'MongoError' || error.name === 'PostgresError') {
    // Database errors
    statusCode = 500;
    errorCode = 'DATABASE_ERROR';
    message = 'Database operation failed';
  } else if (error.name === 'JsonWebTokenError') {
    // JWT errors
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token expired';
  } else if (error.name === 'SyntaxError' && (error as any).type === 'entity.parse.failed') {
    // JSON parsing error
    statusCode = 400;
    errorCode = 'INVALID_JSON';
    message = 'Invalid JSON in request body';
  }

  // Create error response
  const errorResponse: ApiResponse<null> = {
    success: false,
    error: message,
    timestamp: new Date(),
    requestId: generateRequestId(req)
  };

  // Include error code in development
  if (process.env.NODE_ENV === 'development') {
    (errorResponse as any).code = errorCode;
    (errorResponse as any).stack = error.stack;
    if (details) {
      (errorResponse as any).details = details;
    }
  } else if (process.env.NODE_ENV === 'production') {
    // Include minimal error info in production
    (errorResponse as any).code = errorCode;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = new NotFoundError(`Route ${req.originalUrl}`);
  next(error);
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validation middleware
 */
export function validateRequest(schema: any) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      const details = error.details.map((detail: any) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      next(new ValidationError('Request validation failed', details));
    } else {
      next();
    }
  };
}

/**
 * Rate limiting middleware (basic implementation)
 */
export function rateLimiter(options: { windowMs: number; max: number }) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowMs = options.windowMs;
    
    let requestData = requests.get(key);
    
    if (!requestData || now > requestData.resetTime) {
      requestData = { count: 1, resetTime: now + windowMs };
      requests.set(key, requestData);
    } else {
      requestData.count++;
    }

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': options.max.toString(),
      'X-RateLimit-Remaining': Math.max(0, options.max - requestData.count).toString(),
      'X-RateLimit-Reset': new Date(requestData.resetTime).toISOString()
    });

    if (requestData.count > options.max) {
      next(new CustomError(
        'Too many requests',
        429,
        'RATE_LIMIT_EXCEEDED',
        true,
        { retryAfter: Math.ceil((requestData.resetTime - now) / 1000) }
      ));
    } else {
      next();
    }
  };
}

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };
    
    if (res.statusCode >= 400) {
      console.error('Request Error:', logData);
    } else {
      console.log('Request:', logData);
    }
  });
  
  next();
}

/**
 * Log error details
 */
function logError(error: AppError, req: Request): void {
  const logData = {
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      query: req.query,
      params: req.params,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    },
    timestamp: new Date().toISOString()
  };

  console.error('Application Error:', JSON.stringify(logData, null, 2));
}

/**
 * Generate request ID
 */
function generateRequestId(req: Request): string {
  return req.headers['x-request-id'] as string || 
         `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Handle uncaught exceptions
 */
export function handleUncaughtExceptions(): void {
  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

/**
 * Graceful shutdown handler
 */
export function gracefulShutdown(server: any): void {
  const shutdown = (signal: string) => {
    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
    
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}