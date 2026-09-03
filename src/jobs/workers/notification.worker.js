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
  logger.info({ jobId: job.id, name }, 'Notification job started')

  if (name === 'notification-campaign-broadcast') {
    const { campaignId } = job.data
    const NotificationCampaign = require('../../models/NotificationCampaign.model')
    const campaign = await NotificationCampaign.findOne({ _id: campaignId, isDeleted: false })
    if (!campaign) {
      logger.warn({ campaignId }, 'Notification campaign not found or deleted')
      return
    }

    const { title, message, image, notificationType } = campaign
    const batchSize = 500
    let skip = 0
    let hasMore = true
    let totalSent = 0

    while (hasMore) {
      const batchUsers = await User.find({ fcmToken: { $ne: null, $exists: true }, isDeleted: false })
        .select('_id fcmToken')
        .skip(skip)
        .limit(batchSize)
        .lean()

      if (batchUsers.length === 0) {
        hasMore = false
        break
      }

      const tokens = batchUsers.map((u) => u.fcmToken).filter(Boolean)
      if (fcmEnabled && tokens.length) {
        try {
          const result = await admin.messaging().sendEachForMulticast({
            tokens,
            notification: {
              title,
              body: message,
              imageUrl: image || undefined
            },
            data: {
              type: notificationType || 'marketing',
              campaignId: String(campaignId)
            }
          })
          logger.info({ jobId: job.id, sent: result.successCount, failed: result.failureCount }, 'FCM notification campaign batch sent')
        } catch (err) {
          logger.error({ err }, 'FCM notification campaign batch send failed')
        }
      }

      const notificationDocs = batchUsers.map((u) => ({
        user: u._id,
        title,
        body: message,
        type: 'system',
        data: {
          type: notificationType || 'marketing',
          campaignId: String(campaignId)
        }
      }))

      if (notificationDocs.length) {
        try {
          await Notification.insertMany(notificationDocs)
        } catch (err) {
          logger.error({ err }, 'In-app notification campaign batch insert failed')
        }
      }

      totalSent += batchUsers.length
      skip += batchSize
    }

    campaign.isProcessed = true
    await campaign.save()
    logger.info({ jobId: job.id, totalSent }, 'Notification campaign broadcast done')
    return
  }

  if (name === 'announcement-campaign-broadcast') {
    const { announcementId } = job.data
    const Announcement = require('../../models/Announcement.model')
    const announcement = await Announcement.findOne({ _id: announcementId, isDeleted: false })
    if (!announcement) {
      logger.warn({ announcementId }, 'Announcement not found or deleted')
      return
    }

    const title = announcement.title
    const firstBlockText = announcement.announcementBlocks?.[0]?.text || 'New announcement published'
    const pushBody = firstBlockText.length > 100 ? firstBlockText.substring(0, 100) + '...' : firstBlockText

    const batchSize = 500
    let skip = 0
    let hasMore = true
    let totalSent = 0

    while (hasMore) {
      const batchUsers = await User.find({ 
        fcmToken: { $ne: null, $exists: true }, 
        isDeleted: false 
      })
        .select('_id fcmToken')
        .skip(skip)
        .limit(batchSize)
        .lean()

      if (batchUsers.length === 0) {
        hasMore = false
        break
      }

      const tokens = batchUsers.map((u) => u.fcmToken).filter(Boolean)
      if (fcmEnabled && tokens.length) {
        try {
          const result = await admin.messaging().sendEachForMulticast({
            tokens,
            notification: {
              title,
              body: pushBody,
              imageUrl: announcement.image || undefined
            },
            data: {
              type: 'announcement',
              announcementId: String(announcementId)
            }
          })
          
          result.responses.forEach((resp, index) => {
            if (resp.success) {
              logger.info(`Success: User ${batchUsers[index]._id} received push.`);
            } else {
              logger.error(`Failed: User ${batchUsers[index]._id} failed. Reason: ${resp.error}`);
            }
          });
          
          logger.info({ jobId: job.id, sent: result.successCount, failed: result.failureCount }, 'FCM announcement campaign batch sent')
        } catch (err) {
          logger.error({ err }, 'FCM announcement campaign batch send failed')
        }
      }

      const notificationDocs = batchUsers.map((u) => ({
        user: u._id,
        title,
        body: pushBody,
        type: 'system',
        data: {
          type: 'announcement',
          announcementId: String(announcementId)
        }
      }))

      if (notificationDocs.length) {
        try {
          await Notification.insertMany(notificationDocs)
        } catch (err) {
          logger.error({ err }, 'In-app notification announcement batch insert failed')
        }
      }

      totalSent += batchUsers.length
      skip += batchSize
    }

    announcement.isProcessed = true
    await announcement.save()
    logger.info({ jobId: job.id, totalSent }, 'Announcement campaign broadcast done')
    return
  }

  let { userId, subExamId, examId, all, title, body, data } = job.data

  if (name === 'payment-success') {
    title = 'Course Purchased!'
    body = 'Congratulations! Your payment for the course was successful.'
    data = { ...data, type: 'payment_success', orderId: job.data.orderId ? String(job.data.orderId) : '' }
  } else if (name === 'subscription-success') {
    title = 'Subscription Activated!'
    body = 'Congratulations! Your subscription purchase was successful.'
    data = { ...data, type: 'subscription_success', orderId: job.data.orderId ? String(job.data.orderId) : '' }
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
  if (!all && examId && subExamId) {
    filter = {
      $and: [
        { $or: [{ 'exam._id': examId }, { 'examType._id': examId }] },
        { $or: [{ 'subExam._id': subExamId }, { 'subExams._id': subExamId }] }
      ]
    }
  } else if (!all && examId) {
    filter = { $or: [{ 'exam._id': examId }, { 'examType._id': examId }] }
  } else if (!all && subExamId) {
    filter = { $or: [{ 'subExam._id': subExamId }, { 'subExams._id': subExamId }] }
  } else if (!all && userId) {
    filter = { _id: userId }
  }

  const users  = await User.find(filter).select('_id fcmToken').lean()
  const tokens = users.map((u) => u.fcmToken).filter(Boolean)

  const fcmData = {}
  if (data && typeof data === 'object') {
    for (const [key, val] of Object.entries(data)) {
      if (val !== null && val !== undefined) {
        fcmData[key] = String(val)
      }
    }
  }

  if (fcmEnabled && tokens.length) {
    const result = await admin.messaging().sendEachForMulticast({ tokens, notification: { title, body, imageUrl: 'https://topperswisdom.teknikoglobal.in/images/logo/auth-logo.png' }, data: fcmData })
    logger.info({ jobId: job.id, sent: result.successCount, failed: result.failureCount }, 'FCM sent')
  }

  if (users.length) {
    await Notification.insertMany(users.map((u) => {
      const dbType = data?.moduleType || data?.type || 'system'
      return { user: u._id, title, body, type: dbType, data: data || {} }
    }))
  }
  logger.info({ jobId: job.id, count: users.length }, 'Notification job done')
}, { connection: redis })