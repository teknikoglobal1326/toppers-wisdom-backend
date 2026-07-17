const Joi = require('joi')

const createPdfSchema = Joi.object({
  course: Joi.string().hex().length(24).required(),
  courseId: Joi.string().hex().length(24).optional(),
  subjects: Joi.array().items(Joi.string().hex().length(24)).optional(),
  topics: Joi.array().items(Joi.string().hex().length(24)).optional(),
  chapters: Joi.array().items(Joi.string().hex().length(24)).optional(),
  title: Joi.string().trim().required(),
  description: Joi.string().trim().optional().allow('', null),
  pdfFile: Joi.string().trim().required(),
  image: Joi.string().trim().optional().allow('', null),
  sortOrder: Joi.number().integer().min(0).default(0),
  instruction: Joi.string().trim().optional().allow('', null),
  status: Joi.string().valid('active', 'inactive').default('active'),
})

const updatePdfSchema = Joi.object({
  course: Joi.string().hex().length(24).optional(),
  courseId: Joi.string().hex().length(24).optional(),
  subjects: Joi.array().items(Joi.string().hex().length(24)).optional(),
  topics: Joi.array().items(Joi.string().hex().length(24)).optional(),
  chapters: Joi.array().items(Joi.string().hex().length(24)).optional(),
  title: Joi.string().trim(),
  description: Joi.string().trim().optional().allow('', null),
  pdfFile: Joi.string().trim(),
  image: Joi.string().trim().optional().allow('', null),
  sortOrder: Joi.number().integer().min(0),
  instruction: Joi.string().trim().optional().allow('', null),
  status: Joi.string().valid('active', 'inactive'),
}).min(1)

const listPdfQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive'),
  course: Joi.string().hex().length(24),
  subject: Joi.string().hex().length(24),
  topic: Joi.string().hex().length(24),
  chapter: Joi.string().hex().length(24),
  search: Joi.string().trim().max(200),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
})

module.exports = { createPdfSchema, updatePdfSchema, listPdfQuerySchema }
