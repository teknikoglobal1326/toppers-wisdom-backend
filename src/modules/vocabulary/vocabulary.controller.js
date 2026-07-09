const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const vocabularyService = require('./vocabulary.service')

const list = catchAsync(async (req, res) => {
    const result = await vocabularyService.listAll(req.query)
    sendPaginated(res, result.data, result.pagination)
})

const getOne = catchAsync(async (req, res) => {
    sendSuccess(res, await vocabularyService.getOne(req.params.id))
})

module.exports = { list, getOne }