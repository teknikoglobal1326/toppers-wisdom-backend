const path = require('path')
const router = require('express').Router()
const controller = require('./admin-question.controller')
const { validate } = require('../../core/validate')
const { createQuestionSchema, updateQuestionSchema } = require('./admin-question.schema')
const { upload } = require('../../middlewares/upload.middleware')
const { uploadFile } = require('../../lib/fileUpload')

const uploadQuestionFiles = upload.fields([
  { name: 'questionImage', maxCount: 1 },
  { name: 'explanationImage', maxCount: 1 },
  { name: 'optionImages', maxCount: 4 },
])

const attachUploadedFiles = async (req, _res, next) => {
  try {
    const folder = `questions/${req.params.id ?? `new-${Date.now()}`}`

    if (req.files?.questionImage?.[0]) {
      const file = req.files.questionImage[0]
      const ext = path.extname(file.originalname) || '.jpg'
      req.body.question = {
        ...(req.body.question ? JSON.parse(req.body.question) : {}),
        image: await uploadFile(file.buffer, `question${ext}`, folder, file.mimetype),
      }
    }

    if (req.files?.explanationImage?.[0]) {
      const file = req.files.explanationImage[0]
      const ext = path.extname(file.originalname) || '.jpg'
      req.body.explanation = {
        ...(req.body.explanation ? JSON.parse(req.body.explanation) : {}),
        image: await uploadFile(file.buffer, `explanation${ext}`, folder, file.mimetype),
      }
    }

    if (req.files?.optionImages?.length) {
      const optionImages = req.files.optionImages
      const options = req.body.options ? JSON.parse(req.body.options) : []
      for (let index = 0; index < optionImages.length; index += 1) {
        const file = optionImages[index]
        const ext = path.extname(file.originalname) || '.jpg'
        if (options[index]) {
          options[index].image = await uploadFile(file.buffer, `option-${index + 1}${ext}`, folder, file.mimetype)
        }
      }
      req.body.options = options
    }

    if (req.body.question && typeof req.body.question === 'string') {
      req.body.question = JSON.parse(req.body.question)
    }

    if (req.body.explanation && typeof req.body.explanation === 'string') {
      req.body.explanation = JSON.parse(req.body.explanation)
    }

    if (req.body.options && typeof req.body.options === 'string') {
      req.body.options = JSON.parse(req.body.options)
    }

    next()
  } catch (err) {
    next(err)
  }
}

router.get('/', controller.list)
router.post('/', uploadQuestionFiles, attachUploadedFiles, validate(createQuestionSchema), controller.create)
router.get('/:id', controller.getOne)
router.patch('/:id', uploadQuestionFiles, attachUploadedFiles, validate(updateQuestionSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
