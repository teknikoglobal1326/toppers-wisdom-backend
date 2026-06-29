const router = require('express').Router()
const controller = require('./admin-qualification.controller')
const { validate } = require('../../core/validate')
const { createQualificationSchema, updateQualificationSchema } = require('./admin-qualification.schema')

router.get('/', controller.list)
router.post('/', validate(createQualificationSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', validate(updateQualificationSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
