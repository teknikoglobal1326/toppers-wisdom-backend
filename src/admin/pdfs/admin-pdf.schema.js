const Joi = require('joi')

const createPdfSchema = Joi.object({
  course: Joi.string().hex().length(24).optional(),
  courseId: Joi.string().hex().length(24).optional(),
  subjects: Joi.array().items(Joi.string().hex().length(24)).optional(),
  topics: Joi.array().items(Joi.string().hex().length(24)).optional(),
  chapters: Joi.array().items(Joi.string().hex().length(24)).optional(),
  masterIds: Joi.array().items(
    Joi.object({
      courseId: Joi.string().hex().length(24).required(),
      subjectId: Joi.string().hex().length(24).optional().allow(null, '', 'null', 'undefined'),
      chapterId: Joi.string().hex().length(24).optional().allow(null, '', 'null', 'undefined'),
      topicId: Joi.string().hex().length(24).required(),
    })
  ).optional(),
  title: Joi.string().trim().required(),
  description: Joi.string().trim().optional().allow('', null),
  pdfFile: Joi.string().trim().required(),
  image: Joi.string().trim().optional().allow('', null),
  sortOrder: Joi.number().integer().min(0).default(0),
  instruction: Joi.string().trim().optional().allow('', null),
  status: Joi.string().valid('active', 'inactive').default('active'),
  scheduleAt: Joi.date().optional().allow('', null),
  scheduledStartTime: Joi.date().optional().allow('', null),
  scheduledEndTime: Joi.date().optional().allow('', null),
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
  scheduleAt: Joi.date().optional().allow('', null),
  scheduledStartTime: Joi.date().optional().allow('', null),
  scheduledEndTime: Joi.date().optional().allow('', null),
}).min(1)

const listPdfQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive'),
  course: Joi.string().hex().length(24),
  subject: Joi.string().hex().length(24),
  topic: Joi.string().hex().length(24),
  chapter: Joi.string().hex().length(24),
  search: Joi.string().trim().max(200),
  sortBy: Joi.string().valid('createdAt', 'sortOrder').default('createdAt'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
})

const assignPdfSchema = Joi.object({
  assignments: Joi.array().items(
    Joi.object({
      course: Joi.string().hex().length(24).required(),
      subjects: Joi.array().items(Joi.string().hex().length(24)).optional(),
      chapters: Joi.array().items(Joi.string().hex().length(24)).optional(),
      topics: Joi.array().items(Joi.string().hex().length(24)).optional(),
    })
  ).min(1).required()
})

const bulkCreatePdfSchema = Joi.array().items(createPdfSchema).min(1)

module.exports = { createPdfSchema, updatePdfSchema, listPdfQuerySchema, assignPdfSchema, bulkCreatePdfSchema }
