const router = require('express').Router()
const controller = require('./admin-qualification.controller')
const { validate } = require('../../core/validate')
const { isDualLanguagePayload } = require('../../core/languageUtils')
const { createQualificationSchema, createQualificationDualSchema, updateQualificationSchema } = require('./admin-qualification.schema')

const validateCreate = (req, res, next) => {
  const schema = isDualLanguagePayload(req.body) ? createQualificationDualSchema : createQualificationSchema
  return validate(schema)(req, res, next)
}

router.get('/', controller.list)
router.post('/', validateCreate, controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', validate(updateQualificationSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
