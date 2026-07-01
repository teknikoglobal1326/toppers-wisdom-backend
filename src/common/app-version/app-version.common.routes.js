const router      = require('express').Router()
const catchAsync  = require('../../core/catchAsync')
const { sendSuccess } = require('../../core/response')
const AppError    = require('../../core/AppError')
const AppVersion  = require('../../models/AppVersion.model')

const PLATFORMS = ['android', 'ios']

// GET /api/v1/common/app-version?platform=android
router.get('/', catchAsync(async (req, res) => {
  const { platform } = req.query

  if (!platform) {
    throw new AppError(
      `platform query param is required. Valid values: ${PLATFORMS.join(', ')}`,
      400,
      'VALIDATION_ERROR',
    )
  }

  if (!PLATFORMS.includes(platform)) {
    throw new AppError(
      `Invalid platform. Must be one of: ${PLATFORMS.join(', ')}`,
      400,
      'INVALID_PLATFORM',
    )
  }

  const version = await AppVersion.findOne({ platform }).select('-updatedBy').lean()
  sendSuccess(res, version ?? { platform, latestVersion: null, minVersion: null, forceUpdate: false })
}))

module.exports = router
