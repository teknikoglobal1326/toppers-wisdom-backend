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
  language: Joi.string().valid('en', 'hi', 'both').default('both'),
  question: questionPayloadSchema.required(),
  options: Joi.array().items(optionSchema).length(4).required(),
  explanation: explanationPayloadSchema.optional(),
  order: Joi.number().integer().min(1).required(),
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
  question: questionPayloadSchema.optional(),
  options: Joi.array().items(optionSchema).length(4),
  explanation: explanationPayloadSchema.optional(),
  order: Joi.number().integer().min(1),
  status: Joi.string().valid('active', 'inactive'),
}).min(1)

module.exports = { createQuestionSchema, updateQuestionSchema }
