const { Worker } = require('bullmq')
const redis  = require('../../config/redis')
const admin  = require('firebase-admin')
const User   = require('../../models/User.model')
const Notification = require('../../models/Notification.model')
const config = require('../../config/env')
const { createLogger } = require('../../config/logger')
const fs = require('fs')
const path = require('path')

const logger = createLogger('jobs:notification')

let fcmEnabled = false
if (config.FCM_SERVICE_ACCOUNT_JSON) {
  try {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(config.FCM_SERVICE_ACCOUNT_JSON)) })
    fcmEnabled = true
  } catch (err) {
    logger.error({ err }, 'Failed to initialize Firebase Admin with FCM_SERVICE_ACCOUNT_JSON')
  }
} else {
  // Fallback to local credential file in src/firebase/
  const credPath = path.join(__dirname, '../../firebase/toopers-wisdom-firebase-adminsdk-fbsvc-0f6f847949.json')
  if (fs.existsSync(credPath)) {
    try {
      const serviceAccount = require(credPath)
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
      fcmEnabled = true
      logger.info('Firebase Admin initialized with local service account credentials')
    } catch (err) {
      logger.error({ err }, 'Failed to initialize Firebase Admin with local credentials file')
    }
  } else {
    logger.warn('FCM_SERVICE_ACCOUNT_JSON not set and local credentials file missing — push notifications disabled')
  }
}

new Worker('notification', async (job) => {
  const { name } = job
  let { userId, subExamId, all, title, body, data } = job.data
  logger.info({ jobId: job.id, name, title }, 'Notification job started')

  if (name === 'payment-success') {
    title = 'Course Purchased!'
    body = 'Congratulations! Your payment for the course was successful.'
    data = { ...data, type: 'payment_success', orderId: job.data.orderId ? String(job.data.orderId) : '' }
  } else if (name === 'signup') {
    title = 'Welcome to Toppers Wisdom!'
    body = 'Thank you for signing up. Start your learning journey today!'
    data = { ...data, type: 'signup' }
  } else if (name === 'login') {
    title = 'New Login Detected'
    body = 'You have successfully logged in to your account.'
    data = { ...data, type: 'login' }
  }

  let filter = {}
  if (!all && subExamId) filter = { 'subExam._id': subExamId }
  else if (!all && userId) filter = { _id: userId }

  const users  = await User.find(filter).select('_id fcmToken').lean()
  const tokens = users.map((u) => u.fcmToken).filter(Boolean)

  if (fcmEnabled && tokens.length) {
    const result = await admin.messaging().sendEachForMulticast({ tokens, notification: { title, body, imageUrl: 'https://topperswisdom.teknikoglobal.in/images/logo/auth-logo.png' }, data: data || {} })
    logger.info({ jobId: job.id, sent: result.successCount, failed: result.failureCount }, 'FCM sent')
  }

  if (users.length) {
    await Notification.insertMany(users.map((u) => {
      let dbType = 'system'
      const typeVal = data?.type || ''
      if (['course', 'test', 'payment', 'system'].includes(typeVal)) {
        dbType = typeVal
      } else if (typeVal === 'payment_success') {
        dbType = 'payment'
      }
      return { user: u._id, title, body, type: dbType, data }
    }))
  }
  logger.info({ jobId: job.id, count: users.length }, 'Notification job done')
}, { connection: redis })