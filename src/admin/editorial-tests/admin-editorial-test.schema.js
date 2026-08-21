const Joi = require('joi')

const objectId = Joi.string().hex().length(24).allow('', null)
const STATUS_VALUES = ['active', 'inactive', 'draft', 'published']

const localizedBlock = Joi.object({
  title: Joi.string().trim().required(),
  description: Joi.string().optional().allow(null, ''),
  instructions: Joi.string().optional().allow(null, ''),
})

const baseSchema = {
  title: Joi.string().trim().optional().allow(null, ''),
  slug: Joi.string().trim().lowercase().optional().allow(null, ''),
  description: Joi.string().optional().allow(null, ''),
  instructions: Joi.string().optional().allow(null, ''),
  instructionsNew: Joi.string().trim().optional().allow(null, ''),
  duration: Joi.number().integer().min(0).optional().default(0),
  isPerQuestionTime: Joi.boolean().optional().default(true),
  totalQuestions: Joi.number().integer().min(0).optional().default(0),
  mappedQuestions: Joi.number().integer().min(0).optional().default(0),
  totalMappedQuestions: Joi.number().integer().min(0).optional().default(0),
  totalMarks: Joi.number().min(0).optional().default(0),
  marksPerQuestion: Joi.number().min(0).optional().default(1),
  isNegativeMarking: Joi.boolean().optional().default(false),
  negativeMarks: Joi.number().min(0).optional().default(0),
  passingMarks: Joi.number().min(0).optional().default(0),
  thumbnail: Joi.string().optional().allow(null, ''),
  thumbnailImage: Joi.string().optional().allow(null, ''),
  isPaid: Joi.boolean().optional().default(false),
  isFree: Joi.boolean().optional().default(true),
  status: Joi.string().valid(...STATUS_VALUES).optional().default('active'),
  languages: Joi.array().items(Joi.string().valid('en', 'hi')).min(1).unique().optional(),
  language: Joi.string().valid('en', 'hi').optional(),
  en: localizedBlock.optional(),
  hi: localizedBlock.optional(),
  scheduleAt: Joi.date().optional().allow(null, ''),
  sortOrder: Joi.number().integer().min(0).optional().default(0),
}

const requireSomeTitle = (value, helpers) => {
  const hasTitle = Boolean(value.title || value.en?.title || value.hi?.title)
  if (!hasTitle) return helpers.message('A title is required')
  return value
}

const createEditorialTestSchema = Joi.object({
  editorial: objectId,
  editorialId: objectId,
  exam: Joi.array().items(objectId).single().default([]),
  examIds: Joi.array().items(objectId).single().default([]),
  subExam: Joi.array().items(objectId).single().default([]),
  subexamIds: Joi.array().items(objectId).single().default([]),
  subjects: Joi.array().items(objectId).single().default([]),
  subjectIds: Joi.array().items(objectId).single().default([]),
  chapterIds: Joi.array().items(objectId).single().default([]),
  topicIds: Joi.array().items(objectId).single().default([]),
  ...baseSchema,
}).custom(requireSomeTitle)

const updateEditorialTestSchema = Joi.object({
  editorial: objectId,
  editorialId: objectId,
  exam: Joi.array().items(objectId).single(),
  examIds: Joi.array().items(objectId).single(),
  subExam: Joi.array().items(objectId).single(),
  subexamIds: Joi.array().items(objectId).single(),
  subjects: Joi.array().items(objectId).single(),
  subjectIds: Joi.array().items(objectId).single(),
  chapterIds: Joi.array().items(objectId).single(),
  topicIds: Joi.array().items(objectId).single(),
  title: Joi.string().trim().optional().allow(null, ''),
  slug: Joi.string().trim().lowercase().optional().allow(null, ''),
  description: Joi.string().optional().allow(null, ''),
  instructions: Joi.string().optional().allow(null, ''),
  instructionsNew: Joi.string().trim().optional().allow(null, ''),
  duration: Joi.number().integer().min(0).optional(),
  isPerQuestionTime: Joi.boolean().optional(),
  totalQuestions: Joi.number().integer().min(0).optional(),
  mappedQuestions: Joi.number().integer().min(0).optional(),
  totalMappedQuestions: Joi.number().integer().min(0).optional(),
  totalMarks: Joi.number().min(0).optional(),
  marksPerQuestion: Joi.number().min(0).optional(),
  isNegativeMarking: Joi.boolean().optional(),
  negativeMarks: Joi.number().min(0).optional(),
  passingMarks: Joi.number().min(0).optional(),
  thumbnail: Joi.string().optional().allow(null, ''),
  thumbnailImage: Joi.string().optional().allow(null, ''),
  isPaid: Joi.boolean().optional(),
  isFree: Joi.boolean().optional(),
  status: Joi.string().valid(...STATUS_VALUES).optional(),
  languages: Joi.array().items(Joi.string().valid('en', 'hi')).min(1).unique().optional(),
  language: Joi.string().valid('en', 'hi').optional(),
  en: localizedBlock.optional(),
  hi: localizedBlock.optional(),
  scheduleAt: Joi.date().optional().allow(null, ''),
  sortOrder: Joi.number().integer().min(0).optional(),
}).min(1)

const listEditorialTestQuerySchema = Joi.object({
  status: Joi.string().valid(...STATUS_VALUES),
  isFree: Joi.boolean(),
  isPaid: Joi.boolean(),
  subject: Joi.string().hex().length(24),
  editorial: Joi.string().hex().length(24),
  search: Joi.string().trim().allow(''),
  sortBy: Joi.string().valid('sortOrder', 'duration', 'totalQuestions', 'createdAt', 'updatedAt', 'title').default('sortOrder'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(true)

module.exports = { createEditorialTestSchema, updateEditorialTestSchema, listEditorialTestQuerySchema }