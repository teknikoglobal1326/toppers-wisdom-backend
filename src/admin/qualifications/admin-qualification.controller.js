const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminQualificationService = require('./admin-qualification.service')

const list   = catchAsync(async (req, res) => { const r = await adminQualificationService.listAll(req.query); sendPaginated(res, r.data, r.pagination) })
const getOne = catchAsync(async (req, res) => { sendSuccess(res, await adminQualificationService.getOne(req.params.id)) })
const create = catchAsync(async (req, res) => { sendCreated(res, await adminQualificationService.createQualification(req.body)) })
const update = catchAsync(async (req, res) => { sendSuccess(res, await adminQualificationService.updateQualification(req.params.id, req.body)) })
const remove = catchAsync(async (req, res) => { await adminQualificationService.softDelete(req.params.id); sendSuccess(res, null, 'Qualification deleted') })

module.exports = { list, getOne, create, update, remove }
