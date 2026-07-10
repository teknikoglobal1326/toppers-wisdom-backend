const Joi = require('joi')

const VALID_TYPES = ['pyp_dictionary', 'daily_vocab']
const VALID_STATUS = ['draft', 'active', 'inactive']

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

module.exports = { VALID_TYPES, VALID_STATUS, listVocabularyQuerySchema }