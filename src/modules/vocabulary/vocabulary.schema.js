const Joi = require('joi')

const VALID_TYPES = ['pyp_dictionary', 'daily_vocab']
const VALID_STATUS = ['draft', 'active', 'inactive']

const listVocabularyQuerySchema = Joi.object({
    type: Joi.string().valid(...VALID_TYPES),
    status: Joi.string().valid(...VALID_STATUS),
    listType: Joi.string().valid('unread', 'read', 'bookmarked', 'all').default('unread'),
    word: Joi.string().trim().allow(''),
    search: Joi.string().trim().allow(''),
    publishDate: Joi.date().iso(),
    sortBy: Joi.string().valid('sortOrder', 'publishDate', 'createdAt', 'updatedAt', 'title').default('sortOrder'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
    sortOrderDirection: Joi.string().valid('asc', 'desc'),
    publishDateDirection: Joi.string().valid('asc', 'desc'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(true)

const setBookmarkSchema = Joi.object({
    isBookmarked: Joi.boolean().default(true),
})

module.exports = { VALID_TYPES, VALID_STATUS, listVocabularyQuerySchema, setBookmarkSchema }