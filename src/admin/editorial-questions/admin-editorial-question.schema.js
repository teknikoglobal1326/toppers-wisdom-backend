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

const createEditorialQuestionSchema = Joi.object({
  test: objectId.allow('', null),
  testId: objectId.allow('', null),
  subject: objectId.allow('', null),
  subjectId: objectId.allow('', null),
  chapter: objectId.allow('', null),
  chapterId: objectId.allow('', null),
  topic: objectId.allow('', null),
  topicId: objectId.allow('', null),
  question: localizedSchema,
  options: Joi.array().items(localizedSchema).length(4),
  correctOption: Joi.number().integer().min(0).max(3),
  explanation: localizedSchema,
  sortOrder: Joi.number().integer().min(0),
  status: Joi.string().valid('active', 'inactive'),
})

const updateEditorialQuestionSchema = Joi.object({
  test: objectId.allow('', null),
  testId: objectId.allow('', null),
  subject: objectId.allow('', null),
  subjectId: objectId.allow('', null),
  chapter: objectId.allow('', null),
  chapterId: objectId.allow('', null),
  topic: objectId.allow('', null),
  topicId: objectId.allow('', null),
  question: localizedSchema,
  options: Joi.array().items(localizedSchema).length(4),
  correctOption: Joi.number().integer().min(0).max(3),
  explanation: localizedSchema,
  sortOrder: Joi.number().integer().min(0),
  status: Joi.string().valid('active', 'inactive'),
}).min(1)

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
  sortBy: Joi.string().valid('sortOrder', 'createdAt', 'updatedAt').default('sortOrder'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(true)

module.exports = {
  createEditorialQuestionSchema,
  updateEditorialQuestionSchema,
  listEditorialQuestionQuerySchema,
}