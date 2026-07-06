const router     = require('express').Router()
const controller = require('./admin-short.controller')
const { validate }                             = require('../../core/validate')
const { uploadShortFiles, parseFormData }      = require('./admin-short.upload')
const { createShortSchema, createShortDualSchema, updateShortSchema } = require('./admin-short.schema')

const validateCreate = (req, res, next) => {
  const schema = (req.body.hi && req.body.en) ? createShortDualSchema : createShortSchema
  return validate(schema)(req, res, next)
}

router.get('/',       controller.list)
router.post('/',      uploadShortFiles, parseFormData, validateCreate, controller.create)
router.get('/:id',    controller.getOne)
router.put('/:id',    uploadShortFiles, parseFormData, validate(updateShortSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
