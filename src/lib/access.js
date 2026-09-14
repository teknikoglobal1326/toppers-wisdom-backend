const CourseOrder      = require('../models/CourseOrder.model')
const Enrollment = require('../models/Enrollment.model')
const { createLogger } = require('../config/logger')

const logger = createLogger('access')

const checkAccess = async (userId, itemType, itemId) => {
  if (itemType === 'course') {
    const enrolled = await Enrollment.exists({ user: userId, course: itemId })
    if (enrolled) { logger.debug({ userId, itemType, itemId }, 'Access via enrollment'); return true }

    const UserSubscription = require('../models/UserSubscription.model')
    const SubscriptionOrder = require('../models/SubscriptionOrder.model')
    const activeSubs = await UserSubscription.find({
      user: userId,
      isActive: true,
      endDate: { $gt: new Date() }
    }).select('order').lean()

    const activeOrderIds = activeSubs.map(us => us.order).filter(Boolean)
    if (activeOrderIds.length > 0) {
      const subOrders = await SubscriptionOrder.find({
        _id: { $in: activeOrderIds },
        isActive: true
      }).select('subscriptionDetails.courses').lean()

      for (const order of subOrders) {
        if (order.subscriptionDetails && Array.isArray(order.subscriptionDetails.courses)) {
          if (order.subscriptionDetails.courses.some(cId => cId.toString() === itemId.toString())) {
            logger.debug({ userId, itemType, itemId }, 'Access via active subscription order course')
            return true
          }
        }
      }
    }
  }

  const paid = await CourseOrder.exists({ user: userId, status: 'paid', 'items.itemType': itemType, 'items.itemId': itemId })
  logger.debug({ userId, itemType, itemId, hasAccess: !!paid }, 'Access via order check')
  return !!paid
}

module.exports = { checkAccess }