const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminExamService = require('./admin-exam.service')

const list   = catchAsync(async (req, res) => { const r = await adminExamService.listAll(req.query); sendPaginated(res, r.data, r.pagination) })
const getOne = catchAsync(async (req, res) => { sendSuccess(res, await adminExamService.getOne(req.params.id)) })
const create = catchAsync(async (req, res) => { sendCreated(res, await adminExamService.createExam(req.body, req.files)) })
const update = catchAsync(async (req, res) => { sendSuccess(res, await adminExamService.updateExam(req.params.id, req.body, req.file)) })
const remove = catchAsync(async (req, res) => { await adminExamService.softDelete(req.params.id); sendSuccess(res, null, 'Exam deleted') })

module.exports = { list, getOne, create, update, remove }
