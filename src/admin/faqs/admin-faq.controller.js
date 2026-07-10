const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminFaqService = require('./admin-faq.service')

const list = catchAsync(async (req, res) => {
  const result = await adminFaqService.listAll(req.query)
  sendPaginated(res, result.data, result.pagination)
})

const getOne = catchAsync(async (req, res) => {
  sendSuccess(res, await adminFaqService.getOne(req.params.id))
})

const create = catchAsync(async (req, res) => {
  sendCreated(res, await adminFaqService.createFaq(req.body))
})

const update = catchAsync(async (req, res) => {
  sendSuccess(res, await adminFaqService.updateFaq(req.params.id, req.body))
})

const remove = catchAsync(async (req, res) => {
  await adminFaqService.softDelete(req.params.id)
  sendSuccess(res, null, 'Faq deleted')
})

module.exports = { list, getOne, create, update, remove }
