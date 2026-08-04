const mongoose = require('mongoose')
const config   = require('./env')
const { createLogger } = require('./logger')

const logger = createLogger('database')

const connectDB = async () => {
  await mongoose.connect(config.MONGODB_URI)
  logger.info('MongoDB connected')

  try {
    const Exam = require('../models/Exam.model')
    const updateResult = await Exam.updateMany(
      { $or: [ { sortOrder: 0 }, { sortOrder: { $exists: false } } ], is_deleted: false },
      { $set: { sortOrder: 9999 } }
    )
    if (updateResult.modifiedCount > 0) {
      logger.info({ modifiedCount: updateResult.modifiedCount }, 'Migrated default sortOrder of existing exams to 9999')
    }
  } catch (err) {
    logger.error({ err }, 'Error migrating sortOrder defaults')
  }
}

mongoose.connection.on('error',        (err) => logger.error({ err }, 'MongoDB error'))
mongoose.connection.on('disconnected', ()    => logger.warn('MongoDB disconnected'))
mongoose.connection.on('reconnected',  ()    => logger.info('MongoDB reconnected'))

module.exports = { connectDB }