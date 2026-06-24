const catchAsync       = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminTestService = require('./admin-test.service')

const listAll          = catchAsync(async (req, res) => { const r = await adminTestService.listAll(req.query); sendPaginated(res, r.data, r.pagination) })
const getOne           = catchAsync(async (req, res) => { sendSuccess(res, await adminTestService.getById(req.params.id)) })
const createTest       = catchAsync(async (req, res) => { sendCreated(res, await adminTestService.create({ ...req.body, createdBy: req.user._id })) })
const updateTest       = catchAsync(async (req, res) => { sendSuccess(res, await adminTestService.update(req.params.id, req.body)) })
const deleteTest       = catchAsync(async (req, res) => { await adminTestService.remove(req.params.id); sendSuccess(res, null, 'Test deleted') })
const publish          = catchAsync(async (req, res) => { sendSuccess(res, await adminTestService.publish(req.params.id), 'Test published') })
const addSubTest       = catchAsync(async (req, res) => { sendCreated(res, await adminTestService.addSubTest(req.params.id, req.body)) })
const addQuestion      = catchAsync(async (req, res) => { sendCreated(res, await adminTestService.addQuestion(req.params.id, req.params.subTestId, req.body)) })
const bulkAddQuestions = catchAsync(async (req, res) => { sendCreated(res, await adminTestService.bulkAddQuestions(req.params.id, req.params.subTestId, req.body.questions)) })
const removeQuestion   = catchAsync(async (req, res) => { sendSuccess(res, await adminTestService.removeQuestion(req.params.id, req.params.subTestId, req.params.questionId), 'Question removed') })

module.exports = { listAll, getOne, createTest, updateTest, deleteTest, publish, addSubTest, addQuestion, bulkAddQuestions, removeQuestion }
