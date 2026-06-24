const mongoose = require('mongoose')
const config   = require('./env')
const { createLogger } = require('./logger')

const logger = createLogger('database')

const connectDB = async () => {
  await mongoose.connect(config.MONGODB_URI)
  logger.info('MongoDB connected')
}

mongoose.connection.on('error',        (err) => logger.error({ err }, 'MongoDB error'))
mongoose.connection.on('disconnected', ()    => logger.warn('MongoDB disconnected'))
mongoose.connection.on('reconnected',  ()    => logger.info('MongoDB reconnected'))

module.exports = { connectDB }