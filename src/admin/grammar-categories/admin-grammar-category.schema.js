const Joi = require('joi')

const createGrammarCategorySchema = Joi.object({
  name: Joi.string().trim().required().messages({
    'any.required': 'Name is required',
    'string.empty': 'Name cannot be empty'
  }),
  sortOrder: Joi.number().integer().optional().default(0),
  status: Joi.string().valid('active', 'inactive').optional().default('active')
})

const updateGrammarCategorySchema = Joi.object({
  name: Joi.string().trim().optional(),
  sortOrder: Joi.number().integer().optional(),
  status: Joi.string().valid('active', 'inactive').optional()
}).min(1)

const listGrammarCategoryQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive').optional(),
  search: Joi.string().trim().max(200).optional(),
  sortBy: Joi.string().valid('createdAt', 'name', 'sortOrder').optional().default('sortOrder'),
  sortOrder: Joi.string().valid('asc', 'desc').optional().default('asc'),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10)
}).unknown(true)

module.exports = {
  createGrammarCategorySchema,
  updateGrammarCategorySchema,
  listGrammarCategoryQuerySchema
}
