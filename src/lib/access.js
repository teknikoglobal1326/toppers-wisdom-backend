const CourseOrder      = require('../models/CourseOrder.model')
const Enrollment = require('../models/Enrollment.model')
const { createLogger } = require('../config/logger')

const logger = createLogger('access')

const checkAccess = async (userId, itemType, itemId) => {
  if (itemType === 'course') {
    const enrolled = await Enrollment.exists({ user: userId, course: itemId })
    if (enrolled) { logger.debug({ userId, itemType, itemId }, 'Access via enrollment'); return true }

    const UserSubscription = require('../models/UserSubscription.model')
    const activeSubs = await UserSubscription.find({
      user: userId,
      isActive: true,
      endDate: { $gt: new Date() }
    }).populate('subscription').lean()

    for (const us of activeSubs) {
      if (us.subscription && Array.isArray(us.subscription.courses)) {
        if (us.subscription.courses.some(cId => cId.toString() === itemId.toString())) {
          logger.debug({ userId, itemType, itemId }, 'Access via active subscription course')
          return true
        }
      }
    }
  }

  const paid = await CourseOrder.exists({ user: userId, status: 'paid', 'items.itemType': itemType, 'items.itemId': itemId })
  logger.debug({ userId, itemType, itemId, hasAccess: !!paid }, 'Access via order check')
  return !!paid
}

module.exports = { checkAccess }