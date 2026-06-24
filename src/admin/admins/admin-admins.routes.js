const router = require('express').Router()
const controller = require('./admin-admins.controller')
const { validate } = require('../../core/validate')
const Joi = require('joi')
const { MODULES } = require('../../models/Admin.model')

const createSchema = Joi.object({
  name:        Joi.string().min(2).required(),
  email:       Joi.string().email().required(),
  password:    Joi.string().min(8).required(),
  role:        Joi.string().valid('superadmin', 'manager', 'editor', 'viewer').required(),
  permissions: Joi.array().items(Joi.string().valid(...MODULES)).optional(),
})

const updateSchema = Joi.object({
  name:        Joi.string().min(2),
  role:        Joi.string().valid('superadmin', 'manager', 'editor', 'viewer'),
  permissions: Joi.array().items(Joi.string().valid(...MODULES)),
  isActive:    Joi.boolean(),
}).min(1)

router.get('/',        controller.list)
router.get('/:id',     controller.getOne)
router.post('/',       validate(createSchema), controller.create)
router.patch('/:id',   validate(updateSchema), controller.update)
router.delete('/:id',  controller.remove)

module.exports = router