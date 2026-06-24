const { verifyAccessToken } = require('../lib/jwt')
const AppError = require('../core/AppError')
const redis    = require('../config/redis')
const catchAsync = require('../core/catchAsync')
const { createLogger } = require('../config/logger')

const logger = createLogger('middleware:auth')

// Use catchAsync here too — eliminates try/catch in middleware
const authMiddleware = catchAsync(async (req, _res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('Authorization token required', 401, 'UNAUTHORIZED')
  }

  const token      = authHeader.split(' ')[1]
  const blacklisted = await redis.get(`blacklist:${token}`)
  if (blacklisted) {
    logger.warn({ ip: req.ip }, 'Blacklisted token used')
    throw new AppError('Token has been invalidated', 401, 'UNAUTHORIZED')
  }

  req.user  = verifyAccessToken(token)
  req.token = token
  logger.debug({ userId: req.user._id, role: req.user.role }, 'Auth passed')
  next()
})

module.exports = { authMiddleware }