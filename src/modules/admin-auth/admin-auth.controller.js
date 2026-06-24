const catchAsync = require('../../core/catchAsync')
const { sendSuccess } = require('../../core/response')
const adminAuthService = require('./admin-auth.service')

const login = catchAsync(async (req, res) => {
  const data = await adminAuthService.login(req.body.email, req.body.password)
  sendSuccess(res, data, 'Admin login successful')
})

const refreshToken = catchAsync(async (req, res) => {
  const data = await adminAuthService.refreshToken(req.body.refreshToken)
  sendSuccess(res, data)
})

const logout = catchAsync(async (req, res) => {
  await adminAuthService.logout(req.adminToken)
  sendSuccess(res, null, 'Logged out successfully')
})

const changePassword = catchAsync(async (req, res) => {
  await adminAuthService.changePassword(req.admin, req.body.currentPassword, req.body.newPassword)
  sendSuccess(res, null, 'Password changed successfully')
})

const forgotPassword = catchAsync(async (req, res) => {
  const data = await adminAuthService.forgotPassword(req.body.email)
  sendSuccess(res, data)
})

const resetPassword = catchAsync(async (req, res) => {
  await adminAuthService.resetPassword(req.body.token, req.body.newPassword)
  sendSuccess(res, null, 'Password reset successfully')
})

module.exports = { login, refreshToken, logout, changePassword, forgotPassword, resetPassword }

