const Joi = require('joi')

const listGrammarQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive').default('active'),
  title: Joi.string().trim().max(200),
  topicName: Joi.string().trim().max(200),
  search: Joi.string().trim().max(200),
  sortBy: Joi.string().valid('sortOrder', 'title', 'topicName', 'status', 'createdAt', 'updatedAt').default('sortOrder'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  topicSortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(true)

const setGrammarChapterLikeSchema = Joi.object({
  isLiked: Joi.boolean().default(true),
})

module.exports = { listGrammarQuerySchema, setGrammarChapterLikeSchema }
