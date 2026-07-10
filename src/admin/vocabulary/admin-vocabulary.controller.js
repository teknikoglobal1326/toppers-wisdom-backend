const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminVocabularyService = require('./admin-vocabulary.service')

const list = catchAsync(async (req, res) => {
    const result = await adminVocabularyService.listAll(req.query)
    sendPaginated(res, result.data, result.pagination)
})

const getOne = catchAsync(async (req, res) => {
    sendSuccess(res, await adminVocabularyService.getOne(req.params.id))
})

const create = catchAsync(async (req, res) => {
    sendCreated(res, await adminVocabularyService.createVocabulary(req.body, req.admin?._id))
})

const update = catchAsync(async (req, res) => {
    sendSuccess(res, await adminVocabularyService.updateVocabulary(req.params.id, req.body, req.admin?._id))
})

const remove = catchAsync(async (req, res) => {
    await adminVocabularyService.softDelete(req.params.id, req.admin?._id)
    sendSuccess(res, null, 'Vocabulary deleted')
})

module.exports = { list, getOne, create, update, remove }