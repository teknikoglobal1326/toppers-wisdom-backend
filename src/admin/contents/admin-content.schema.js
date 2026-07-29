const Joi = require('joi')

const createContentSchema = Joi.object({
  course: Joi.string().hex().length(24).required(),
  courseId: Joi.string().hex().length(24).optional(),
  subject: Joi.alternatives().try(Joi.array().items(Joi.string().hex().length(24)), Joi.string().hex().length(24)).optional(),
  subjectId: Joi.alternatives().try(Joi.array().items(Joi.string().hex().length(24)), Joi.string().hex().length(24)).optional(),
  topic: Joi.alternatives().try(Joi.array().items(Joi.string().hex().length(24)), Joi.string().hex().length(24)).required(),
  topicId: Joi.alternatives().try(Joi.array().items(Joi.string().hex().length(24)), Joi.string().hex().length(24)).optional(),
  chapter: Joi.alternatives().try(Joi.array().items(Joi.string().hex().length(24)), Joi.string().hex().length(24), Joi.string().allow('', null)).optional(),
  title: Joi.string().trim().required(),
  sortOrder: Joi.number().integer().min(0).default(0),
  description: Joi.string().trim().optional().allow('', null),
  video: Joi.string().trim().required(),
  image: Joi.string().trim().optional().allow('', null),
  status: Joi.string().valid('active', 'inactive').default('active'),
  scheduleAt: Joi.date().optional().allow('', null),
})

const createLiveClassSchema = Joi.object({
  course: Joi.string().hex().length(24).required(),
  courseId: Joi.string().hex().length(24).optional(),
  subject: Joi.alternatives().try(Joi.array().items(Joi.string().hex().length(24)), Joi.string().hex().length(24)).optional(),
  subjectId: Joi.alternatives().try(Joi.array().items(Joi.string().hex().length(24)), Joi.string().hex().length(24)).optional(),
  topic: Joi.alternatives().try(Joi.array().items(Joi.string().hex().length(24)), Joi.string().hex().length(24)).required(),
  topicId: Joi.alternatives().try(Joi.array().items(Joi.string().hex().length(24)), Joi.string().hex().length(24)).optional(),
  chapter: Joi.alternatives().try(Joi.array().items(Joi.string().hex().length(24)), Joi.string().hex().length(24), Joi.string().allow('', null)).optional(),
  title: Joi.string().trim().required(),
  sortOrder: Joi.number().integer().min(0).default(0),
  description: Joi.string().trim().optional().allow('', null),
  scheduledStartTime: Joi.date().iso().required(),
  scheduledEndTime: Joi.date().iso().min(Joi.ref('scheduledStartTime')).optional(),
  status: Joi.string().valid('active', 'inactive').default('active'),
  restreamUrls: Joi.alternatives().try(Joi.array().items(Joi.string().allow('')), Joi.string().allow('')).optional(),
  agoraConverters: Joi.alternatives().try(Joi.array().items(Joi.string().allow('')), Joi.string().allow('')).optional(),
})
const updateContentSchema = Joi.object({
  course: Joi.string().hex().length(24).optional(),
  courseId: Joi.string().hex().length(24).optional(),
  subject: Joi.alternatives().try(Joi.array().items(Joi.string().hex().length(24)), Joi.string().hex().length(24)).optional(),
  subjectId: Joi.alternatives().try(Joi.array().items(Joi.string().hex().length(24)), Joi.string().hex().length(24)).optional(),
  topic: Joi.alternatives().try(Joi.array().items(Joi.string().hex().length(24)), Joi.string().hex().length(24)).optional(),
  topicId: Joi.alternatives().try(Joi.array().items(Joi.string().hex().length(24)), Joi.string().hex().length(24)).optional(),
  chapter: Joi.alternatives().try(Joi.array().items(Joi.string().hex().length(24)), Joi.string().hex().length(24), Joi.string().allow('', null)).optional(),
  title: Joi.string().trim(),
  sortOrder: Joi.number().integer().min(0),
  description: Joi.string().trim().optional().allow('', null),
  video: Joi.string().trim(),
  image: Joi.string().trim().optional().allow('', null),
  status: Joi.string().valid('active', 'inactive'),
  scheduleAt: Joi.date().optional().allow('', null),
}).min(1)

const listContentQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive'),
  course: Joi.string().hex().length(24),
  topic: Joi.string().hex().length(24),
  search: Joi.string().trim().max(200),
  sortBy: Joi.string().valid('createdAt', 'sortOrder').default('sortOrder'),
  order: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
})

const updateLiveClassSchema = Joi.object({
  course: Joi.string().hex().length(24).optional(),
  courseId: Joi.string().hex().length(24).optional(),
  subject: Joi.alternatives().try(Joi.array().items(Joi.string().hex().length(24)), Joi.string().hex().length(24)).optional(),
  subjectId: Joi.alternatives().try(Joi.array().items(Joi.string().hex().length(24)), Joi.string().hex().length(24)).optional(),
  topic: Joi.alternatives().try(Joi.array().items(Joi.string().hex().length(24)), Joi.string().hex().length(24)).optional(),
  topicId: Joi.alternatives().try(Joi.array().items(Joi.string().hex().length(24)), Joi.string().hex().length(24)).optional(),
  chapter: Joi.alternatives().try(Joi.array().items(Joi.string().hex().length(24)), Joi.string().hex().length(24), Joi.string().allow('', null)).optional(),
  title: Joi.string().trim(),
  sortOrder: Joi.number().integer().min(0),
  description: Joi.string().trim().optional().allow('', null),
  image: Joi.string().trim().optional().allow('', null),
  scheduledStartTime: Joi.date().iso().optional(),
  scheduledEndTime: Joi.date().iso().min(Joi.ref('scheduledStartTime')).optional(),
  status: Joi.string().valid('active', 'inactive'),
  restreamUrls: Joi.alternatives().try(Joi.array().items(Joi.string().allow('')), Joi.string().allow('')).optional(),
  agoraConverters: Joi.alternatives().try(Joi.array().items(Joi.string().allow('')), Joi.string().allow('')).optional(),
}).min(1)

const bulkCreateContentSchema = Joi.array().items(
  Joi.object({
    course: Joi.string().hex().length(24).required(),
    subject: Joi.array().items(Joi.string().hex().length(24)).optional(),
    topic: Joi.array().items(Joi.string().hex().length(24)).required(),
    chapter: Joi.array().items(Joi.string().hex().length(24)).optional(),
    title: Joi.string().trim().required(),
    sortOrder: Joi.number().integer().min(0).default(0),
    description: Joi.string().trim().optional().allow('', null),
    video: Joi.string().trim().required(),
    image: Joi.string().trim().optional().allow('', null),
    status: Joi.string().valid('active', 'inactive').default('active'),
    isLive: Joi.boolean().default(false),
    scheduledStartTime: Joi.date().optional().allow(null, ''),
    scheduledEndTime: Joi.date().optional().allow(null, ''),
    scheduleAt: Joi.date().optional().allow(null, ''),
  })
).min(1)

module.exports = {
  createContentSchema,
  createLiveClassSchema,
  updateContentSchema,
  listContentQuerySchema,
  updateLiveClassSchema,
  bulkCreateContentSchema
}
