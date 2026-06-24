/**
 * Global error handler — catches ALL errors forwarded via next(err).
 * Works with AppError (operational) and unexpected errors equally.
 * This is the ONLY place in the codebase that sends error responses.
 */
const { createLogger } = require('../config/logger')
const logger = createLogger('errorHandler')

const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500
  let message    = err.message    || 'Internal Server Error'
  let code       = err.code       || 'INTERNAL_ERROR'

  // Mongoose CastError — invalid ObjectId
  if (err.name === 'CastError') {
    statusCode = 400; message = `Invalid value for field: ${err.path}`; code = 'INVALID_ID'
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = 400
    message = Object.values(err.errors).map((e) => e.message).join(', ')
    code = 'VALIDATION_ERROR'
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field'
    statusCode = 409; message = `${field} already exists`; code = 'DUPLICATE_ERROR'
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError')  { statusCode = 401; code = 'UNAUTHORIZED' }
  if (err.name === 'TokenExpiredError')  { statusCode = 401; message = 'Token expired'; code = 'TOKEN_EXPIRED' }

  // Log appropriately
  if (statusCode >= 500) {
    logger.error({ err, method: req.method, url: req.url, userId: req.user?._id }, 'Server error')
  } else {
    logger.warn({ code, message, method: req.method, url: req.url, userId: req.user?._id }, 'Client error')
  }

  res.status(statusCode).json({
    success: false,
    error:   { code, message },
  })
}

module.exports = { errorHandler }