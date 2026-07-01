const router = require('express').Router()
const catchAsync = require('../../core/catchAsync')
const { sendSuccess } = require('../../core/response')
const AppError = require('../../core/AppError')
const Cms = require('../../models/Cms.model')

const CMS_TYPES = ['termCondition', 'privacyPolicy', 'aboutUs']

// GET /api/v1/common/cms?type=termCondition
router.get('/', catchAsync(async (req, res) => {
  const { type } = req.query

  if (!type) {
    throw new AppError(
      `type query param is required. Valid values: ${CMS_TYPES.join(', ')}`,
      400,
      'VALIDATION_ERROR',
    )
  }

  if (!CMS_TYPES.includes(type)) {
    throw new AppError(
      `Invalid type. Must be one of: ${CMS_TYPES.join(', ')}`,
      400,
      'INVALID_CMS_TYPE',
    )
  }

  const page = await Cms.findOne({ type }).select('type content updatedAt').lean()
  sendSuccess(res, page ?? { type, content: '' })
}))

module.exports = router
