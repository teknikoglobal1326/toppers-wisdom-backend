const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminTopicService = require('./admin-topic.service')

const list = catchAsync(async (req, res) => {
  const result = await adminTopicService.listAll(req.query)
  sendPaginated(res, result.data, result.pagination)
})

const getOne = catchAsync(async (req, res) => {
  sendSuccess(res, await adminTopicService.getOne(req.params.id))
})

const create = catchAsync(async (req, res) => {
  sendCreated(res, await adminTopicService.createTopic(req.body))
})

const update = catchAsync(async (req, res) => {
  sendSuccess(res, await adminTopicService.updateTopic(req.params.id, req.body))
})

const remove = catchAsync(async (req, res) => {
  await adminTopicService.softDelete(req.params.id)
  sendSuccess(res, null, 'Topic deleted')
})

module.exports = { list, getOne, create, update, remove }
