const Joi = require('joi')

const TYPE_VALUES = ['daily_editorial', 'ncert_based', 'beginner']
const STATUS_VALUES = ['draft', 'published', 'inactive']
const objectId = Joi.string().hex().length(24).allow('', null)

const createEditorialSchema = Joi.object({
  title: Joi.string().trim().min(1).max(300),
  slug: Joi.string().trim().lowercase().max(300),
  type: Joi.string().valid(...TYPE_VALUES),
  bannerImage: Joi.string().max(500).allow('', null),
  thumbnail: Joi.string().max(500).allow('', null),
  publishDate: Joi.date(),
  shortDescription: Joi.string().max(1000).allow('', null),
  description: Joi.string().allow('', null),
  videoUrl: Joi.string().max(500).allow('', null),
  audioUrl: Joi.string().max(500).allow('', null),
  editorialTest: objectId,
  editorialTopic: objectId,
  isFree: Joi.boolean(),
  sortOrder: Joi.number().integer().min(0),
  status: Joi.string().valid(...STATUS_VALUES),
  exam: Joi.array().items(objectId).single().default([]),
  examIds: Joi.array().items(objectId).single().default([]),
  subExam: Joi.array().items(objectId).single().default([]),
  subexamIds: Joi.array().items(objectId).single().default([]),
  subjectIds: Joi.array().items(objectId).single().default([]),
  subjects: Joi.array().items(objectId).single().default([]),
})

const updateEditorialSchema = Joi.object({
  title: Joi.string().trim().min(1).max(300),
  slug: Joi.string().trim().lowercase().max(300),
  type: Joi.string().valid(...TYPE_VALUES),
  bannerImage: Joi.string().max(500).allow('', null),
  thumbnail: Joi.string().max(500).allow('', null),
  publishDate: Joi.date(),
  shortDescription: Joi.string().max(1000).allow('', null),
  description: Joi.string().allow('', null),
  videoUrl: Joi.string().max(500).allow('', null),
  audioUrl: Joi.string().max(500).allow('', null),
  editorialTest: objectId,
  editorialTopic: objectId,
  isFree: Joi.boolean(),
  sortOrder: Joi.number().integer().min(0),
  status: Joi.string().valid(...STATUS_VALUES),
  exam: Joi.array().items(objectId).single(),
  examIds: Joi.array().items(objectId).single(),
  subExam: Joi.array().items(objectId).single(),
  subexamIds: Joi.array().items(objectId).single(),
  subjectIds: Joi.array().items(objectId).single(),
  subjects: Joi.array().items(objectId).single(),
}).min(1)

const listEditorialQuerySchema = Joi.object({
  type: Joi.string().valid(...TYPE_VALUES),
  status: Joi.string().valid(...STATUS_VALUES),
  isFree: Joi.boolean(),
  editorialTest: objectId,
  editorialTopic: objectId,
  search: Joi.string().trim().allow(''),
  sortBy: Joi.string().valid('sortOrder', 'publishDate', 'createdAt', 'updatedAt', 'title').default('sortOrder'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(true)

const upsertEditorialPlanSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().allow(null, ''),
  price: Joi.number().min(0).default(0),
  discountPrice: Joi.number().min(0).default(0),
  validityInMonths: Joi.number().integer().min(1).default(12),
  status: Joi.string().valid('active', 'inactive').default('active')
})

module.exports = {
  createEditorialSchema,
  updateEditorialSchema,
  listEditorialQuerySchema,
  upsertEditorialPlanSchema,
}