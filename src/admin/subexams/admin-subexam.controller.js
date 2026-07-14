const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminSubExamService = require('./admin-subexam.service')

const list = catchAsync(async (req, res) => { const r = await adminSubExamService.listAll(req.query); sendPaginated(res, r.data, r.pagination) })
const getOne = catchAsync(async (req, res) => { sendSuccess(res, await adminSubExamService.getOne(req.params.id)) })
const create = catchAsync(async (req, res) => {
  if (req.body.hi && req.body.en) {
    sendCreated(res, await adminSubExamService.createSubExamDual(req.body))
  } else {
    sendCreated(res, await adminSubExamService.createSubExam(req.body))
  }
})
const update = catchAsync(async (req, res) => { sendSuccess(res, await adminSubExamService.updateSubExam(req.params.id, req.body)) })
const remove = catchAsync(async (req, res) => { await adminSubExamService.softDelete(req.params.id); sendSuccess(res, null, 'SubExam deleted') })

module.exports = { list, getOne, create, update, remove }
