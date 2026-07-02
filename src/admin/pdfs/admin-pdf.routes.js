const router = require('express').Router()
const controller = require('./admin-pdf.controller')
const { validate } = require('../../core/validate')
const { createPdfSchema, updatePdfSchema } = require('./admin-pdf.schema')
const { uploadPdf } = require('../../middlewares/upload.middleware')
const { attachUploadedFiles } = require('./admin-pdf.service')

const uploadPdfFields = uploadPdf.fields([
  { name: 'pdfFile', maxCount: 1 },
  { name: 'image', maxCount: 1 },
])

router.get('/', controller.list)
router.post('/', uploadPdfFields, attachUploadedFiles, validate(createPdfSchema), controller.create)
router.get('/:id', controller.getOne)
router.patch('/:id', uploadPdfFields, attachUploadedFiles, validate(updatePdfSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
