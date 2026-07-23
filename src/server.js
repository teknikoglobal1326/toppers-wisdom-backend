const app = require('./app')
const { connectDB } = require('./config/database')
const redis = require('./config/redis')
const config = require('./config/env')
const { rootLogger } = require('./config/logger')

// Register all job workers
require('./jobs/workers/rank.worker')
require('./jobs/workers/notification.worker')
require('./jobs/workers/email.worker')

require('dns').setServers(['8.8.8.8'])

const start = async () => {
  await connectDB()

  const server = app.listen(config.PORT, () => {
    rootLogger.info({ port: config.PORT, env: config.NODE_ENV }, 'Server started')
  })

  // Initialize socket.io
  const { initSocket } = require('./config/socket')
  initSocket(server)

  const shutdown = async (signal) => {
    rootLogger.info({ signal }, 'Shutting down')
    server.close(async () => {
      await redis.quit()
      await require('mongoose').connection.close()
      rootLogger.info('Graceful shutdown complete')
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('uncaughtException', (err) => { rootLogger.fatal({ err }, 'Uncaught exception'); process.exit(1) })
  process.on('unhandledRejection', (err) => { rootLogger.fatal({ err }, 'Unhandled rejection'); process.exit(1) })
}

start().catch((err) => { rootLogger.fatal(err, 'Startup failed'); process.exit(1) })