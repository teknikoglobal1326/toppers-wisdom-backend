/**
 * Global response helpers — used in every controller.
 * Never write res.status().json() directly. Always use these.
 *
 * Ensures every API response has the same shape:
 *   Success: { success: true,  message, data }
 *   Error:   { success: false, error: { code, message } }
 *   List:    { success: true,  message, data, pagination }
 */

const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data: data ?? null,
  })
}

const sendCreated = (res, data, message = 'Created successfully') => {
  sendSuccess(res, data, message, 201)
}

const sendPaginated = (res, data, pagination, message = 'Success') => {
  res.status(200).json({
    success: true,
    message,
    data,
    pagination,
  })
}

const sendError = (res, message = 'Something went wrong', statusCode = 500, code = 'INTERNAL_ERROR') => {
  res.status(statusCode).json({
    success: false,
    error: { code, message },
  })
}

const sendNoContent = (res) => res.status(204).send()

module.exports = { sendSuccess, sendCreated, sendPaginated, sendError, sendNoContent }