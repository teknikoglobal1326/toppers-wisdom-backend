const Joi = require('joi')

const listBooksSchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(20),
  section: Joi.string().valid('eBooks', 'books', 'audioBooks').optional(),
  q: Joi.string().trim().optional().allow('', null),
  isFree: Joi.boolean().optional(),
})

module.exports = { listBooksSchema }
