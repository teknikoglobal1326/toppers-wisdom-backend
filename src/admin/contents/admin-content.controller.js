const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminContentService = require('./admin-content.service')

const list = catchAsync(async (req, res) => {
  const result = await adminContentService.listAll(req.query)
  sendPaginated(res, result.data, result.pagination)
})

const getOne = catchAsync(async (req, res) => {
  sendSuccess(res, await adminContentService.getOne(req.params.id))
})

const create = catchAsync(async (req, res) => {
  const payload = { ...req.body, createdBy: req.admin?._id }
  sendCreated(res, await adminContentService.createContent(payload))
})

const update = catchAsync(async (req, res) => {
  const payload = { ...req.body, createdBy: req.admin?._id }
  sendSuccess(res, await adminContentService.updateContent(req.params.id, payload))
})

const remove = catchAsync(async (req, res) => {
  await adminContentService.softDelete(req.params.id)
  sendSuccess(res, null, 'Content deleted')
})

module.exports = { list, getOne, create, update, remove }
