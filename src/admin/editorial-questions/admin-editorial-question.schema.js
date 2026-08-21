const Joi = require('joi')

const objectId = Joi.string().hex().length(24)

const langValueSchema = Joi.object({
  text: Joi.string().allow('', null),
  image: Joi.string().allow('', null),
})

const localizedSchema = Joi.object({
  en: langValueSchema,
  hi: langValueSchema,
})

const optionSchema = Joi.object({
  text: Joi.string().trim().optional().allow('', null),
  image: Joi.string().trim().optional().allow('', null),
  isCorrect: Joi.boolean().optional(),
})

const languageQuestionSchema = Joi.object({
  question: langValueSchema.optional(),
  options: Joi.array().items(optionSchema).optional(),
  explanation: langValueSchema.optional(),
})

const createEditorialQuestionSchema = Joi.object({
  test: objectId.allow('', null),
  testId: objectId.allow('', null),
  subject: objectId.allow('', null),
  subjectId: objectId.allow('', null),
  chapter: objectId.allow('', null),
  chapterId: objectId.allow('', null),
  topic: objectId.allow('', null),
  topicId: objectId.allow('', null),
  exam: objectId.allow('', null),
  examId: objectId.allow('', null),
  subExams: Joi.array().items(objectId).optional(),
  subExamIds: Joi.alternatives().try(Joi.array().items(objectId), Joi.string()).optional(),
  question: localizedSchema.optional(),
  options: Joi.array().items(localizedSchema).optional(),
  correctOption: Joi.number().integer().min(0).max(3).optional(),
  explanation: localizedSchema.optional(),
  en: languageQuestionSchema.optional(),
  hi: languageQuestionSchema.optional(),
  marks: Joi.number().min(0).optional(),
  negativeMarks: Joi.number().min(0).optional(),
  difficulty: Joi.string().valid('easy', 'medium', 'hard').optional(),
  perQuestionTime: Joi.number().integer().min(1).optional().allow(null, ''),
  order: Joi.number().integer().min(1).optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
})

const updateEditorialQuestionSchema = createEditorialQuestionSchema.min(1)

const listEditorialQuestionQuerySchema = Joi.object({
  test: objectId,
  testId: objectId,
  subject: objectId,
  subjectId: objectId,
  chapter: objectId,
  chapterId: objectId,
  topic: objectId,
  topicId: objectId,
  status: Joi.string().valid('active', 'inactive'),
  lang: Joi.string().valid('hi', 'en'),
  search: Joi.string().trim().allow(''),
  sortBy: Joi.string().valid('sortOrder', 'order', 'createdAt', 'updatedAt').default('sortOrder'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(true)

module.exports = {
  createEditorialQuestionSchema,
  updateEditorialQuestionSchema,
  listEditorialQuestionQuerySchema,
}