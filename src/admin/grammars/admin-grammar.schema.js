const Joi = require('joi')

const chapterSchema = Joi.object({
  chapterName: Joi.string().trim().required(),
  pdf: Joi.string().trim().allow('', null),
  image: Joi.string().trim().allow('', null),
  sortOrder: Joi.number().integer().min(0).default(0),
})

const createGrammarSchema = Joi.object({
  title: Joi.string().trim().required(),
  topicName: Joi.string().trim().required(),
  chapters: Joi.array().items(chapterSchema).default([]),
  sortOrder: Joi.number().integer().min(0).default(0),
  status: Joi.string().valid('active', 'inactive').default('active'),
})

const updateGrammarSchema = Joi.object({
  title: Joi.string().trim(),
  topicName: Joi.string().trim(),
  chapters: Joi.array().items(chapterSchema),
  sortOrder: Joi.number().integer().min(0),
  status: Joi.string().valid('active', 'inactive'),
}).min(1)

const listGrammarQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive'),
  title: Joi.string().trim().max(200),
  topicName: Joi.string().trim().max(200),
  search: Joi.string().trim().max(200),
  sortBy: Joi.string().valid('sortOrder', 'title', 'topicName', 'status', 'createdAt', 'updatedAt').default('sortOrder'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  topicSortOrder: Joi.string().valid('asc', 'desc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(true)

module.exports = { createGrammarSchema, updateGrammarSchema, listGrammarQuerySchema }
