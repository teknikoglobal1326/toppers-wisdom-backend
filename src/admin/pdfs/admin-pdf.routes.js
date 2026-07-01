const path = require('path')
const router = require('express').Router()
const controller = require('./admin-pdf.controller')
const { validate } = require('../../core/validate')
const { createPdfSchema, updatePdfSchema } = require('./admin-pdf.schema')
const { uploadPdf } = require('../../middlewares/upload.middleware')
const { uploadFile } = require('../../lib/fileUpload')

const uploadPdfFields = uploadPdf.fields([
  { name: 'pdfFile', maxCount: 1 },
  { name: 'image', maxCount: 1 },
])

const attachUploadedFiles = async (req, _res, next) => {
  try {
    const folder = `pdfs/${req.params.id ?? `new-${Date.now()}`}`

    if (req.files?.pdfFile?.[0]) {
      const file = req.files.pdfFile[0]
      const ext = path.extname(file.originalname) || '.pdf'
      req.body.pdfFile = await uploadFile(file.buffer, `pdfFile${ext}`, folder, file.mimetype)
    }

    if (req.files?.image?.[0]) {
      const file = req.files.image[0]
      const ext = path.extname(file.originalname) || '.jpg'
      req.body.image = await uploadFile(file.buffer, `image${ext}`, folder, file.mimetype)
    }

    next()
  } catch (err) {
    next(err)
  }
}

router.get('/', controller.list)
router.post('/', uploadPdfFields, attachUploadedFiles, validate(createPdfSchema), controller.create)
router.get('/:id', controller.getOne)
router.patch('/:id', uploadPdfFields, attachUploadedFiles, validate(updatePdfSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
