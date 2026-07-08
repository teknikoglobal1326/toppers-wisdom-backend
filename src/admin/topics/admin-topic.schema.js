const Joi = require('joi')

const chapterSchema = Joi.object({
  title: Joi.string().trim().required(),
  sortOrder: Joi.number().integer().min(0).default(0),
})

const createTopicSchema = Joi.object({
  course: Joi.string().hex().length(24).required(),
  courseId: Joi.string().hex().length(24).optional(),
  topicName: Joi.string().trim().required(),
  sortOrder: Joi.number().integer().min(0).default(0),
  chapters: Joi.array().items(chapterSchema).optional(),
  status: Joi.string().valid('active', 'inactive').default('active'),
})

const updateTopicSchema = Joi.object({
  course: Joi.string().hex().length(24).optional(),
  courseId: Joi.string().hex().length(24).optional(),
  topicName: Joi.string().trim(),
  sortOrder: Joi.number().integer().min(0),
  chapters: Joi.array().items(chapterSchema),
  status: Joi.string().valid('active', 'inactive'),
}).min(1)

const listTopicQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive'),
  course: Joi.string().hex().length(24),
  chapter: Joi.string().trim().max(200),
  search: Joi.string().trim().max(200),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
})

module.exports = { createTopicSchema, updateTopicSchema, listTopicQuerySchema }
