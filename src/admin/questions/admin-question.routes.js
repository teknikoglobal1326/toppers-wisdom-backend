const router = require('express').Router()
const controller = require('./admin-question.controller')
const { validate, validateQuery } = require('../../core/validate')
const { createQuestionSchema, createQuestionDualSchema, updateQuestionSchema, listQuestionQuerySchema } = require('./admin-question.schema')
const { upload } = require('../../middlewares/upload.middleware')
const { attachUploadedFiles } = require('./admin-question.service')

const uploadQuestionFiles = upload.fields([
  { name: 'questionImage', maxCount: 1 },
  { name: 'explanationImage', maxCount: 1 },
  { name: 'optionImages', maxCount: 4 },
])

const validateCreate = (req, res, next) => {
  const schema = (req.body.hi && req.body.en) ? createQuestionDualSchema : createQuestionSchema
  return validate(schema)(req, res, next)
}

router.get('/', validateQuery(listQuestionQuerySchema), controller.list)
router.post('/', uploadQuestionFiles, attachUploadedFiles, validateCreate, controller.create)
router.delete('/test/:testId', controller.removeByTest)
router.get('/:id', controller.getOne)
router.patch('/:id', uploadQuestionFiles, attachUploadedFiles, validate(updateQuestionSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
