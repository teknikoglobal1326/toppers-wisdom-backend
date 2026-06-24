const router     = require('express').Router()
const controller = require('./admin-subexam.controller')
const { validate }              = require('../../core/validate')
const { createSubExamSchema, updateSubExamSchema } = require('./admin-subexam.schema')

router.get('/',    controller.list)
router.post('/',   validate(createSubExamSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', validate(updateSubExamSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
