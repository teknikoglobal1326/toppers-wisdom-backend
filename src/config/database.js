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

  try {
    const User = require('../models/User.model')
    // Clean up any users where phone is null or empty string to prevent unique index violation
    await User.updateMany({ phone: null }, { $unset: { phone: "" } })
    await User.updateMany({ phone: "" }, { $unset: { phone: "" } })
    
    // Drop the phone index if it exists, so Mongoose can recreate it with sparse: true
    const indexes = await User.collection.indexes()
    if (indexes.some(idx => idx.name === 'phone_1')) {
      await User.collection.dropIndex('phone_1')
      logger.info('Dropped existing phone_1 index for rebuilding')
    }
  } catch (err) {
    logger.error({ err }, 'Error migrating phone index')
  }
}

mongoose.connection.on('error',        (err) => logger.error({ err }, 'MongoDB error'))
mongoose.connection.on('disconnected', ()    => logger.warn('MongoDB disconnected'))
mongoose.connection.on('reconnected',  ()    => logger.info('MongoDB reconnected'))

module.exports = { connectDB }