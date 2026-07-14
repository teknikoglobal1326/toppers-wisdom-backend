const { verifyAdminAccessToken } = require('../lib/adminJwt')
const AppError   = require('../core/AppError')
const redis      = require('../config/redis')
const catchAsync = require('../core/catchAsync')
const Admin      = require('../models/Admin.model')
const Member     = require('../models/Member.model')
const { createLogger } = require('../config/logger')

const logger = createLogger('middleware:adminAuth')

const adminAuthMiddleware = catchAsync(async (req, _res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('Admin authorization token required', 401, 'UNAUTHORIZED')
  }

  const token = authHeader.split(' ')[1]
  const blacklisted = await redis.get(`blacklist:${token}`)
  if (blacklisted) {
    logger.warn({ ip: req.ip }, 'Blacklisted admin token used')
    throw new AppError('Token has been invalidated', 401, 'UNAUTHORIZED')
  }

  const payload = verifyAdminAccessToken(token)

  if (payload.accountType === 'member') {
    const member = await Member.findById(payload._id)
      .select('+password')
      .populate({ path: 'role', match: { isDeleted: false, isActive: true } })

    if (!member || !member.isActive || member.isDeleted) {
      throw new AppError('Member account not found or deactivated', 401, 'UNAUTHORIZED')
    }
    if (!member.role) {
      throw new AppError('Member role not found or deactivated', 401, 'UNAUTHORIZED')
    }

    req.member = member
    req.adminToken = token
    logger.debug({ memberId: member._id, roleId: member.role?._id }, 'Member auth passed')
    return next()
  }

  const admin = await Admin.findById(payload._id).select('+password')
  if (!admin || !admin.isActive) {
    throw new AppError('Admin account not found or deactivated', 401, 'UNAUTHORIZED')
  }

  req.admin      = admin
  req.adminToken = token
  logger.debug({ adminId: admin._id, role: admin.role }, 'Admin auth passed')
  next()
})

module.exports = { adminAuthMiddleware }
