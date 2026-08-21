const Joi = require('joi')

const objectId = Joi.string().hex().length(24)

const createVocabSchema = Joi.object({
  editorailTest: Joi.array().items(objectId).min(1).required().messages({
    'any.required': 'Editorial Test is required',
    'array.min': 'At least one Editorial Test ID must be provided'
  }),
  title: Joi.string().trim().required().messages({
    'any.required': 'Title is required',
    'string.empty': 'Title cannot be empty'
  }),
  word: Joi.string().trim().required().messages({
    'any.required': 'Word is required',
    'string.empty': 'Word cannot be empty'
  }),
  pronunciation: Joi.string().trim().optional().allow(''),
  audio: Joi.string().trim().optional().allow(''),
  thumbnail: Joi.string().trim().required().messages({
    'any.required': 'Thumbnail image is required',
    'string.empty': 'Thumbnail cannot be empty'
  }),
  bannerImage: Joi.string().trim().optional().allow(''),
  shortDescription: Joi.string().trim().optional().allow(''),
  longDescription: Joi.string().trim().optional().allow(''),
  usages: Joi.array().items(Joi.string().trim()).optional().default([]),
  synonyms: Joi.array().items(Joi.string().trim()).optional().default([]),
  antonyms: Joi.array().items(Joi.string().trim()).optional().default([]),
  publishDate: Joi.date().optional(),
  sortOrder: Joi.number().integer().optional().default(0),
  status: Joi.string().valid('draft', 'active', 'inactive').optional().default('draft')
})

const updateVocabSchema = Joi.object({
  editorailTest: Joi.array().items(objectId).min(1).optional(),
  title: Joi.string().trim().optional(),
  word: Joi.string().trim().optional(),
  pronunciation: Joi.string().trim().optional().allow(''),
  audio: Joi.string().trim().optional().allow(''),
  thumbnail: Joi.string().trim().optional(),
  bannerImage: Joi.string().trim().optional().allow(''),
  shortDescription: Joi.string().trim().optional().allow(''),
  longDescription: Joi.string().trim().optional().allow(''),
  usages: Joi.array().items(Joi.string().trim()).optional(),
  synonyms: Joi.array().items(Joi.string().trim()).optional(),
  antonyms: Joi.array().items(Joi.string().trim()).optional(),
  publishDate: Joi.date().optional(),
  sortOrder: Joi.number().integer().optional(),
  status: Joi.string().valid('draft', 'active', 'inactive').optional()
}).min(1)

const listVocabQuerySchema = Joi.object({
  editorailTest: Joi.alternatives().try(Joi.array().items(objectId), objectId).optional(),
  editorialTest: Joi.alternatives().try(Joi.array().items(objectId), objectId).optional(),
  testId: Joi.alternatives().try(Joi.array().items(objectId), objectId).optional(),
  status: Joi.string().valid('draft', 'active', 'inactive').optional(),
  search: Joi.string().trim().max(200).optional(),
  sortBy: Joi.string().valid('sortOrder', 'createdAt', 'publishDate', 'word', 'title').optional().default('sortOrder'),
  sortOrder: Joi.string().valid('asc', 'desc').optional().default('asc'),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10)
}).unknown(true)

const importVocabSchema = Joi.object({
  vocabularyIds: Joi.array().items(objectId).min(1).required().messages({
    'any.required': 'Source vocabulary IDs are required',
    'array.min': 'Select at least one vocabulary to import'
  }),
  editorailTest: Joi.array().items(objectId).min(1).required().messages({
    'any.required': 'Target Editorial Test is required',
    'array.min': 'Must specify at least one target Editorial Test'
  }),
  publishDate: Joi.date().optional()
})

module.exports = {
  createVocabSchema,
  updateVocabSchema,
  listVocabQuerySchema,
  importVocabSchema
}
