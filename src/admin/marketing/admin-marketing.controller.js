const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminMarketingService = require('./admin-marketing.service')

// --- Notification Campaigns ---
const listSentNotifications = catchAsync(async (req, res) => {
  const result = await adminMarketingService.listNotifications({ ...req.query, isProcessed: true })
  sendPaginated(res, result.data, result.pagination)
})

const listScheduledNotifications = catchAsync(async (req, res) => {
  const result = await adminMarketingService.listNotifications({ ...req.query, isProcessed: false })
  sendPaginated(res, result.data, result.pagination)
})

const getNotification = catchAsync(async (req, res) => {
  sendSuccess(res, await adminMarketingService.getNotification(req.params.id))
})

const createNotification = catchAsync(async (req, res) => {
  const adminId = req.admin?._id
  const campaign = await adminMarketingService.createNotification(req.body, adminId)
  sendCreated(res, campaign, 'Notification campaign scheduled successfully')
})

const updateNotification = catchAsync(async (req, res) => {
  const adminId = req.admin?._id
  const campaign = await adminMarketingService.updateNotification(req.params.id, req.body, adminId)
  sendSuccess(res, campaign, 'Notification campaign updated successfully')
})

const deleteNotification = catchAsync(async (req, res) => {
  await adminMarketingService.deleteNotification(req.params.id)
  sendSuccess(res, null, 'Notification campaign deleted successfully')
})

const resendNotification = catchAsync(async (req, res) => {
  const campaign = await adminMarketingService.resendNotification(req.params.id)
  sendSuccess(res, campaign, 'Notification campaign resent successfully')
})

// --- Announcements ---
const listAnnouncements = catchAsync(async (req, res) => {
  const result = await adminMarketingService.listAnnouncements(req.query)
  sendPaginated(res, result.data, result.pagination)
})

const getAnnouncement = catchAsync(async (req, res) => {
  sendSuccess(res, await adminMarketingService.getAnnouncement(req.params.id))
})

const createAnnouncement = catchAsync(async (req, res) => {
  const adminId = req.admin?._id
  const announcement = await adminMarketingService.createAnnouncement(req.body, adminId)
  sendCreated(res, announcement, 'Announcement scheduled successfully')
})

const updateAnnouncement = catchAsync(async (req, res) => {
  const adminId = req.admin?._id
  const announcement = await adminMarketingService.updateAnnouncement(req.params.id, req.body, adminId)
  sendSuccess(res, announcement, 'Announcement updated successfully')
})

const deleteAnnouncement = catchAsync(async (req, res) => {
  await adminMarketingService.deleteAnnouncement(req.params.id)
  sendSuccess(res, null, 'Announcement deleted successfully')
})

const resendAnnouncement = catchAsync(async (req, res) => {
  const announcement = await adminMarketingService.resendAnnouncement(req.params.id)
  sendSuccess(res, announcement, 'Announcement resent successfully')
})

module.exports = {
  listSentNotifications,
  listScheduledNotifications,
  getNotification,
  createNotification,
  updateNotification,
  deleteNotification,
  resendNotification,
  listAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  resendAnnouncement
}
