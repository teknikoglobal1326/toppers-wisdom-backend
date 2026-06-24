const AppError = require('../core/AppError')
const { createLogger } = require('../config/logger')

const logger = createLogger('middleware:admin')

const adminMiddleware = (req, _res, next) => {
  if (req.user?.role !== 'admin') {
    logger.warn({ userId: req.user?._id, path: req.path }, 'Admin access denied')
    return next(new AppError('Admin access required', 403, 'FORBIDDEN'))
  }
  logger.debug({ userId: req.user._id }, 'Admin access granted')
  next()
}

module.exports = { adminMiddleware }