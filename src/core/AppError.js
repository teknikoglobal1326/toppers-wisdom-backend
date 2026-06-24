/**
 * Custom operational error class.
 * Throw this anywhere in services/repositories for known failures.
 * The global error handler catches it and sends the right HTTP response.
 *
 * Usage:
 *   throw new AppError('Course not found', 404)
 *   throw new AppError('Invalid OTP', 400, 'INVALID_OTP')
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message)
    this.statusCode  = statusCode
    this.code        = code
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}

module.exports = AppError