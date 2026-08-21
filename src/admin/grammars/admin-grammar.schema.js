const Joi = require('joi')

const objectId = Joi.string().hex().length(24)

const chapterSchema = Joi.object({
  chapterName: Joi.string().trim().required(),
  content: Joi.string().allow('', null),
  fileUrl: Joi.string().trim().allow('', null),
  image: Joi.string().trim().allow('', null),
  sortOrder: Joi.number().integer().min(0).default(0),
})

const createGrammarSchema = Joi.object({
  title: Joi.string().trim().required(),
  topicName: Joi.string().trim().required(),
  chapters: Joi.array().items(chapterSchema).default([]),
  sortOrder: Joi.number().integer().min(0).default(0),
  status: Joi.string().valid('active', 'inactive').default('active'),
  exam: Joi.array().items(Joi.string()).default([]),
  subjectIds: Joi.array().items(Joi.string()).default([]),
  categoryId: objectId.optional().allow(null, ''),
})

const updateGrammarSchema = Joi.object({
  title: Joi.string().trim(),
  topicName: Joi.string().trim(),
  chapters: Joi.array().items(chapterSchema),
  sortOrder: Joi.number().integer().min(0),
  status: Joi.string().valid('active', 'inactive'),
  exam: Joi.array().items(Joi.string()),
  subjectIds: Joi.array().items(Joi.string()),
  categoryId: objectId.optional().allow(null, ''),
}).min(1)

const listGrammarQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive'),
  title: Joi.string().trim().max(200),
  topicName: Joi.string().trim().max(200),
  search: Joi.string().trim().max(200),
  categoryId: objectId.optional(),
  sortBy: Joi.string().valid('sortOrder', 'title', 'topicName', 'status', 'createdAt', 'updatedAt').default('sortOrder'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  topicSortOrder: Joi.string().valid('asc', 'desc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(true)

module.exports = { createGrammarSchema, updateGrammarSchema, listGrammarQuerySchema }
