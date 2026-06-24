const { Worker } = require('bullmq')
const redis  = require('../../config/redis')
const admin  = require('firebase-admin')
const User   = require('../../models/User.model')
const Notification = require('../../models/Notification.model')
const config = require('../../config/env')
const { createLogger } = require('../../config/logger')

const logger = createLogger('jobs:notification')

const fcmEnabled = !!config.FCM_SERVICE_ACCOUNT_JSON
if (fcmEnabled && !admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(config.FCM_SERVICE_ACCOUNT_JSON)) })
} else if (!fcmEnabled) {
  logger.warn('FCM_SERVICE_ACCOUNT_JSON not set — push notifications disabled')
}

new Worker('notification', async (job) => {
  const { userId, subExamId, all, title, body, data } = job.data
  logger.info({ jobId: job.id, title }, 'Notification job started')

  let filter = {}
  if (!all && subExamId) filter = { 'subExam._id': subExamId }
  else if (!all && userId) filter = { _id: userId }

  const users  = await User.find(filter).select('_id fcmToken').lean()
  const tokens = users.map((u) => u.fcmToken).filter(Boolean)

  if (fcmEnabled && tokens.length) {
    const result = await admin.messaging().sendEachForMulticast({ tokens, notification: { title, body }, data: data || {} })
    logger.info({ jobId: job.id, sent: result.successCount, failed: result.failureCount }, 'FCM sent')
  }

  if (users.length) await Notification.insertMany(users.map((u) => ({ user: u._id, title, body, type: data?.type || 'system', data })))
  logger.info({ jobId: job.id, count: users.length }, 'Notification job done')
}, { connection: redis })