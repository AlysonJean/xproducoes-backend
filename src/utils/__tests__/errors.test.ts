import {
  CustomError,
  BookingValidationError,
  BookingNotFoundError,
  BookingConflictError,
  BookingPermissionError,
  AuthenticationError,
  AuthorizationError,
  DuplicateError,
  ValidationError,
  NotFoundError,
  InternalServerError,
  RateLimitError,
  ServiceUnavailableError,
  isOperationalError,
  formatErrorResponse,
  ERROR_CODES
} from '../errors';

describe('CustomError hierarchy', () => {
  it('should set message, statusCode, isOperational', () => {
    class TestError extends CustomError {
      constructor() { super('msg', 418, false); }
    }
    const err = new TestError();
    expect(err.message).toBe('msg');
    expect(err.statusCode).toBe(418);
    expect(err.isOperational).toBe(false);
  });
});

describe('Specific error classes', () => {
  it('BookingValidationError', () => {
    const err = new BookingValidationError('fail');
    expect(err.name).toBe('BookingValidationError');
    expect(err.statusCode).toBe(400);
  });
  it('BookingNotFoundError', () => {
    const err = new BookingNotFoundError();
    expect(err.name).toBe('BookingNotFoundError');
    expect(err.statusCode).toBe(404);
  });
  it('BookingConflictError', () => {
    const err = new BookingConflictError('conflict');
    expect(err.name).toBe('BookingConflictError');
    expect(err.statusCode).toBe(409);
  });
  it('BookingPermissionError', () => {
    const err = new BookingPermissionError();
    expect(err.name).toBe('BookingPermissionError');
    expect(err.statusCode).toBe(403);
  });
  it('AuthenticationError', () => {
    const err = new AuthenticationError();
    expect(err.name).toBe('AuthenticationError');
    expect(err.statusCode).toBe(401);
  });
  it('AuthorizationError', () => {
    const err = new AuthorizationError();
    expect(err.name).toBe('AuthorizationError');
    expect(err.statusCode).toBe(403);
  });
  it('DuplicateError', () => {
    const err = new DuplicateError('dup');
    expect(err.name).toBe('DuplicateError');
    expect(err.statusCode).toBe(409);
  });
  it('ValidationError', () => {
    const err = new ValidationError('invalid', 'field', 123);
    expect(err.name).toBe('ValidationError');
    expect(err.statusCode).toBe(400);
    expect(err.field).toBe('field');
    expect(err.value).toBe(123);
  });
  it('NotFoundError', () => {
    const err = new NotFoundError();
    expect(err.name).toBe('NotFoundError');
    expect(err.statusCode).toBe(404);
  });
  it('InternalServerError', () => {
    const err = new InternalServerError();
    expect(err.name).toBe('InternalServerError');
    expect(err.statusCode).toBe(500);
  });
  it('RateLimitError', () => {
    const err = new RateLimitError();
    expect(err.name).toBe('RateLimitError');
    expect(err.statusCode).toBe(429);
  });
  it('ServiceUnavailableError', () => {
    const err = new ServiceUnavailableError();
    expect(err.name).toBe('ServiceUnavailableError');
    expect(err.statusCode).toBe(503);
  });
});

describe('isOperationalError', () => {
  it('should return true for CustomError', () => {
    const err = new BookingValidationError('fail');
    expect(isOperationalError(err)).toBe(true);
  });
  it('should return false for generic Error', () => {
    expect(isOperationalError(new Error('x'))).toBe(false);
  });
});

describe('formatErrorResponse', () => {
  it('should format CustomError', () => {
    const err = new BookingValidationError('fail');
    const res = formatErrorResponse(err);
    expect(res).toMatchObject({
      message: 'fail',
      statusCode: 400,
      name: 'BookingValidationError'
    });
  });
  it('should include field/value for ValidationError', () => {
    const err = new ValidationError('invalid', 'field', 123);
    const res = formatErrorResponse(err);
    expect(res.field).toBe('field');
    expect(res.value).toBe(123);
  });
  it('should fallback for generic Error', () => {
    const res = formatErrorResponse(new Error('x'));
    expect(res.statusCode).toBe(500);
    expect(res.name).toBe('InternalServerError');
  });
});

describe('ERROR_CODES', () => {
  it('should contain common error codes', () => {
    expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ERROR_CODES.BOOKING_NOT_FOUND).toBe('BOOKING_NOT_FOUND');
    expect(ERROR_CODES.INTERNAL_SERVER_ERROR).toBe('INTERNAL_SERVER_ERROR');
  });
});
