"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingBusinessLogicError = exports.BookingPermissionError = exports.BookingConflictError = exports.BookingNotFoundError = exports.BookingValidationError = void 0;
class BookingValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "BookingValidationError";
    }
}
exports.BookingValidationError = BookingValidationError;
class BookingNotFoundError extends Error {
    constructor(message = "Reserva não encontrada") {
        super(message);
        this.name = "BookingNotFoundError";
    }
}
exports.BookingNotFoundError = BookingNotFoundError;
class BookingConflictError extends Error {
    constructor(message) {
        super(message);
        this.name = "BookingConflictError";
    }
}
exports.BookingConflictError = BookingConflictError;
class BookingPermissionError extends Error {
    constructor(message = "Permissão negada") {
        super(message);
        this.name = "BookingPermissionError";
    }
}
exports.BookingPermissionError = BookingPermissionError;
class BookingBusinessLogicError extends Error {
    constructor(message) {
        super(message);
        this.name = "BookingBusinessLogicError";
    }
}
exports.BookingBusinessLogicError = BookingBusinessLogicError;
