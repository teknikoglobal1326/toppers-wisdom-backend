const catchAsync       = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminTestMasterService = require('./admin-test-master.service')

const listAll          = catchAsync(async (req, res) => { const r = await adminTestMasterService.listAll(req.query); sendPaginated(res, r.data, r.pagination) })
const getOne           = catchAsync(async (req, res) => { sendSuccess(res, await adminTestMasterService.getById(req.params.id)) })
const createTest       = catchAsync(async (req, res) => { sendCreated(res, await adminTestMasterService.create({ ...req.body, createdBy: req.user._id })) })
const updateTest       = catchAsync(async (req, res) => { sendSuccess(res, await adminTestMasterService.update(req.params.id, req.body)) })
const deleteTest       = catchAsync(async (req, res) => { await adminTestMasterService.remove(req.params.id); sendSuccess(res, null, 'Test master deleted') })
const publish          = catchAsync(async (req, res) => { sendSuccess(res, await adminTestMasterService.publish(req.params.id), 'Test master published') })
const assignTest       = catchAsync(async (req, res) => { sendSuccess(res, await adminTestMasterService.assignTest(req.params.id, req.body), 'Test master assigned successfully') })

module.exports = { listAll, getOne, createTest, updateTest, deleteTest, publish, assignTest }
