const Joi = require('joi')

const CMS_TYPES = ['termCondition', 'privacyPolicy', 'aboutUs']

const updateCmsSchema = Joi.object({
  content: Joi.string().min(1).max(500000).required()
    .messages({
      'string.empty': 'Content is required',
      'any.required': 'Content is required',
      'string.max': 'Content is too large',
    }),
})

module.exports = { updateCmsSchema, CMS_TYPES }
