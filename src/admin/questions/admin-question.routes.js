const router = require('express').Router()
const controller = require('./admin-question.controller')
const { validate } = require('../../core/validate')
const { createQuestionSchema, updateQuestionSchema } = require('./admin-question.schema')
const { upload } = require('../../middlewares/upload.middleware')
const { attachUploadedFiles } = require('./admin-question.service')

const uploadQuestionFiles = upload.fields([
  { name: 'questionImage', maxCount: 1 },
  { name: 'explanationImage', maxCount: 1 },
  { name: 'optionImages', maxCount: 4 },
])

router.get('/', controller.list)
router.post('/', uploadQuestionFiles, attachUploadedFiles, validate(createQuestionSchema), controller.create)
router.delete('/test/:testId', controller.removeByTest)
router.get('/:id', controller.getOne)
router.patch('/:id', uploadQuestionFiles, attachUploadedFiles, validate(updateQuestionSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
