const Joi = require('joi')

const createLiveTestSeriesSchema = Joi.object({
    title: Joi.string().trim().required(),
    description: Joi.string().optional().allow(null, ''),
    thumbnail: Joi.string().optional().allow(null, ''),
    isPaid: Joi.boolean().optional().default(false),
    status: Joi.string().valid('active', 'inactive').optional().default('active'),
})

const updateLiveTestSeriesSchema = Joi.object({
    title: Joi.string().trim(),
    description: Joi.string().optional().allow(null, ''),
    thumbnail: Joi.string().optional().allow(null, ''),
    isPaid: Joi.boolean().optional(),
    status: Joi.string().valid('active', 'inactive').optional(),
}).min(1)

module.exports = { createLiveTestSeriesSchema, updateLiveTestSeriesSchema }
