const jwt    = require('jsonwebtoken')
const config = require('../config/env')
const AppError = require('../core/AppError')

const signAdminAccessToken  = (payload) => jwt.sign(payload, config.JWT_ADMIN_SECRET, { expiresIn: '8h' })
const signAdminRefreshToken = (payload) => jwt.sign(payload, config.JWT_ADMIN_SECRET, { expiresIn: '7d' })

const verifyAdminAccessToken = (token) => {
  try { return jwt.verify(token, config.JWT_ADMIN_SECRET) }
  catch { throw new AppError('Invalid or expired admin token', 401, 'UNAUTHORIZED') }
}

const verifyAdminRefreshToken = (token) => {
  try { return jwt.verify(token, config.JWT_ADMIN_SECRET) }
  catch { throw new AppError('Invalid or expired admin refresh token', 401, 'UNAUTHORIZED') }
}

module.exports = { signAdminAccessToken, signAdminRefreshToken, verifyAdminAccessToken, verifyAdminRefreshToken }