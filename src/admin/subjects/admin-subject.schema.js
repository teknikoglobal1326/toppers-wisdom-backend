const Joi = require('joi')

const chapterSchema = Joi.object({
  _id:       Joi.string().hex().length(24).optional(),
  name:      Joi.string().trim().required(),
  sortOrder: Joi.number().integer().min(0).default(0),
})

const topicSchema = Joi.object({
  _id:       Joi.string().hex().length(24).optional(),
  name:      Joi.string().trim().required(),
  sortOrder: Joi.number().integer().min(0).default(0),
  chapters:  Joi.array().items(chapterSchema).default([]),
})

const createSubjectSchema = Joi.object({
  subExamId: Joi.string().hex().length(24).required(),
  name:      Joi.string().trim().required(),
  sortOrder: Joi.number().integer().min(0).default(0),
  language:  Joi.string().valid('hi', 'en').default('en'),
  status:    Joi.string().valid('active', 'inactive').default('active'),
  topics:    Joi.array().items(topicSchema).default([]),
})

const updateSubjectSchema = Joi.object({
  subExamId: Joi.string().hex().length(24),
  name:      Joi.string().trim(),
  sortOrder: Joi.number().integer().min(0),
  language:  Joi.string().valid('hi', 'en'),
  status:    Joi.string().valid('active', 'inactive'),
  topics:    Joi.array().items(topicSchema),
}).min(1)

// ---- Dual creation schema disabled for now ----
// const createSubjectDualSchema = Joi.object({
//   hi: createSubjectSchema.required(),
//   en: createSubjectSchema.required(),
// })

const listSubjectQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive'),
  subExamId: Joi.string().hex().length(24),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(true)

module.exports = {
  createSubjectSchema,
  // createSubjectDualSchema,
  updateSubjectSchema,
  listSubjectQuerySchema,
}