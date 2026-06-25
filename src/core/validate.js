/**
 * Joi validation middleware factory.
 * Usage: router.post('/route', validate(joiSchema), controller.fn)
 *
 * Validates req.body, strips unknown fields, returns 400 on failure.
 * All validation errors are joined into one readable message.
 */
const AppError = require('./AppError')
const { createLogger } = require('../config/logger')

const logger = createLogger('middleware:validate')

const validate = (schema) => (req, _res, next) => {
  console.log("req.body", req.body);
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,    // collect ALL errors, not just the first
    stripUnknown: true,   // remove fields not in schema
    convert: true,        // auto-convert types (string "true" → boolean true)
  })

  if (error) {
    const messages = error.details.map((d) => d.message).join(', ')
    logger.warn({ path: req.path, errors: messages }, 'Validation failed')
    return next(new AppError(messages, 400, 'VALIDATION_ERROR'))
  }

  req.body = value  // replace with cleaned, converted data
  next()
}

/**
 * Validate query params instead of body.
 * Usage: router.get('/route', validateQuery(schema), controller.fn)
 */
const validateQuery = (schema) => (req, _res, next) => {
  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  })

  if (error) {
    const messages = error.details.map((d) => d.message).join(', ')
    return next(new AppError(messages, 400, 'VALIDATION_ERROR'))
  }

  req.query = value
  next()
}

module.exports = { validate, validateQuery }