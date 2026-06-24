const Order      = require('../models/Order.model')
const Enrollment = require('../models/Enrollment.model')
const { createLogger } = require('../config/logger')

const logger = createLogger('access')

const checkAccess = async (userId, itemType, itemId) => {
  if (itemType === 'course') {
    const enrolled = await Enrollment.exists({ user: userId, course: itemId })
    if (enrolled) { logger.debug({ userId, itemType, itemId }, 'Access via enrollment'); return true }
  }

  const paid = await Order.exists({ user: userId, status: 'paid', 'items.itemType': itemType, 'items.itemId': itemId })
  logger.debug({ userId, itemType, itemId, hasAccess: !!paid }, 'Access via order check')
  return !!paid
}

module.exports = { checkAccess }