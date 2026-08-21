const Joi = require('joi')

const VALID_STATUS = ['active', 'inactive']
const VALID_DISCOUNT_TYPES = ['percentage', 'flat']

const createCouponSchema = Joi.object({
  code: Joi.string().trim().uppercase().min(3).max(50).required(),
  discountType: Joi.string().valid(...VALID_DISCOUNT_TYPES).required(),
  discountValue: Joi.number().min(0).required(),
  maxDiscount: Joi.number().min(0).allow(null).default(null),
  minOrderAmount: Joi.number().min(0).default(0),
  startDate: Joi.date().allow(null).default(null),
  endDate: Joi.date().allow(null).default(null),
  usageLimit: Joi.number().integer().min(1).allow(null).default(null),
  userLimit: Joi.number().integer().min(1).default(1),
  status: Joi.string().valid(...VALID_STATUS).default('active'),
  description: Joi.string().trim().max(1000).allow('').default(''),
})

const updateCouponSchema = Joi.object({
  code: Joi.string().trim().uppercase().min(3).max(50),
  discountType: Joi.string().valid(...VALID_DISCOUNT_TYPES),
  discountValue: Joi.number().min(0),
  maxDiscount: Joi.number().min(0).allow(null),
  minOrderAmount: Joi.number().min(0),
  startDate: Joi.date().allow(null),
  endDate: Joi.date().allow(null),
  usageLimit: Joi.number().integer().min(1).allow(null),
  userLimit: Joi.number().integer().min(1),
  status: Joi.string().valid(...VALID_STATUS),
  description: Joi.string().trim().max(1000).allow(''),
}).min(1)

const listCouponQuerySchema = Joi.object({
  status: Joi.string().valid(...VALID_STATUS),
  search: Joi.string().trim().allow(''),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'code', 'discountValue', 'usageCount').default('createdAt'),
  sortOrder: Joi.number().valid(1, -1).default(-1),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).default(20),
}).unknown(true)

module.exports = {
  VALID_STATUS,
  VALID_DISCOUNT_TYPES,
  createCouponSchema,
  updateCouponSchema,
  listCouponQuerySchema
}
