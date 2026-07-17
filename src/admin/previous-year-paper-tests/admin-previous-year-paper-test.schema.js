const Joi = require('joi')

const objectId = Joi.string().hex().length(24)

// Per-language content block. Optional nested `en` / `hi` objects in the body.
// When a block is sent it must carry a title; description/instructions are optional.
const localizedBlock = Joi.object({
    title: Joi.string().trim().required(),
    description: Joi.string().optional().allow(null, ''),
    instructions: Joi.string().optional().allow(null, ''),
})

// Non-content (language-agnostic) fields shared by create/update.
// Language handling is intentionally lenient: `languages` is optional and defaults
// to English in the controller. The flat title/description/instructions (English,
// what the current UI sends) and the legacy scalar `language` are both tolerated
// so nothing breaks while the dual-language UI is being rolled out.
const baseSchema = {
    title: Joi.string().trim().optional().allow(null, ''),
    description: Joi.string().optional().allow(null, ''),
    instructions: Joi.string().optional().allow(null, ''),
    duration: Joi.number().integer().min(1).required(),
    isPerQuestionTime: Joi.boolean().optional().default(true),
    totalQuestions: Joi.number().integer().min(1).required(),
    totalMarks: Joi.number().min(0).required(),
    marksPerQuestion: Joi.number().min(0).required(),
    negativeMarks: Joi.number().min(0).required(),
    passingMarks: Joi.number().min(0).required(),
    thumbnail: Joi.string().optional().allow(null, ''),
    isPaid: Joi.boolean().optional().default(false),
    status: Joi.string().valid('active', 'inactive').optional().default('active'),
    languages: Joi.array().items(Joi.string().valid('en', 'hi')).min(1).unique().optional(),
    language: Joi.string().valid('en', 'hi').optional(), // legacy scalar, mapped to languages in controller
    en: localizedBlock.optional(),
    hi: localizedBlock.optional(),
}

// A title must exist somewhere — flat, or inside a language block. Beyond that we
// don't force any language: a missing language just defaults to English.
const requireSomeTitle = (value, helpers) => {
    const hasTitle = Boolean(value.title || value.en?.title || value.hi?.title)
    if (!hasTitle) return helpers.message('A title is required')
    return value
}

const createPreviousYearPaperTestSchema = Joi.object({
    previousYearPaperId: objectId.required(),
    subjectIds: Joi.array().items(objectId).single().default([]),
    chapterIds: Joi.array().items(objectId).single().default([]),
    topicIds: Joi.array().items(objectId).single().default([]),
    ...baseSchema,
}).custom(requireSomeTitle)

const updatePreviousYearPaperTestSchema = Joi.object({
    previousYearPaperId: objectId.optional(),
    subjectIds: Joi.array().items(objectId).single().optional(),
    chapterIds: Joi.array().items(objectId).single().optional(),
    topicIds: Joi.array().items(objectId).single().optional(),
    title: Joi.string().trim().optional().allow(null, ''),
    description: Joi.string().optional().allow(null, ''),
    instructions: Joi.string().optional().allow(null, ''),
    duration: Joi.number().integer().min(1),
    isPerQuestionTime: Joi.boolean().optional(),
    totalQuestions: Joi.number().integer().min(1),
    totalMarks: Joi.number().min(0),
    marksPerQuestion: Joi.number().min(0),
    negativeMarks: Joi.number().min(0),
    passingMarks: Joi.number().min(0),
    thumbnail: Joi.string().optional().allow(null, ''),
    isPaid: Joi.boolean().optional(),
    status: Joi.string().valid('active', 'inactive').optional(),
    languages: Joi.array().items(Joi.string().valid('en', 'hi')).min(1).unique().optional(),
    language: Joi.string().valid('en', 'hi').optional(),
    en: localizedBlock.optional(),
    hi: localizedBlock.optional(),
}).min(1)

module.exports = { createPreviousYearPaperTestSchema, updatePreviousYearPaperTestSchema }
