const router     = require('express').Router()
const controller = require('./admin-subject.controller')
const { validate }                              = require('../../core/validate')
const { createSubjectSchema, createSubjectDualSchema, updateSubjectSchema } = require('./admin-subject.schema')

const validateCreate = (req, res, next) => {
  const schema = (req.body.hi && req.body.en) ? createSubjectDualSchema : createSubjectSchema
  return validate(schema)(req, res, next)
}

router.get('/',    controller.list)
router.post('/',   validateCreate, controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', validate(updateSubjectSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
