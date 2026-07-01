const catchAsync      = require('../../core/catchAsync')
const { sendSuccess } = require('../../core/response')
const AppError        = require('../../core/AppError')
const AppVersion      = require('../../models/AppVersion.model')
const { PLATFORMS }   = require('./admin-app-version.schema')

const assertValidPlatform = (platform) => {
  if (!PLATFORMS.includes(platform)) {
    throw new AppError(
      `Invalid platform. Must be one of: ${PLATFORMS.join(', ')}`,
      400,
      'INVALID_PLATFORM',
    )
  }
}

// GET /api/v1/admin/app-version
const listAll = catchAsync(async (_req, res) => {
  const versions = await AppVersion.find().lean()
  const map = Object.fromEntries(versions.map((v) => [v.platform, v]))
  const result = PLATFORMS.map((p) => map[p] ?? { platform: p })
  sendSuccess(res, result)
})

// GET /api/v1/admin/app-version/:platform
const getOne = catchAsync(async (req, res) => {
  assertValidPlatform(req.params.platform)
  const version = await AppVersion.findOne({ platform: req.params.platform }).lean()
  sendSuccess(res, version ?? { platform: req.params.platform })
})

// PUT /api/v1/admin/app-version/:platform
const updateVersion = catchAsync(async (req, res) => {
  assertValidPlatform(req.params.platform)
  const version = await AppVersion.findOneAndUpdate(
    { platform: req.params.platform },
    { ...req.body, updatedBy: req.admin._id },
    { new: true, upsert: true, runValidators: true },
  ).lean()
  sendSuccess(res, version, `${req.params.platform} version updated successfully`)
})

module.exports = { listAll, getOne, updateVersion }
