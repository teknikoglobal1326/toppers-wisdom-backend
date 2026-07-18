const Joi = require('joi')

const chapterSchema = Joi.object({
  title: Joi.string().trim().required(),
  sortOrder: Joi.number().integer().min(0).default(0),
})

const createTopicSchema = Joi.object({
  course: Joi.string().hex().length(24).required(),
  courseId: Joi.string().hex().length(24).optional(),
  subjects: Joi.array().items(Joi.string().hex().length(24)).optional(),
  topicName: Joi.alternatives().try(
    Joi.string().hex().length(24),
    Joi.array().items(Joi.string().hex().length(24))
  ).required(),
  sortOrder: Joi.number().integer().min(0).default(0),
  chapters: Joi.alternatives().try(
    Joi.string().hex().length(24),
    Joi.array().items(Joi.string().hex().length(24))
  ).optional(),
  status: Joi.string().valid('active', 'inactive').default('active'),
})

const updateTopicSchema = Joi.object({
  course: Joi.string().hex().length(24).optional(),
  courseId: Joi.string().hex().length(24).optional(),
  subjects: Joi.array().items(Joi.string().hex().length(24)).optional(),
  topicName: Joi.alternatives().try(
    Joi.string().hex().length(24),
    Joi.array().items(Joi.string().hex().length(24))
  ).optional(),
  sortOrder: Joi.number().integer().min(0),
  chapters: Joi.alternatives().try(
    Joi.string().hex().length(24),
    Joi.array().items(Joi.string().hex().length(24))
  ).optional(),
  status: Joi.string().valid('active', 'inactive'),
}).min(1)

const listTopicQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive'),
  course: Joi.string().hex().length(24),
  subject: Joi.string().hex().length(24),
  chapter: Joi.string().hex().length(24),
  search: Joi.string().trim().max(200),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
})

module.exports = { createTopicSchema, updateTopicSchema, listTopicQuerySchema }
