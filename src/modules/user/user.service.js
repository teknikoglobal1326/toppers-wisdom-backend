/**
 * UserService extends BaseService.
 * getById, update, count are inherited for FREE.
 * Only user-specific logic added here.
 */
const BaseService  = require('../../core/BaseService')
const userRepository = require('./user.repository')
const Qualification  = require('../../models/Qualification.model')
const ExamType       = require('../../models/ExamType.model')
const SubExam        = require('../../models/SubExam.model')
const Order          = require('../../models/Order.model')
const Notification   = require('../../models/Notification.model')
const TestAttempt    = require('../../models/TestAttempt.model')
const Enrollment     = require('../../models/Enrollment.model')
const AppError  = require('../../core/AppError')
const { paginate }   = require('../../core/paginate')
const { createLogger } = require('../../config/logger')

class UserService extends BaseService {
  constructor() {
    super(userRepository, 'user')
    this.logger = createLogger('user:service')
  }

  async getMe(userId) {
    this.logger.info({ userId }, 'Fetching profile')
    // inherited: this.getById() calls findByIdOrFail → throws 404 automatically
    return this.getById(userId)
  }

  async updateProfile(userId, data) {
    this.logger.info({ userId, fields: Object.keys(data) }, 'Updating profile')
    // inherited: this.update() checks existence then calls updateById
    return this.update(userId, data)
  }

  async setupProfile(userId, data) {
    this.logger.info({ userId }, 'Profile setup')

    const [qualification, examType, subExam] = await Promise.all([
      Qualification.findById(data.qualificationId).lean(),
      ExamType.findById(data.examTypeId).lean(),
      SubExam.findById(data.subExamId).lean(),
    ])

    if (!qualification) throw new AppError('Qualification not found', 404)
    if (!examType)      throw new AppError('Exam type not found', 404)
    if (!subExam)       throw new AppError('Sub-exam not found', 404)

    const user = await userRepository.updateSubExam(userId, qualification, examType, subExam)
    this.logger.info({ userId, subExam: subExam.name }, 'Profile setup complete')
    return user
  }

  async getStats(userId) {
    this.logger.info({ userId }, 'Fetching stats')
    const [user, testAttempts, enrollments] = await Promise.all([
      userRepository.findById(userId, { select: 'watchDuration savedItems' }),
      TestAttempt.countDocuments({ user: userId }),
      Enrollment.countDocuments({ user: userId }),
    ])
    return { watchDuration: user?.watchDuration || 0, savedCount: user?.savedItems?.length || 0, testAttempts, enrollments }
  }

  async getSaved(userId, opts) {
    const items = await userRepository.getSavedItems(userId)
    const page  = Math.max(1, parseInt(opts.page) || 1)
    const limit = Math.min(50, parseInt(opts.limit) || 10)
    const data  = items.slice((page - 1) * limit, page * limit)
    return { data, pagination: { page, limit, total: items.length, totalPages: Math.ceil(items.length / limit) } }
  }

  async removeSaved(userId, itemId) {
    this.logger.info({ userId, itemId }, 'Removing saved item')
    return userRepository.removeSavedItem(userId, itemId)
  }

  async getOrders(userId, opts) {
    return paginate(Order, { user: userId }, { ...opts, sort: { createdAt: -1 } })
  }

  async getNotifications(userId, opts) {
    return paginate(Notification, { user: userId }, { ...opts, sort: { createdAt: -1 } })
  }

  async markNotificationRead(userId, notifId) {
    return Notification.findOneAndUpdate({ _id: notifId, user: userId }, { isRead: true })
  }

  async updateFcmToken(userId, fcmToken) {
    return userRepository.updateById(userId, { fcmToken })
  }
}

module.exports = new UserService()