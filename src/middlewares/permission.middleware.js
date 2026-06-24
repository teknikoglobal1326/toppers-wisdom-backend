const AppError = require('../core/AppError')
const { createLogger } = require('../config/logger')

const logger = createLogger('middleware:permission')

const requirePermission = (module) => (req, _res, next) => {
  if (!req.admin) {
    return next(new AppError('Admin authentication required', 401, 'UNAUTHORIZED'))
  }
  if (!req.admin.hasPermission(module)) {
    logger.warn({ adminId: req.admin._id, role: req.admin.role, module }, 'Permission denied')
    return next(new AppError(`Access to '${module}' is not permitted for your role`, 403, 'FORBIDDEN'))
  }
  next()
}

module.exports = { requirePermission }