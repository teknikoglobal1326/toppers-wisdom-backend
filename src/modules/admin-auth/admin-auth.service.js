// const adminAuthRepository = require('./admin-auth.repository')
// const { signAdminAccessToken, signAdminRefreshToken, verifyAdminRefreshToken } = require('../../lib/adminJwt')
// const AppError = require('../../core/AppError')
// const redis    = require('../../config/redis')
// const { createLogger } = require('../../config/logger')

// const logger = createLogger('admin-auth:service')

// const login = async (email, password) => {
//   logger.info({ email }, 'Admin login attempt')

//   const admin = await adminAuthRepository.findByEmail(email)
//   if (!admin || !admin.isActive) {
//     throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED')
//   }

//   const isMatch = await admin.comparePassword(password)
//   if (!isMatch) {
//     throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED')
//   }

//   await admin.updateOne({ lastLoginAt: new Date() })

//   const payload      = { _id: admin._id, email: admin.email, role: admin.role }
//   const accessToken  = signAdminAccessToken(payload)
//   const refreshToken = signAdminRefreshToken({ _id: admin._id })

//   logger.info({ adminId: admin._id, role: admin.role }, 'Admin logged in')

//   const adminObj = admin.toObject()
//   delete adminObj.password
//   return { accessToken, refreshToken, admin: adminObj }
// }

// const refreshToken = async (token) => {
//   const payload = verifyAdminRefreshToken(token)
//   const admin   = await adminAuthRepository.findByIdOrFail(payload._id, 'Admin not found')
//   if (!admin.isActive) throw new AppError('Admin account deactivated', 401, 'UNAUTHORIZED')
//   const accessToken = signAdminAccessToken({ _id: admin._id, email: admin.email, role: admin.role })
//   logger.info({ adminId: admin._id }, 'Admin token refreshed')
//   return { accessToken }
// }

// const logout = async (token) => {
//   const decoded = require('jsonwebtoken').decode(token)
//   if (decoded?.exp) {
//     const ttl = decoded.exp - Math.floor(Date.now() / 1000)
//     if (ttl > 0) await redis.set(`blacklist:${token}`, '1', 'EX', ttl)
//   }
//   logger.info({ adminId: decoded?._id }, 'Admin logged out')
// }

// module.exports = { login, refreshToken, logout }
const crypto = require('crypto')
const adminAuthRepository = require('./admin-auth.repository')
const { signAdminAccessToken, signAdminRefreshToken, verifyAdminRefreshToken } = require('../../lib/adminJwt')
const AppError = require('../../core/AppError')
const redis = require('../../config/redis')
const config = require('../../config/env')
const Member = require('../../models/Member.model')
const { createLogger } = require('../../config/logger')

const logger = createLogger('admin-auth:service')

const login = async (email, password) => {
  logger.info({ email }, 'Admin login attempt')

  const admin = await adminAuthRepository.findByEmail(email)
  if (!admin || !admin.isActive) {
    throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED')
  }

  const isMatch = await admin.comparePassword(password)
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED')
  }

  await admin.updateOne({ lastLoginAt: new Date() })

  const payload = { _id: admin._id, email: admin.email, role: admin.role }
  const accessToken = signAdminAccessToken(payload)
  const refreshToken = signAdminRefreshToken({ _id: admin._id })

  logger.info({ adminId: admin._id, role: admin.role }, 'Admin logged in')

  const adminObj = admin.toObject()
  delete adminObj.password
  return { accessToken, refreshToken, admin: adminObj }
}

const memberLogin = async (email, password) => {
  logger.info({ email }, 'Member login attempt')

  const member = await Member.findOne({ email, isDeleted: false }).select('+password').populate({
    path: 'role',
    match: { isDeleted: false, isActive: true },
    select: 'name permissions',
  })

  if (!member || !member.isActive || !member.role) {
    throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED')
  }

  const isMatch = await member.comparePassword(password)
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED')
  }

  const payload = { _id: member._id, email: member.email, accountType: 'member' }
  const accessToken = signAdminAccessToken(payload)
  const refreshToken = signAdminRefreshToken({ _id: member._id, accountType: 'member' })

  logger.info({ memberId: member._id, roleId: member.role?._id }, 'Member logged in')

  const memberObj = member.toObject()
  delete memberObj.password
  return { accessToken, refreshToken, member: memberObj }
}

const refreshToken = async (token) => {
  const payload = verifyAdminRefreshToken(token)

  if (payload.accountType === 'member') {
    const member = await Member.findById(payload._id).populate({
      path: 'role',
      match: { isDeleted: false, isActive: true },
      select: '_id',
    })

    if (!member || !member.isActive || member.isDeleted || !member.role) {
      throw new AppError('Member account deactivated', 401, 'UNAUTHORIZED')
    }

    const accessToken = signAdminAccessToken({ _id: member._id, email: member.email, accountType: 'member' })
    logger.info({ memberId: member._id }, 'Member token refreshed')
    return { accessToken }
  }

  const admin = await adminAuthRepository.findByIdOrFail(payload._id, 'Admin not found')
  if (!admin.isActive) throw new AppError('Admin account deactivated', 401, 'UNAUTHORIZED')
  const accessToken = signAdminAccessToken({ _id: admin._id, email: admin.email, role: admin.role })
  logger.info({ adminId: admin._id }, 'Admin token refreshed')
  return { accessToken }
}

const logout = async (token) => {
  const decoded = require('jsonwebtoken').decode(token)
  if (decoded?.exp) {
    const ttl = decoded.exp - Math.floor(Date.now() / 1000)
    if (ttl > 0) await redis.set(`blacklist:${token}`, '1', 'EX', ttl)
  }
  logger.info({ adminId: decoded?._id }, 'Admin logged out')
}

const changePassword = async (admin, currentPassword, newPassword) => {
  const isMatch = await admin.comparePassword(currentPassword)
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 400, 'INVALID_PASSWORD')
  }
  admin.password = newPassword
  await admin.save()
  logger.info({ adminId: admin._id }, 'Admin password changed')
}

const RESET_TTL = 15 * 60 // 15 minutes

const forgotPassword = async (email) => {
  const admin = await adminAuthRepository.findByEmail(email)
  if (!admin || !admin.isActive) {
    // Return generic message to avoid email enumeration
    logger.warn({ email }, 'Forgot password requested for unknown/inactive admin')
    return { message: 'If that email exists, a reset token has been generated.' }
  }

  const token = crypto.randomBytes(32).toString('hex')
  await redis.set(`admin_reset:${token}`, admin._id.toString(), 'EX', RESET_TTL)
  logger.info({ adminId: admin._id }, 'Admin password reset token generated')

  // In production: send token via email here
  if (config.NODE_ENV !== 'production') {
    return { message: 'Reset token generated.', token }
  }
  return { message: 'If that email exists, a reset token has been generated.' }
}

const resetPassword = async (token, newPassword) => {
  const adminId = await redis.get(`admin_reset:${token}`)
  if (!adminId) {
    throw new AppError('Reset token is invalid or has expired', 400, 'INVALID_RESET_TOKEN')
  }

  const admin = await adminAuthRepository.findByIdOrFail(adminId, 'Admin not found')
  admin.password = newPassword
  await admin.save()
  await redis.del(`admin_reset:${token}`)
  logger.info({ adminId: admin._id }, 'Admin password reset successfully')
}

module.exports = { login, memberLogin, refreshToken, logout, changePassword, forgotPassword, resetPassword }
