const catchAsync = require('../../core/catchAsync')
const { sendSuccess } = require('../../core/response')
const platformSettingService = require('./platform-setting.service')

const { uploadFile } = require('../../lib/fileUpload')

const getSettings = catchAsync(async (req, res) => {
  const settings = await platformSettingService.getSettings()
  sendSuccess(res, settings, 'Platform settings retrieved successfully')
})

const updateSettings = catchAsync(async (req, res) => {
  const updateData = { ...req.body }

  if (req.file) {
    const ext = req.file.originalname.split('.').pop().toLowerCase()
    const siteLogo = await uploadFile(
      req.file.buffer,
      `logo-${Date.now()}.${ext}`,
      'settings/logo',
      req.file.mimetype
    )
    updateData.siteLogo = siteLogo
  }

  if (updateData.platformFee !== undefined) updateData.platformFee = Number(updateData.platformFee)
  if (updateData.gst !== undefined) updateData.gst = Number(updateData.gst)

  const settings = await platformSettingService.updateSettings(updateData)
  sendSuccess(res, settings, 'Platform settings updated successfully')
})

module.exports = {
  getSettings,
  updateSettings,
}
