const Joi = require('joi')

const objectId = Joi.string().hex().length(24)

const listVocabQuerySchema = Joi.object({
  editorailTest: objectId.optional(),
  editorialTest: objectId.optional(),
  testId: objectId.optional(),
  search: Joi.string().trim().max(200).optional(),
  sortBy: Joi.string().valid('sortOrder', 'createdAt', 'publishDate', 'word', 'title').optional().default('sortOrder'),
  sortOrder: Joi.string().valid('asc', 'desc').optional().default('asc'),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10)
}).unknown(true)

module.exports = {
  listVocabQuerySchema
}
