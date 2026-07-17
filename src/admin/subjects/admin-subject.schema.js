const Joi = require('joi')

const topicSchema = Joi.object({
  _id:       Joi.string().hex().length(24).optional(),
  name:      Joi.string().trim().required(),
  sortOrder: Joi.number().integer().min(0).default(0),
})

const chapterSchema = Joi.object({
  _id:       Joi.string().hex().length(24).optional(),
  name:      Joi.string().trim().required(),
  sortOrder: Joi.number().integer().min(0).default(0),
  topics:    Joi.array().items(topicSchema).default([]),
})

const createSubjectSchema = Joi.object({
  examIds:    Joi.array().items(Joi.string().hex().length(24)).default([]),
  subExamIds: Joi.array().items(Joi.string().hex().length(24)).default([]),
  name:       Joi.string().trim().required(),
  sortOrder:  Joi.number().integer().min(0).default(0),
  language:   Joi.string().valid('hi', 'en').default('en'),
  status:     Joi.string().valid('active', 'inactive').default('active'),
  chapters:   Joi.array().items(chapterSchema).default([]),
})

const updateSubjectSchema = Joi.object({
  examIds:    Joi.array().items(Joi.string().hex().length(24)),
  subExamIds: Joi.array().items(Joi.string().hex().length(24)),
  name:       Joi.string().trim(),
  sortOrder:  Joi.number().integer().min(0),
  language:   Joi.string().valid('hi', 'en'),
  status:     Joi.string().valid('active', 'inactive'),
  chapters:   Joi.array().items(chapterSchema),
}).min(1)

// ---- Dual creation schema disabled for now ----
// const createSubjectDualSchema = Joi.object({
//   hi: createSubjectSchema.required(),
//   en: createSubjectSchema.required(),
// })

const listSubjectQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive'),
  examId: Joi.string().hex().length(24),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(20),
}).unknown(true)

module.exports = {
  createSubjectSchema,
  // createSubjectDualSchema,
  updateSubjectSchema,
  listSubjectQuerySchema,
}
