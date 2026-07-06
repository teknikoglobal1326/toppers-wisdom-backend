const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminShortService = require('./admin-short.service')

const list   = catchAsync(async (req, res) => { const r = await adminShortService.listAll(req.query); sendPaginated(res, r.data, r.pagination) })
const getOne = catchAsync(async (req, res) => { sendSuccess(res, await adminShortService.getOne(req.params.id)) })
const create = catchAsync(async (req, res) => {
  if (req.body.hi && req.body.en) {
    sendCreated(res, await adminShortService.createShortDual(req.body))
  } else {
    sendCreated(res, await adminShortService.createShort(req.body, req.files))
  }
})
const update = catchAsync(async (req, res) => { sendSuccess(res, await adminShortService.updateShort(req.params.id, req.body, req.files)) })
const remove = catchAsync(async (req, res) => { await adminShortService.softDelete(req.params.id); sendSuccess(res, null, 'Short deleted') })

module.exports = { list, getOne, create, update, remove }
