const Joi = require('joi')

const VALID_TYPES = ['pyp_dictionary', 'daily_vocab']
const VALID_STATUS = ['draft', 'active', 'inactive']

const createVocabularySchema = Joi.object({
    title: Joi.string().trim().min(2).max(300).required(),
    type: Joi.string().valid(...VALID_TYPES).required(),
    word: Joi.string().trim().min(1).max(200).required(),
    pronunciation: Joi.string().max(200).allow(''),
    audio: Joi.string().max(500).allow(''),
    thumbnail: Joi.string().max(500).required(),
    bannerImage: Joi.string().max(500).allow(''),
    shortDescription: Joi.string().max(1000).allow(''),
    longDescription: Joi.string().max(200000).allow(''),
    usages: Joi.array().items(Joi.string().max(500)).max(100).default([]),
    synonyms: Joi.array().items(Joi.string().max(100)).max(100).default([]),
    antonyms: Joi.array().items(Joi.string().max(100)).max(100).default([]),
    publishDate: Joi.date(),
    sortOrder: Joi.number().integer().min(0).default(0),
    status: Joi.string().valid(...VALID_STATUS).default('draft'),
})

const updateVocabularySchema = Joi.object({
    title: Joi.string().trim().min(2).max(300),
    type: Joi.string().valid(...VALID_TYPES),
    word: Joi.string().trim().min(1).max(200),
    pronunciation: Joi.string().max(200).allow(''),
    audio: Joi.string().max(500).allow(''),
    thumbnail: Joi.string().max(500),
    bannerImage: Joi.string().max(500).allow(''),
    shortDescription: Joi.string().max(1000).allow(''),
    longDescription: Joi.string().max(200000).allow(''),
    usages: Joi.array().items(Joi.string().max(500)).max(100),
    synonyms: Joi.array().items(Joi.string().max(100)).max(100),
    antonyms: Joi.array().items(Joi.string().max(100)).max(100),
    publishDate: Joi.date(),
    sortOrder: Joi.number().integer().min(0),
    status: Joi.string().valid(...VALID_STATUS),
}).min(1)

const listVocabularyQuerySchema = Joi.object({
    type: Joi.string().valid(...VALID_TYPES),
    status: Joi.string().valid(...VALID_STATUS),
    word: Joi.string().trim().allow(''),
    search: Joi.string().trim().allow(''),
    sortBy: Joi.string().valid('sortOrder', 'publishDate', 'createdAt', 'updatedAt', 'title').default('sortOrder'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(true)

module.exports = { VALID_TYPES, createVocabularySchema, updateVocabularySchema, listVocabularyQuerySchema }