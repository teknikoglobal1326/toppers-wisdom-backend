const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const editorialVocabularyService = require('./editorial-vocabulary.service')

const list = catchAsync(async (req, res) => {
  const result = await editorialVocabularyService.listAll(req.query)
  sendPaginated(res, result.data, result.pagination)
})

const getOne = catchAsync(async (req, res) => {
  const vocab = await editorialVocabularyService.getOne(req.params.id)
  sendSuccess(res, vocab)
})

module.exports = {
  list,
  getOne
}
