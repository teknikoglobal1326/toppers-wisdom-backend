const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminSubjectService = require('./admin-subject.service')

const list   = catchAsync(async (req, res) => { const r = await adminSubjectService.listAll(req.query); sendPaginated(res, r.data, r.pagination) })
const getOne = catchAsync(async (req, res) => { sendSuccess(res, await adminSubjectService.getOne(req.params.id)) })

const create = catchAsync(async (req, res) => {
  // ---- Dual creation disabled for now ----
  // if (req.body.hi && req.body.en) {
  //   sendCreated(res, await adminSubjectService.createSubjectDual(req.body))
  //   return
  // }
  sendCreated(res, await adminSubjectService.createSubject(req.body))
})

const update = catchAsync(async (req, res) => { sendSuccess(res, await adminSubjectService.updateSubject(req.params.id, req.body)) })
const remove = catchAsync(async (req, res) => { await adminSubjectService.softDelete(req.params.id); sendSuccess(res, null, 'Subject deleted') })

module.exports = { list, getOne, create, update, remove }