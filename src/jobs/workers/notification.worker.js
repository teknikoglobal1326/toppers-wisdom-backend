const { Worker } = require('bullmq')
const admin = require('firebase-admin')
const redis = require('../../config/redis')
const { createLogger } = require('../../config/logger')
const User = require('../../models/User.model')
const Notification = require('../../models/Notification.model')

const logger = createLogger('notification:worker')

let fcmEnabled = false
try {
  const serviceAccount = require('../../../firebase-service-account.json')
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    })
  }
  fcmEnabled = true
  logger.info('Firebase Admin SDK initialized successfully')
} catch (err) {
  logger.warn({ err: err.message }, 'Firebase Admin SDK failed to initialize — push notifications disabled')
}

const worker = new Worker('notification', async (job) => {
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

    const { title, message, image, notificationType, all, examId, subExamId, courseIds, subscriptionIds } = campaign
    
    let baseFilter = { fcmToken: { $ne: null, $exists: true }, isDeleted: false }

    if (!all) {
      if (courseIds && courseIds.length > 0) {
        const Enrollment = require('../../models/Enrollment.model')
        const CourseOrder = require('../../models/CourseOrder.model')
        const [enrolledUsers, orderUsers] = await Promise.all([
          Enrollment.find({ course: { $in: courseIds } }).distinct('user'),
          CourseOrder.find({ 'items.itemId': { $in: courseIds }, status: 'paid' }).distinct('user')
        ])
        const targetUserIds = [...new Set([...enrolledUsers, ...orderUsers].map(String))]
        baseFilter._id = { $in: targetUserIds }
      } else if (subscriptionIds && subscriptionIds.length > 0) {
        const SubscriptionOrder = require('../../models/SubscriptionOrder.model')
        const UserSubscription = require('../../models/UserSubscription.model')
        const [subUsers, userSubUsers] = await Promise.all([
          SubscriptionOrder.find({ subscription: { $in: subscriptionIds }, status: 'paid' }).distinct('user'),
          UserSubscription.find({ subscription: { $in: subscriptionIds } }).distinct('user')
        ])
        const targetUserIds = [...new Set([...subUsers, ...userSubUsers].map(String))]
        baseFilter._id = { $in: targetUserIds }
      } else if (examId && subExamId) {
        baseFilter.$and = [
          { $or: [{ 'exam._id': examId }, { 'examType._id': examId }] },
          { $or: [{ 'subExam._id': subExamId }, { 'subExams._id': subExamId }] }
        ]
      } else if (examId) {
        baseFilter.$or = [{ 'exam._id': examId }, { 'examType._id': examId }]
      } else if (subExamId) {
        baseFilter.$or = [{ 'subExam._id': subExamId }, { 'subExams._id': subExamId }]
      }
    }

    const batchSize = 500
    let skip = 0
    let hasMore = true
    let totalSent = 0

    while (hasMore) {
      const batchUsers = await User.find(baseFilter)
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

    const { title, message, image, all, examId, subExamId } = announcement
    let baseFilter = { fcmToken: { $ne: null, $exists: true }, isDeleted: false }

    if (!all) {
      if (examId && subExamId) {
        baseFilter.$and = [
          { $or: [{ 'exam._id': examId }, { 'examType._id': examId }] },
          { $or: [{ 'subExam._id': subExamId }, { 'subExams._id': subExamId }] }
        ]
      } else if (examId) {
        baseFilter.$or = [{ 'exam._id': examId }, { 'examType._id': examId }]
      } else if (subExamId) {
        baseFilter.$or = [{ 'subExam._id': subExamId }, { 'subExams._id': subExamId }]
      }
    }

    const batchSize = 500
    let skip = 0
    let hasMore = true
    let totalSent = 0

    while (hasMore) {
      const batchUsers = await User.find(baseFilter)
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
              type: 'announcement',
              announcementId: String(announcementId)
            }
          })
          logger.info({ jobId: job.id, sent: result.successCount, failed: result.failureCount }, 'FCM announcement campaign batch sent')
        } catch (err) {
          logger.error({ err }, 'FCM announcement campaign batch send failed')
        }
      }

      const notificationDocs = batchUsers.map((u) => ({
        user: u._id,
        title,
        body: message,
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
          logger.error({ err }, 'In-app announcement campaign batch insert failed')
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

  let { userId, subExamId, examId, courseIds, subscriptionIds, all, title, body, data } = job.data

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
  } else if (name === 'referral-bonus') {
    title = 'Referral Bonus! 🎁'
    body = 'You earned 25 coins for successfully referring a new user!'
    data = { ...data, type: 'referral_bonus' }
  } else if (name === 'signup-bonus-referral') {
    title = 'Welcome Bonus! 🎉'
    body = 'You received 10 coins as a sign-up bonus via referral!'
    data = { ...data, type: 'signup_bonus' }
  }

  let filter = {}
  if (!all) {
    if (courseIds && courseIds.length > 0) {
      const Enrollment = require('../../models/Enrollment.model')
      const CourseOrder = require('../../models/CourseOrder.model')
      const [enrolledUsers, orderUsers] = await Promise.all([
        Enrollment.find({ course: { $in: courseIds } }).distinct('user'),
        CourseOrder.find({ 'items.itemId': { $in: courseIds }, status: 'paid' }).distinct('user')
      ])
      const targetUserIds = [...new Set([...enrolledUsers, ...orderUsers].map(String))]
      filter = { _id: { $in: targetUserIds } }
    } else if (subscriptionIds && subscriptionIds.length > 0) {
      const SubscriptionOrder = require('../../models/SubscriptionOrder.model')
      const UserSubscription = require('../../models/UserSubscription.model')
      const [subUsers, userSubUsers] = await Promise.all([
        SubscriptionOrder.find({ subscription: { $in: subscriptionIds }, status: 'paid' }).distinct('user'),
        UserSubscription.find({ subscription: { $in: subscriptionIds } }).distinct('user')
      ])
      const targetUserIds = [...new Set([...subUsers, ...userSubUsers].map(String))]
      filter = { _id: { $in: targetUserIds } }
    } else if (examId && subExamId) {
      filter = {
        $and: [
          { $or: [{ 'exam._id': examId }, { 'examType._id': examId }] },
          { $or: [{ 'subExam._id': subExamId }, { 'subExams._id': subExamId }] }
        ]
      }
    } else if (examId) {
      filter = { $or: [{ 'exam._id': examId }, { 'examType._id': examId }] }
    } else if (subExamId) {
      filter = { $or: [{ 'subExam._id': subExamId }, { 'subExams._id': subExamId }] }
    } else if (userId) {
      filter = { _id: userId }
    }
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

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Notification worker job failed')
})

module.exports = worker
