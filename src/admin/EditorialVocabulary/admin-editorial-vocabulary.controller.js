const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminEditorialVocabularyService = require('./admin-editorial-vocabulary.service')

const list = catchAsync(async (req, res) => {
  const result = await adminEditorialVocabularyService.listAll(req.query)
  sendPaginated(res, result.data, result.pagination)
})

const getOne = catchAsync(async (req, res) => {
  const vocab = await adminEditorialVocabularyService.getOne(req.params.id)
  sendSuccess(res, vocab)
})

const create = catchAsync(async (req, res) => {
  const adminId = req.admin?._id || req.user?._id || req.user?.id
  const vocab = await adminEditorialVocabularyService.createVocab(req.body, adminId)
  sendCreated(res, vocab)
})

const update = catchAsync(async (req, res) => {
  const adminId = req.admin?._id || req.user?._id || req.user?.id
  const vocab = await adminEditorialVocabularyService.updateVocab(req.params.id, req.body, adminId)
  sendSuccess(res, vocab)
})

const remove = catchAsync(async (req, res) => {
  const adminId = req.admin?._id || req.user?._id || req.user?.id
  await adminEditorialVocabularyService.softDelete(req.params.id, adminId)
  sendSuccess(res, null, 'Editorial vocabulary deleted successfully')
})

const importVocabularies = catchAsync(async (req, res) => {
  const adminId = req.admin?._id || req.user?._id || req.user?.id
  const result = await adminEditorialVocabularyService.importVocabularies(req.body, adminId)
  sendCreated(res, result, 'Vocabularies imported successfully')
})

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
  importVocabularies
}
