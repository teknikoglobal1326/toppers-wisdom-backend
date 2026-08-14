const catchAsync = require('../../core/catchAsync')
const { sendSuccess } = require('../../core/response')
const dashboardService = require('./admin-dashboard.service')

const getDashboardStats = catchAsync(async (req, res) => {
  const stats = await dashboardService.getDashboardStats()
  sendSuccess(res, stats, 'Dashboard stats fetched successfully')
})

module.exports = {
  getDashboardStats
}
