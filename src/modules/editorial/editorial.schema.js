const Joi = require('joi')

const TYPE_VALUES = ['daily_editorial', 'ncert_based']
const STATUS_VALUES = ['draft', 'published', 'inactive']

const listEditorialQuerySchema = Joi.object({
  type: Joi.string().valid(...TYPE_VALUES),
  status: Joi.string().valid(...STATUS_VALUES),
  editorialTest: Joi.string().hex().length(24),
  isFree: Joi.boolean(),
  search: Joi.string().trim().allow(''),
  publishDate: Joi.date().iso(),
  sortBy: Joi.string().valid('sortOrder', 'publishDate', 'createdAt', 'updatedAt', 'title').default('sortOrder'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  sortOrderDirection: Joi.string().valid('asc', 'desc'),
  publishDateDirection: Joi.string().valid('asc', 'desc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(true)

const setEditorialLikeSchema = Joi.object({
  isLiked: Joi.boolean().default(true),
})

module.exports = { listEditorialQuerySchema, setEditorialLikeSchema }
