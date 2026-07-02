const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminQuestionService = require('./admin-question.service')

const list = catchAsync(async (req, res) => {
  const result = await adminQuestionService.listAll(req.query)
  sendPaginated(res, result.data, result.pagination)
})

const getOne = catchAsync(async (req, res) => {
  sendSuccess(res, await adminQuestionService.getOne(req.params.id))
})

const create = catchAsync(async (req, res) => {
  const payload = { ...req.body, createdBy: req.admin?._id }
  sendCreated(res, await adminQuestionService.createQuestion(payload))
})

const update = catchAsync(async (req, res) => {
  const payload = { ...req.body, createdBy: req.admin?._id }
  sendSuccess(res, await adminQuestionService.updateQuestion(req.params.id, payload))
})

const remove = catchAsync(async (req, res) => {
  await adminQuestionService.softDelete(req.params.id)
  sendSuccess(res, null, 'Question deleted')
})

module.exports = { list, getOne, create, update, remove }
