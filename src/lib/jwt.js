const jwt    = require('jsonwebtoken')
const config = require('../config/env')
const AppError = require('../core/AppError')

const signAccessToken  = (payload) => jwt.sign(payload, config.JWT_ACCESS_SECRET,  { expiresIn: '15m' })
const signRefreshToken = (payload) => jwt.sign(payload, config.JWT_REFRESH_SECRET, { expiresIn: '30d' })

const verifyAccessToken = (token) => {
  try { return jwt.verify(token, config.JWT_ACCESS_SECRET) }
  catch { throw new AppError('Invalid or expired token', 401, 'UNAUTHORIZED') }
}

const verifyRefreshToken = (token) => {
  try { return jwt.verify(token, config.JWT_REFRESH_SECRET) }
  catch { throw new AppError('Invalid or expired refresh token', 401, 'UNAUTHORIZED') }
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken }