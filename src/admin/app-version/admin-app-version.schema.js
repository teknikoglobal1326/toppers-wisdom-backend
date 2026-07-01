const Joi = require('joi')

const PLATFORMS = ['android', 'ios']

const semver = Joi.string()
  .pattern(/^\d+\.\d+\.\d+$/)
  .messages({ 'string.pattern.base': '{{#label}} must be a valid version like 1.2.3' })

const updateAppVersionSchema = Joi.object({
  latestVersion: semver.required().label('latestVersion'),
  minVersion:    semver.required().label('minVersion'),
  forceUpdate:   Joi.boolean().default(false),
  releaseNotes:  Joi.string().max(1000).allow('', null).default(''),
  storeUrl:      Joi.string().uri().allow('', null).default('')
    .messages({ 'string.uri': 'storeUrl must be a valid URL' }),
})

module.exports = { updateAppVersionSchema, PLATFORMS }
