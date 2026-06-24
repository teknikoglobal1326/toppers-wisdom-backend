const router     = require('express').Router()
const controller = require('./admin-subject.controller')
const { validate }                              = require('../../core/validate')
const { createSubjectSchema, updateSubjectSchema } = require('./admin-subject.schema')

router.get('/',    controller.list)
router.post('/',   validate(createSubjectSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', validate(updateSubjectSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
