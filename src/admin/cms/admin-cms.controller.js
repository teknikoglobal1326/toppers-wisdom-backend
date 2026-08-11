const catchAsync    = require('../../core/catchAsync')
const { sendSuccess } = require('../../core/response')
const AppError      = require('../../core/AppError')
const Cms           = require('../../models/Cms.model')
const { CMS_TYPES } = require('./admin-cms.schema')

const assertValidType = (type) => {
  if (!CMS_TYPES.includes(type)) {
    throw new AppError(
      `Invalid CMS type. Must be one of: ${CMS_TYPES.join(', ')}`,
      400,
      'INVALID_CMS_TYPE',
    )
  }
}

// GET /api/v1/admin/cms/:type
const getPage = catchAsync(async (req, res) => {
  assertValidType(req.params.type)
  const page = await Cms.findOne({ type: req.params.type }).lean()
  sendSuccess(res, page ?? { type: req.params.type, content: '' })
})

// PUT /api/v1/admin/cms/:type
const updatePage = catchAsync(async (req, res) => {
  assertValidType(req.params.type)
  const Admin = require('../../models/Admin.model')
  const admin = req.admin || (req.member ? await Admin.findOne({ email: req.member.email, isActive: true }) : null)
  const updatedBy = admin?._id || req.member?._id || req.user?._id || null

  const page = await Cms.findOneAndUpdate(
    { type: req.params.type },
    { content: req.body.content, updatedBy },
    { new: true, upsert: true, runValidators: true },
  ).lean()
  sendSuccess(res, page, 'CMS page updated successfully')
})

// GET /api/v1/admin/cms
const listAll = catchAsync(async (_req, res) => {
  const pages = await Cms.find().select('type updatedAt').lean()
  // return all known types, filling in empty ones
  const map = Object.fromEntries(pages.map((p) => [p.type, p]))
  const result = CMS_TYPES.map((type) => map[type] ?? { type, content: '', updatedAt: null })
  sendSuccess(res, result)
})

module.exports = { getPage, updatePage, listAll }
