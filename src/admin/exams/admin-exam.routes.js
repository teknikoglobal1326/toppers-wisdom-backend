const router = require('express').Router()
const controller = require('./admin-exam.controller')
const { validate, validateQuery } = require('../../core/validate')
const { upload } = require('../../middlewares/upload.middleware')
const { isDualLanguagePayload, parseDualLanguageFields } = require('../../core/languageUtils')
const { createExamSchema, createExamDualSchema, updateExamSchema, listExamQuerySchema } = require('./admin-exam.schema')

const uploadExamCreateFiles = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'hiImage', maxCount: 1 },
  { name: 'enImage', maxCount: 1 },
])

const validateCreate = (req, res, next) => {
  const schema = isDualLanguagePayload(req.body) ? createExamDualSchema : createExamSchema
  return validate(schema)(req, res, next)
}

router.get('/', validateQuery(listExamQuerySchema), controller.list)
router.post('/', uploadExamCreateFiles, parseDualLanguageFields, validateCreate, controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', upload.single('image'), validate(updateExamSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
