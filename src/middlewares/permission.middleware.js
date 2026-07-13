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

const hasPermissionFromMixed = (permissions, module, action) => {
  if (permissions === true) return true
  if (!permissions) return false

  if (Array.isArray(permissions)) {
    return permissions.some((perm) => {
      if (perm === true) return true
      if (typeof perm === 'string') {
        return perm === module || perm === `${module}:${action}`
      }
      if (perm && typeof perm === 'object') {
        const key = typeof perm.key === 'string' ? perm.key.trim().replace(/\s+/g, '') : ''
        const permModule = typeof perm.module === 'string' ? perm.module : ''
        const permAction = typeof perm.action === 'string' ? perm.action.toLowerCase() : ''
        const allowed = perm.allowed !== false

        if (!allowed) return false
        if (key === module || key === `${module}:${action}`) return true
        if (permModule === module && (!permAction || permAction === action)) return true
      }
      return false
    })
  }

  if (typeof permissions === 'object') {
    const normalized = {}
    for (const [k, v] of Object.entries(permissions)) {
      normalized[String(k).trim().replace(/\s+/g, '')] = v
    }

    if (normalized[module] === true) return true
    if (normalized[`${module}:${action}`] === true) return true

    const moduleNode = normalized[module]
    if (moduleNode && typeof moduleNode === 'object' && moduleNode[action] === true) return true
  }

  return false
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

  const rolePermissions = req.member.role?.permissions
  const requiredAction = METHOD_ACTION_MAP[req.method] || 'read'
  const hasMemberPermission = hasPermissionFromMixed(rolePermissions, module, requiredAction)

  if (!hasMemberPermission) {
    logger.warn({ memberId: req.member._id, roleId: req.member.role?._id, module, action: requiredAction }, 'Permission denied')
    return next(new AppError('you dont have permission', 403, 'FORBIDDEN'))
  }

  next()
}

module.exports = { requirePermission }