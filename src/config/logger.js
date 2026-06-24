const pino  = require('pino')
const path  = require('path')
const config = require('./env')

const targets = [
  {
    target: config.NODE_ENV !== 'production' ? 'pino-pretty' : 'pino/file',
    options: config.NODE_ENV !== 'production'
      ? { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' }
      : { destination: 1 },
    level: 'debug',
  },
]

if (config.NODE_ENV === 'production') {
  targets.push(
    { target: 'pino/file', options: { destination: path.join(process.cwd(), 'logs', 'app.log'),   mkdir: true }, level: 'info'  },
    { target: 'pino/file', options: { destination: path.join(process.cwd(), 'logs', 'error.log'), mkdir: true }, level: 'error' }
  )
}

const rootLogger = pino({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  base: { env: config.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: { targets },
})

/**
 * Creates a child logger with a module context field.
 * Every log line will include { module: 'moduleName' }.
 *
 * Usage:
 *   const logger = createLogger('course:service')
 *   logger.info({ courseId }, 'Course fetched')
 *   // → { module: 'course:service', courseId: '...', msg: 'Course fetched' }
 */
const createLogger = (moduleName) => rootLogger.child({ module: moduleName })

module.exports = { rootLogger, createLogger }