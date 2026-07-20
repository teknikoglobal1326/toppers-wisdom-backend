const Joi = require('joi')

const idOrIdArray = Joi.alternatives().try(
  Joi.string().hex().length(24),
  Joi.array().items(Joi.string().hex().length(24))
)

const createTopicSchema = Joi.object({
  course: Joi.string().hex().length(24).required(),
  courseId: Joi.string().hex().length(24).optional(),
  subjects: Joi.array().items(Joi.string().hex().length(24)).optional(),
  chapters: idOrIdArray.required(),
  topics: idOrIdArray.optional(),
  sortOrder: Joi.number().integer().min(0).default(0),
  status: Joi.string().valid('active', 'inactive').default('active'),
})

const updateTopicSchema = Joi.object({
  course: Joi.string().hex().length(24).optional(),
  courseId: Joi.string().hex().length(24).optional(),
  subjects: Joi.array().items(Joi.string().hex().length(24)).optional(),
  chapters: idOrIdArray.optional(),
  topics: idOrIdArray.optional(),
  sortOrder: Joi.number().integer().min(0),
  status: Joi.string().valid('active', 'inactive'),
}).min(1)

const listTopicQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive'),
  course: Joi.string().hex().length(24),
  subject: Joi.string().hex().length(24),
  chapter: Joi.string().hex().length(24),
  topic: Joi.string().hex().length(24),
  search: Joi.string().trim().max(200),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
})

module.exports = { createTopicSchema, updateTopicSchema, listTopicQuerySchema }
