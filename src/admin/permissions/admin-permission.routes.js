const router = require('express').Router()
const controller = require('./admin-permission.controller')
const { validate, validateQuery } = require('../../core/validate')
const { createPermissionSchema, updatePermissionSchema, listPermissionQuerySchema } = require('./admin-permission.schema')

router.get('/', validateQuery(listPermissionQuerySchema), controller.list)
router.get('/:id', controller.getOne)
router.post('/', validate(createPermissionSchema), controller.create)
router.patch('/:id', validate(updatePermissionSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
