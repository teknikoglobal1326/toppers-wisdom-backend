const router = require('express').Router()
const controller = require('./admin-pdf.controller')
const { validate, validateQuery } = require('../../core/validate')
const { createPdfSchema, updatePdfSchema, listPdfQuerySchema } = require('./admin-pdf.schema')
const { uploadPdf } = require('../../middlewares/upload.middleware')
const { attachUploadedFiles } = require('./admin-pdf.service')

const parseChapter = (req, res, next) => {
  if (req.body.chapter && typeof req.body.chapter === 'string') {
    try {
      req.body.chapter = JSON.parse(req.body.chapter)
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid chapter JSON format'
      })
    }
  }

  next()
}

const uploadPdfFields = uploadPdf.fields([
  { name: 'pdfFile', maxCount: 1 },
  { name: 'image', maxCount: 1 },
])

router.get('/', validateQuery(listPdfQuerySchema), controller.list)
router.post('/', uploadPdfFields, parseChapter, attachUploadedFiles, validate(createPdfSchema), controller.create)
router.get('/:id', controller.getOne)
router.patch('/:id', uploadPdfFields, parseChapter, attachUploadedFiles, validate(updatePdfSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
