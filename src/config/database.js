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

  try {
    const PlateFormSetting = require('../models/PlateFormSetting.model')
    const count = await PlateFormSetting.countDocuments()
    if (count === 0) {
      await PlateFormSetting.create({
        siteName: 'Toppers Wisdom',
        siteLogo: '/uploads/logo.png',
        supportEmail: 'support@topperswisdom.com',
        supportPhone: '+91-9999999999',
        supportWhatsapp: '+91-9999999999',
        officeAddress: 'New Delhi, India',
        platformFee: 0,
        gst: 0,
        appVersion: '1.0.0',
        razorpayKeyId: config.RAZORPAY_KEY_ID || '',
        razorpaySecretKey: config.RAZORPAY_KEY_SECRET || '',
        instagramUrl: 'https://instagram.com/topperswisdom',
        facebookUrl: 'https://facebook.com/topperswisdom',
        youtubeUrl: 'https://youtube.com/topperswisdom',
        telegramUrl: 'https://t.me/topperswisdom'
      })
      logger.info('Default PlateFormSetting seeded successfully')
    }
  } catch (err) {
    logger.error({ err }, 'Error seeding default PlateFormSetting')
  }
}

mongoose.connection.on('error',        (err) => logger.error({ err }, 'MongoDB error'))
mongoose.connection.on('disconnected', ()    => logger.warn('MongoDB disconnected'))
mongoose.connection.on('reconnected',  ()    => logger.info('MongoDB reconnected'))

module.exports = { connectDB }