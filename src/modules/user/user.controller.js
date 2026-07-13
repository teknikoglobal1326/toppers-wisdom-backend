/**
 * EVERY function is 3 lines:
 * 1. catchAsync wrapper — no try/catch needed
 * 2. call service
 * 3. send response
 */
const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const userService = require('./user.service')

const getMe = catchAsync(async (req, res) => { sendSuccess(res, await userService.getMe(req.user._id)) })
const updateProfile = catchAsync(async (req, res) => { sendSuccess(res, await userService.updateProfile(req.user._id, req.body)) })
const setupProfile = catchAsync(async (req, res) => { sendSuccess(res, await userService.setupProfile(req.user._id, req.body), 'Profile setup complete') })
const getStats = catchAsync(async (req, res) => { sendSuccess(res, await userService.getStats(req.user._id)) })
const getCommonStudyStats = catchAsync(async (req, res) => { sendSuccess(res, await userService.getCommonStudyStats(req.user._id)) })
const removeSaved = catchAsync(async (req, res) => { await userService.removeSaved(req.user._id, req.params.itemId); sendSuccess(res, null, 'Removed') })
const markNotifRead = catchAsync(async (req, res) => { await userService.markNotificationRead(req.user._id, req.params.id); sendSuccess(res, null, 'Marked as read') })
const updateFcmToken = catchAsync(async (req, res) => { await userService.updateFcmToken(req.user._id, req.body.fcmToken); sendSuccess(res, null, 'Updated') })

const getSaved = catchAsync(async (req, res) => {
  const r = await userService.getSaved(req.user._id, req.query)
  sendPaginated(res, r.data, r.pagination)
})

const getOrders = catchAsync(async (req, res) => {
  const r = await userService.getOrders(req.user._id, req.query)
  sendPaginated(res, r.data, r.pagination)
})

const getNotifications = catchAsync(async (req, res) => {
  const r = await userService.getNotifications(req.user._id, req.query)
  sendPaginated(res, r.data, r.pagination)
})

module.exports = { getMe, updateProfile, setupProfile, getStats, getCommonStudyStats, getSaved, removeSaved, getOrders, getNotifications, markNotifRead, updateFcmToken }