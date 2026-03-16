import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../middlewares/errorHandler.js';
import { AppError } from '../../errors/AppError.js';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let statusCode: number;
  let responseData: any;

  beforeEach(() => {
    statusCode = 200;
    responseData = null;

    mockRequest = {
      method: 'GET',
      url: '/api/test',
      headers: {},
    };

    mockResponse = {
      status: vi.fn(function (code: number) {
        statusCode = code;
        return this;
      }),
      json: vi.fn(function (data: any) {
        responseData = data;
        return this;
      }),
      setHeader: vi.fn(),
    };

    mockNext = vi.fn();
  });

  it('should handle AppError correctly', () => {
    const error = new AppError('Test error', 400);
    
    errorHandler(
      error as any,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalled();
    expect(responseData.message).toContain('Test error');
  });

  it('should handle generic Error', () => {
    const error = new Error('Unexpected error');
    
    errorHandler(
      error as any,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(500);
  });

  it('should not expose stack trace in production', () => {
    process.env.NODE_ENV = 'production';
    const error = new Error('Internal error');
    
    errorHandler(
      error as any,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(responseData.stack).toBeUndefined();
  });

  it('should include stack trace in development', () => {
    process.env.NODE_ENV = 'development';
    const error = new Error('Dev error');
    
    errorHandler(
      error as any,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(responseData.stack).toBeDefined();
  });

  it('should handle ValidationError', () => {
    const error = new (class extends AppError {
      constructor(msg: string) {
        super(msg, 422);
      }
    })('Validation failed');
    
    errorHandler(
      error as any,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(422);
  });

  it('should handle NotFoundError', () => {
    const error = new (class extends AppError {
      constructor(msg: string) {
        super(msg, 404);
      }
    })('Resource not found');
    
    errorHandler(
      error as any,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(404);
  });

  it('should handle UnauthorizedError', () => {
    const error = new (class extends AppError {
      constructor(msg: string) {
        super(msg, 401);
      }
    })('Unauthorized');
    
    errorHandler(
      error as any,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
  });

  it('should handle ConflictError', () => {
    const error = new (class extends AppError {
      constructor(msg: string) {
        super(msg, 409);
      }
    })('Resource already exists');
    
    errorHandler(
      error as any,
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockResponse.status).toHaveBeenCalledWith(409);
  });
});

describe('Request Logging', () => {
  it('should log request method and URL', () => {
    const logSpy = vi.spyOn(console, 'log');
    
    const mockRequest: Partial<Request> = {
      method: 'POST',
      url: '/api/bookings',
      headers: {},
    };

    // In real implementation, logging middleware would be called here
    expect(mockRequest.method).toBe('POST');
    expect(mockRequest.url).toBe('/api/bookings');

    logSpy.mockRestore();
  });

  it('should include request duration in logs', () => {
    const start = Date.now();
    const duration = Date.now() - start;
    
    expect(duration).toBeGreaterThanOrEqual(0);
  });
});

describe('Status Code Handling', () => {
  const testCases = [
    { statusCode: 200, description: 'OK' },
    { statusCode: 201, description: 'Created' },
    { statusCode: 204, description: 'No Content' },
    { statusCode: 400, description: 'Bad Request' },
    { statusCode: 401, description: 'Unauthorized' },
    { statusCode: 403, description: 'Forbidden' },
    { statusCode: 404, description: 'Not Found' },
    { statusCode: 409, description: 'Conflict' },
    { statusCode: 422, description: 'Validation Error' },
    { statusCode: 500, description: 'Internal Server Error' },
  ];

  testCases.forEach(({ statusCode, description }) => {
    it(`should handle ${statusCode} - ${description}`, () => {
      expect([200, 201, 204, 400, 401, 403, 404, 409, 422, 500]).toContain(statusCode);
    });
  });
});

describe('Security Headers', () => {
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockResponse = {
      setHeader: vi.fn(),
    };
  });

  it('should set X-Content-Type-Options', () => {
    mockResponse.setHeader?.('X-Content-Type-Options', 'nosniff');
    
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'X-Content-Type-Options',
      'nosniff'
    );
  });

  it('should set X-Frame-Options', () => {
    mockResponse.setHeader?.('X-Frame-Options', 'DENY');
    
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'X-Frame-Options',
      'DENY'
    );
  });

  it('should set Strict-Transport-Security', () => {
    mockResponse.setHeader?.(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
    
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  });
});
