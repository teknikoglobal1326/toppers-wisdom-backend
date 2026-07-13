const router = require('express').Router()
const controller = require('./admin-role.controller')
const { validate, validateQuery } = require('../../core/validate')
const { createRoleSchema, updateRoleSchema, listRoleQuerySchema } = require('./admin-role.schema')

router.get('/', validateQuery(listRoleQuerySchema), controller.list)
router.get('/:id', controller.getOne)
router.post('/', validate(createRoleSchema), controller.create)
router.patch('/:id', validate(updateRoleSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
