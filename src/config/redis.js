const Redis  = require('ioredis')
const config = require('./env')
const { createLogger } = require('./logger')

const logger = createLogger('redis')

const redis = new Redis(config.REDIS_URL, {
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: null,
})

redis.on('connect',      ()    => logger.info('Redis connected'))
redis.on('error',        (err) => logger.error({ err }, 'Redis error'))
redis.on('reconnecting', ()    => logger.warn('Redis reconnecting'))

module.exports = redis