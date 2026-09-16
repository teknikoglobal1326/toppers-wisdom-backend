const CourseOrder      = require('../models/CourseOrder.model')
const Enrollment = require('../models/Enrollment.model')
const { createLogger } = require('../config/logger')

const logger = createLogger('access')

const checkAccess = async (userId, itemType, itemId) => {
  if (itemType === 'course') {
    const Course = require('../models/Course.model')
    const course = await Course.findById(itemId).select('type isFree').lean()
    if (course && (course.type === 'free' || course.isFree)) {
      logger.debug({ userId, itemType, itemId }, 'Access via free course')
      return true
    }

    const enrolled = await Enrollment.exists({ user: userId, course: itemId })
    if (enrolled) { logger.debug({ userId, itemType, itemId }, 'Access via enrollment'); return true }

    const UserSubscription = require('../models/UserSubscription.model')
    const SubscriptionOrder = require('../models/SubscriptionOrder.model')
    const activeSubs = await UserSubscription.find({
      user: userId,
      isActive: true,
      endDate: { $gt: new Date() }
    }).select('order startDate').lean()

    const activeOrderIds = activeSubs.map(us => us.order).filter(Boolean)
    if (activeOrderIds.length > 0) {
      const { isItemValidCustomValidity } = require('./subscriptionHelper')
      const subOrders = await SubscriptionOrder.find({
        _id: { $in: activeOrderIds },
        isActive: true
      }).select('subscriptionDetails').lean()

      for (const order of subOrders) {
        if (order.subscriptionDetails && Array.isArray(order.subscriptionDetails.courses)) {
          if (order.subscriptionDetails.courses.some(cId => cId.toString() === itemId.toString())) {
            const userSub = activeSubs.find(us => us.order?.toString() === order._id.toString())
            if (userSub && isItemValidCustomValidity(order.subscriptionDetails, userSub.startDate, itemId)) {
              logger.debug({ userId, itemType, itemId }, 'Access via active subscription order course')
              return true
            }
          }
        }
      }
    }
    const WrapperPackage = require('../models/WrapperPackage.model')
    const wrapperPackages = await WrapperPackage.find({ courses: itemId, status: 'active', isDeleted: false }).select('_id').lean()
    if (wrapperPackages.length > 0) {
      const wpIds = wrapperPackages.map(wp => wp._id)
      const paidWp = await CourseOrder.exists({ 
        user: userId, 
        status: 'paid', 
        'items.itemType': 'wrapper-package', 
        'items.itemId': { $in: wpIds } 
      })
      if (paidWp) {
        logger.debug({ userId, itemType, itemId }, 'Access via wrapper package')
        return true
      }
    }
  }

  const paid = await CourseOrder.exists({ user: userId, status: 'paid', 'items.itemType': itemType, 'items.itemId': itemId })
  logger.debug({ userId, itemType, itemId, hasAccess: !!paid }, 'Access via order check')
  return !!paid
}

module.exports = { checkAccess }