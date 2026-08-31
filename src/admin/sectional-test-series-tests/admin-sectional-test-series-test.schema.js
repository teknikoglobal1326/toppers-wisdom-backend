const Joi = require('joi')

const objectId = Joi.string().hex().length(24)

const localizedBlock = Joi.object({
    title: Joi.string().trim().required(),
    description: Joi.string().optional().allow(null, ''),
    instructions: Joi.string().optional().allow(null, ''),
})

const baseSchema = {
    title: Joi.string().trim().optional().allow(null, ''),
    description: Joi.string().optional().allow(null, ''),
    instructions: Joi.string().optional().allow(null, ''),
    instructionsNew: Joi.string().trim().optional().allow(null, ''),
    duration: Joi.number().integer().min(1).required(),
    isPerQuestionTime: Joi.boolean().optional().default(true),
    totalQuestions: Joi.number().integer().min(1).required(),
    totalMarks: Joi.number().min(0).required(),
    marksPerQuestion: Joi.number().min(0).required(),
    negativeMarks: Joi.number().min(0).required(),
    passingMarks: Joi.number().min(0).required(),
    thumbnail: Joi.string().optional().allow(null, ''),
    isPaid: Joi.boolean().optional().default(false),
    sortOrder: Joi.number().integer().min(0).optional().default(0),
    status: Joi.string().valid('active', 'inactive').optional().default('active'),
    languages: Joi.array().items(Joi.string().valid('en', 'hi')).min(1).unique().optional(),
    language: Joi.string().valid('en', 'hi').optional(),
    en: localizedBlock.optional(),
    hi: localizedBlock.optional(),
}

const requireSomeTitle = (value, helpers) => {
    const hasTitle = Boolean(value.title || value.en?.title || value.hi?.title)
    if (!hasTitle) return helpers.message('A title is required')
    return value
}

const createSectionalTestSeriesTestSchema = Joi.object({
    sectionalTestSeriesId: objectId.required(),
    subjectIds: Joi.array().items(objectId).single().default([]),
    chapterIds: Joi.array().items(objectId).single().default([]),
    topicIds: Joi.array().items(objectId).single().default([]),
    ...baseSchema,
}).custom(requireSomeTitle)

const updateSectionalTestSeriesTestSchema = Joi.object({
    sectionalTestSeriesId: objectId.optional(),
    subjectIds: Joi.array().items(objectId).single().optional(),
    chapterIds: Joi.array().items(objectId).single().optional(),
    topicIds: Joi.array().items(objectId).single().optional(),
    title: Joi.string().trim().optional().allow(null, ''),
    description: Joi.string().optional().allow(null, ''),
    instructions: Joi.string().optional().allow(null, ''),
    instructionsNew: Joi.string().trim().optional().allow(null, ''),
    duration: Joi.number().integer().min(1),
    isPerQuestionTime: Joi.boolean().optional(),
    totalQuestions: Joi.number().integer().min(1),
    totalMarks: Joi.number().min(0),
    marksPerQuestion: Joi.number().min(0),
    negativeMarks: Joi.number().min(0),
    passingMarks: Joi.number().min(0),
    thumbnail: Joi.string().optional().allow(null, ''),
    isPaid: Joi.boolean().optional(),
    sortOrder: Joi.number().integer().min(0).optional(),
    status: Joi.string().valid('active', 'inactive').optional(),
    languages: Joi.array().items(Joi.string().valid('en', 'hi')).min(1).unique().optional(),
    language: Joi.string().valid('en', 'hi').optional(),
    en: localizedBlock.optional(),
    hi: localizedBlock.optional(),
}).min(1)

const bulkCreateSectionalTestSeriesTestSchema = Joi.array().items(Joi.object({
    sectionalTestSeries: objectId.required(),
    subjectIds: Joi.array().items(objectId).single().default([]),
    chapterIds: Joi.array().items(objectId).single().default([]),
    topicIds: Joi.array().items(objectId).single().default([]),
    ...baseSchema,
    scheduleAt: Joi.date().optional().allow(null, ''),
}).custom(requireSomeTitle))

module.exports = { createSectionalTestSeriesTestSchema, updateSectionalTestSeriesTestSchema, bulkCreateSectionalTestSeriesTestSchema }
