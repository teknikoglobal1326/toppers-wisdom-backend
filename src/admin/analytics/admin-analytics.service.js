const User       = require('../../models/User.model')
const Enrollment = require('../../models/Enrollment.model')
const Order      = require('../../models/Order.model')
const Test       = require('../../models/Test.model')
const { createLogger } = require('../../config/logger')

const logger = createLogger('admin:analytics:service')

const overview = async () => {
  logger.info('Fetching analytics overview')
  const [totalUsers, totalEnrollments, revenueResult, activeTests] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    Enrollment.countDocuments(),
    Order.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    Test.countDocuments({ status: 'published' }),
  ])
  return { totalUsers, totalEnrollments, totalRevenue: revenueResult[0]?.total || 0, activeTests }
}

const revenue = async (from, to) => {
  logger.info({ from, to }, 'Fetching revenue report')
  return Order.aggregate([
    { $match: { status: 'paid', paidAt: { $gte: new Date(from), $lte: new Date(to) } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } }, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ])
}

const users = async (from, to) => {
  logger.info({ from, to }, 'Fetching user growth report')
  return User.aggregate([
    { $match: { role: 'user', createdAt: { $gte: new Date(from), $lte: new Date(to) } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ])
}

module.exports = { overview, revenue, users }
