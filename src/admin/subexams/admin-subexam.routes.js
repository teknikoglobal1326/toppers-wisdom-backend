const router     = require('express').Router()
const controller = require('./admin-subexam.controller')
const { validate }              = require('../../core/validate')
const { createSubExamSchema, createSubExamDualSchema, updateSubExamSchema } = require('./admin-subexam.schema')

const validateCreate = (req, res, next) => {
  const schema = (req.body.hi && req.body.en) ? createSubExamDualSchema : createSubExamSchema
  return validate(schema)(req, res, next)
}

router.get('/',    controller.list)
router.post('/',   validateCreate, controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', validate(updateSubExamSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
