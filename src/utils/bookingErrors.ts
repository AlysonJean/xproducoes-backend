export class BookingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingValidationError";
  }
}

export class BookingNotFoundError extends Error {
  constructor(message: string = "Reserva não encontrada") {
    super(message);
    this.name = "BookingNotFoundError";
  }
}

export class BookingConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingConflictError";
  }
}

export class BookingPermissionError extends Error {
  constructor(message: string = "Permissão negada") {
    super(message);
    this.name = "BookingPermissionError";
  }
}

export class BookingBusinessLogicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingBusinessLogicError";
  }
}
