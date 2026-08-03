const Joi = require('joi')

const optionSchema = Joi.object({
  text: Joi.string().trim().optional().allow('', null),
  image: Joi.string().trim().optional().allow('', null),
  isCorrect: Joi.boolean().required(),
})

const questionPayloadSchema = Joi.object({
  text: Joi.string().trim().optional().allow('', null),
  image: Joi.string().trim().optional().allow('', null),
}).custom((value, helpers) => {
  if (!value.text?.trim() && !value.image) {
    return helpers.message('Question must have text or image')
  }
  return value
})

const explanationPayloadSchema = Joi.object({
  text: Joi.string().trim().optional().allow('', null),
  image: Joi.string().trim().optional().allow('', null),
})

const languageQuestionSchema = Joi.object({
  question: questionPayloadSchema.required(),
  options: Joi.array().items(optionSchema).length(4).required(),
  explanation: explanationPayloadSchema.optional().default({}),
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

const createQuestionSchema = Joi.object({
  test: Joi.string().hex().length(24).required(),
  testId: Joi.string().hex().length(24).optional(),
  subjectId: Joi.string().hex().length(24).optional().allow(null, ''),
  chapterId: Joi.string().hex().length(24).optional().allow(null, ''),
  topicId: Joi.string().hex().length(24).optional().allow(null, ''),
  en: languageQuestionSchema.required(),
  hi: languageQuestionSchema.required(),
  order: Joi.number().integer().min(1).optional(),
  perQuestionTime: Joi.number().integer().min(1).optional().allow(null),
  marks: Joi.number().min(0).default(1),
  negativeMarks: Joi.number().min(0).default(0),
  sortOrder: Joi.number().integer().min(0).default(0),
  status: Joi.string().valid('active', 'inactive').default('active'),
  difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium'),
  createdBy: Joi.string().hex().length(24).optional().allow(null, ''),
  exam: Joi.string().hex().length(24).optional().allow(null, ''),
  examId: Joi.string().hex().length(24).optional().allow(null, ''),
  subExams: Joi.array().items(Joi.string().hex().length(24)).optional(),
  subExamIds: Joi.alternatives().try(Joi.array().items(Joi.string().hex().length(24)), Joi.string()).optional(),
})

const languageQuestionUpdateSchema = Joi.object({
  question: questionPayloadSchema.optional(),
  options: Joi.array().items(optionSchema).length(4).optional(),
  explanation: explanationPayloadSchema.optional(),
}).custom((value, helpers) => {
  if (value.options) {
    const hasText = value.options.some((opt) => opt.text && opt.text.trim())
    const hasImage = value.options.some((opt) => opt.image)

    if (!hasText && !hasImage) {
      return helpers.message('Each option must have text or image')
    }

    const correctCount = value.options.filter((opt) => opt.isCorrect).length || 0
    if (correctCount !== 1) {
      return helpers.message('Exactly one correct answer is required')
    }
  }
  return value
})

const updateQuestionSchema = Joi.object({
  test: Joi.string().hex().length(24).optional(),
  testId: Joi.string().hex().length(24).optional(),
  subjectId: Joi.string().hex().length(24).optional().allow(null, ''),
  chapterId: Joi.string().hex().length(24).optional().allow(null, ''),
  topicId: Joi.string().hex().length(24).optional().allow(null, ''),
  en: languageQuestionUpdateSchema.optional(),
  hi: languageQuestionUpdateSchema.optional(),
  order: Joi.number().integer().min(1).optional(),
  perQuestionTime: Joi.number().integer().min(1).optional().allow(null),
  marks: Joi.number().min(0).optional(),
  negativeMarks: Joi.number().min(0).optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
  difficulty: Joi.string().valid('easy', 'medium', 'hard').optional(),
  createdBy: Joi.string().hex().length(24).optional().allow(null, ''),
  exam: Joi.string().hex().length(24).optional().allow(null, ''),
  examId: Joi.string().hex().length(24).optional().allow(null, ''),
  subExams: Joi.array().items(Joi.string().hex().length(24)).optional(),
  subExamIds: Joi.alternatives().try(Joi.array().items(Joi.string().hex().length(24)), Joi.string()).optional(),
}).min(1)

const listQuestionQuerySchema = Joi.object({
  test: Joi.string().hex().length(24),
  status: Joi.string().valid('active', 'inactive'),
  search: Joi.string().trim().max(200),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(true)

module.exports = { createQuestionSchema, updateQuestionSchema, listQuestionQuerySchema }
