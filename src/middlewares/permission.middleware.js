const AppError = require('../core/AppError')
const { createLogger } = require('../config/logger')

const logger = createLogger('middleware:permission')

const METHOD_ACTION_MAP = {
  GET: 'read',
  HEAD: 'read',
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
}

const requirePermission = (module) => (req, _res, next) => {
  if (!req.admin && !req.member) {
    return next(new AppError('Admin authentication required', 401, 'UNAUTHORIZED'))
  }

  if (req.admin) {
    if (req.admin.hasPermission(module)) return next()

    logger.warn({ adminId: req.admin._id, role: req.admin.role, module }, 'Permission denied')
    return next(new AppError('you dont have permission', 403, 'FORBIDDEN'))
  }

  const rolePermissions = Array.isArray(req.member.role?.permissions) ? req.member.role.permissions : []
  const requiredAction = METHOD_ACTION_MAP[req.method] || 'read'
  const hasMemberPermission = rolePermissions.some((perm) => {
    if (!perm) return false
    const key = typeof perm.key === 'string' ? perm.key : ''
    const permModule = typeof perm.module === 'string' ? perm.module : ''
    const permAction = typeof perm.action === 'string' ? perm.action.toLowerCase() : ''

    if (key === module) return true
    if (key === `${module}:${requiredAction}`) return true

    return permModule === module && permAction === requiredAction
  })

  if (!hasMemberPermission) {
    logger.warn({ memberId: req.member._id, roleId: req.member.role?._id, module, action: requiredAction }, 'Permission denied')
    return next(new AppError('you dont have permission', 403, 'FORBIDDEN'))
  }

  next()
}

module.exports = { requirePermission }