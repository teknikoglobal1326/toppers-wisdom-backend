/**
 * Controllers are now 3 lines each.
 * catchAsync  — eliminates try/catch
 * sendSuccess — standardized response
 * No business logic. No error handling. Just call service and respond.
 */
const catchAsync = require('../../core/catchAsync')
const { sendSuccess } = require('../../core/response')
const authService = require('./auth.service')

const sendOtp = catchAsync(async (req, res) => {
  const data = await authService.sendOtp(req.body.phone)
  sendSuccess(res, data)
})

const verifyOtp = catchAsync(async (req, res) => {
  const data = await authService.verifyOtpAndLogin(req.body.phone, req.body.otp)
  sendSuccess(res, data, 'Login successful')
})

const refreshToken = catchAsync(async (req, res) => {
  const data = await authService.refreshToken(req.body.refreshToken)
  sendSuccess(res, data)
})

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.token)
  sendSuccess(res, null, 'Logged out successfully')
})

const updatePassword = catchAsync(async (req, res) => {
  const data = await authService.updatePassword(req.user._id, req.body.password)
  sendSuccess(res, data, 'Password updated successfully')
})

const updateProfile = catchAsync(async (req, res) => {
  const data = await authService.updateProfile(req.user._id, req.body)
  sendSuccess(res, data, 'Profile updated successfully')
})

const login = catchAsync(async (req, res) => {
  const data = await authService.loginWithPassword(req.body.phone, req.body.password)
  sendSuccess(res, data, 'Login successful')
})

const deleteAccount = catchAsync(async (req, res) => {
  await authService.deleteAccount(req.user._id, req.token)
  sendSuccess(res, null, 'Account deleted successfully')
})

module.exports = { sendOtp, verifyOtp, refreshToken, logout, updatePassword, updateProfile, login, deleteAccount }