const Joi = require('joi')

const optionSchema = Joi.object({
  text: Joi.string().trim().optional().allow('', null),
  image: Joi.string().trim().optional().allow('', null),
  isCorrect: Joi.boolean().required(),
})

const questionPayloadSchema = Joi.object({
  text: Joi.string().trim().required(),
  image: Joi.string().trim().optional().allow('', null),
})

const explanationPayloadSchema = Joi.object({
  text: Joi.string().trim().optional().allow('', null),
  image: Joi.string().trim().optional().allow('', null),
})

const createQuestionSchema = Joi.object({
  test: Joi.string().hex().length(24).required(),
  testId: Joi.string().hex().length(24).optional(),
  language: Joi.string().valid('en', 'hi').default('en'),
  groupId: Joi.string().hex().length(24).optional(),
  subjectId: Joi.string().hex().length(24).optional().allow(null, ''),
  chapterId: Joi.string().hex().length(24).optional().allow(null, ''),
  topicId: Joi.string().hex().length(24).optional().allow(null, ''),
  question: questionPayloadSchema.required(),
  options: Joi.array().items(optionSchema).length(4).required(),
  explanation: explanationPayloadSchema.optional(),
  order: Joi.number().integer().min(1).optional(),
  perQuestionTime: Joi.number().integer().min(1).optional().allow(null),
  marks: Joi.number().min(0).default(1),
  negativeMarks: Joi.number().min(0).default(0),
  sortOrder: Joi.number().integer().min(0).default(0),
  status: Joi.string().valid('active', 'inactive').default('active'),
}).custom((value, helpers) => {
  const hasText = value.options?.some((opt) => opt.text && opt.text.trim())
  const hasImage = value.options?.some((opt) => opt.image)

  if (!hasText && !hasImage) {
    return helpers.message('Each option must have text or image')
  }

  const correctCount = value.options?.filter((opt) => opt.isCorrect).length || 0
  if (correctCount !== 1) {
    return helpers.message('Exactly one correct answer is required')
  }

  return value
})

const updateQuestionSchema = Joi.object({
  test: Joi.string().hex().length(24).optional(),
  testId: Joi.string().hex().length(24).optional(),
  language: Joi.string().valid('en', 'hi'),
  groupId: Joi.string().hex().length(24).optional(),
  subjectId: Joi.string().hex().length(24).optional().allow(null, ''),
  chapterId: Joi.string().hex().length(24).optional().allow(null, ''),
  topicId: Joi.string().hex().length(24).optional().allow(null, ''),
  question: questionPayloadSchema.optional(),
  options: Joi.array().items(optionSchema).length(4),
  explanation: explanationPayloadSchema.optional(),
  order: Joi.number().integer().min(1),
  perQuestionTime: Joi.number().integer().min(1).optional().allow(null),
  marks: Joi.number().min(0),
  negativeMarks: Joi.number().min(0),
  sortOrder: Joi.number().integer().min(0),
  status: Joi.string().valid('active', 'inactive'),
}).min(1)

const createQuestionDualSchema = Joi.object({
  hi: createQuestionSchema.required(),
  en: createQuestionSchema.required(),
})

const listQuestionQuerySchema = Joi.object({
  test: Joi.string().hex().length(24),
  status: Joi.string().valid('active', 'inactive'),
  language: Joi.string().valid('en', 'hi'),
  search: Joi.string().trim().max(200),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(true)

module.exports = { createQuestionSchema, createQuestionDualSchema, updateQuestionSchema, listQuestionQuerySchema }
