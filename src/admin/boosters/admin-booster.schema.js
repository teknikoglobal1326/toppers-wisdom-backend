const Joi = require('joi')

const createBoosterSchema = Joi.object({
  exam:             Joi.string().hex().length(24).required()
                     .messages({ 'any.required': 'Exam is required', 'string.length': 'Invalid exam ID' }),
  subExam:          Joi.string().hex().length(24)
                     .messages({ 'string.length': 'Invalid subExam ID' }),
  type:             Joi.string().valid('vocabulary', 'editorial', 'grammar', 'math').required()
                     .messages({ 'any.required': 'Type is required', 'any.only': 'Type must be one of vocabulary, editorial, grammar, math' }),
  subType:          Joi.string().max(100),
  title:            Joi.string().min(2).max(300).required()
                     .messages({ 'any.required': 'Title is required', 'string.min': 'Title must be at least 2 characters' }),
  shortDescription: Joi.string().max(500),
  longDescription:  Joi.string().max(100000),
  // thumbnailImage:   Joi.string().max(500),
  bannerImage:      Joi.string().max(500),
  tag:              Joi.array().items(Joi.string().max(50)).max(20),
  file:             Joi.string().max(500),
  isFree:           Joi.boolean(),
  price:            Joi.number().min(0),
  mrp:              Joi.number().min(0),
  sortOrder:        Joi.number().integer().min(0),
  // language:         Joi.string().valid('hi', 'en', 'both'),
  isActive:         Joi.boolean(),
})

const updateBoosterSchema = createBoosterSchema.fork(
  ['exam', 'type', 'title'],
  (field) => field.optional()
)

module.exports = { createBoosterSchema, updateBoosterSchema }
