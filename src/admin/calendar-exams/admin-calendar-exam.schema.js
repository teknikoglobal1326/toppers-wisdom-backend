const Joi = require('joi')

const objectId = Joi.string().hex().length(24)

const createCalendarExamSchema = Joi.object({
  exams: Joi.array().items(objectId).optional().default([]),
  subExams: Joi.array().items(objectId).optional().default([]),
  title: Joi.string().trim().required().messages({
    'any.required': 'Title is required',
    'string.empty': 'Title cannot be empty'
  }),
  image: Joi.string().trim().optional().allow(null, ''),
  publishDate: Joi.date().optional(),
  sortOrder: Joi.number().integer().optional().default(0),
  status: Joi.string().valid('active', 'inactive').optional().default('active')
})

const updateCalendarExamSchema = Joi.object({
  exams: Joi.array().items(objectId).optional(),
  subExams: Joi.array().items(objectId).optional(),
  title: Joi.string().trim().optional(),
  image: Joi.string().trim().optional().allow(null, ''),
  publishDate: Joi.date().optional(),
  sortOrder: Joi.number().integer().optional(),
  status: Joi.string().valid('active', 'inactive').optional()
}).min(1)

const listCalendarExamQuerySchema = Joi.object({
  exam: objectId.optional(),
  exams: Joi.alternatives().try(Joi.array().items(objectId), objectId).optional(),
  subExams: Joi.alternatives().try(Joi.array().items(objectId), objectId).optional(),
  search: Joi.string().trim().max(200).optional(),
  sortBy: Joi.string().valid('createdAt', 'publishDate', 'title', 'sortOrder').optional().default('sortOrder'),
  sortOrder: Joi.string().valid('asc', 'desc').optional().default('asc'),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10)
}).unknown(true)

module.exports = {
  createCalendarExamSchema,
  updateCalendarExamSchema,
  listCalendarExamQuerySchema
}
