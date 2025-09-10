import {
  BookingValidationError,
  BookingNotFoundError,
  BookingConflictError,
  BookingPermissionError,
  BookingBusinessLogicError
} from '../bookingErrors';

describe('Booking Error Classes', () => {
  it('BookingValidationError should set name and message', () => {
    const err = new BookingValidationError('msg');
    expect(err.name).toBe('BookingValidationError');
    expect(err.message).toBe('msg');
  });
  it('BookingNotFoundError should set default message and name', () => {
    const err = new BookingNotFoundError();
    expect(err.name).toBe('BookingNotFoundError');
    expect(err.message).toBe('Reserva não encontrada');
  });
  it('BookingConflictError should set name and message', () => {
    const err = new BookingConflictError('conflict');
    expect(err.name).toBe('BookingConflictError');
    expect(err.message).toBe('conflict');
  });
  it('BookingPermissionError should set default message and name', () => {
    const err = new BookingPermissionError();
    expect(err.name).toBe('BookingPermissionError');
    expect(err.message).toBe('Permissão negada');
  });
  it('BookingBusinessLogicError should set name and message', () => {
    const err = new BookingBusinessLogicError('logic');
    expect(err.name).toBe('BookingBusinessLogicError');
    expect(err.message).toBe('logic');
  });
});
