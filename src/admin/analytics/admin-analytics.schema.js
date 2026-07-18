const Joi = require('joi')

const analyticsListQuerySchema = Joi.object({
  search: Joi.string().trim().max(200).allow('', null),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  fromRank: Joi.number().integer().min(1).optional(),
  toRank: Joi.number().integer().min(1).optional(),
})

module.exports = { analyticsListQuerySchema }