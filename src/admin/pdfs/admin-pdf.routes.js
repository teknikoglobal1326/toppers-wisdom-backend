const router = require('express').Router()
const controller = require('./admin-pdf.controller')
const { validate, validateQuery } = require('../../core/validate')
const { createPdfSchema, updatePdfSchema, listPdfQuerySchema, bulkCreatePdfSchema } = require('./admin-pdf.schema')
const { uploadPdf } = require('../../middlewares/upload.middleware')
const { attachUploadedFiles } = require('./admin-pdf.service')

const parseArrays = (req, res, next) => {
  const arrayFields = ['subjects', 'topics', 'chapters']
  for (const field of arrayFields) {
    if (req.body[field] && typeof req.body[field] === 'string') {
      try {
        req.body[field] = JSON.parse(req.body[field])
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${field} JSON format`
        })
      }
    }
  }
  next()
}

const uploadPdfFields = uploadPdf.fields([
  { name: 'pdfFile', maxCount: 1 },
  { name: 'image', maxCount: 1 },
])

router.get('/', validateQuery(listPdfQuerySchema), controller.list)
router.post('/bulk', validate(bulkCreatePdfSchema), controller.bulkCreate)
router.post('/', uploadPdfFields, parseArrays, attachUploadedFiles, validate(createPdfSchema), controller.create)
router.get('/:id', controller.getOne)
router.patch('/:id', uploadPdfFields, parseArrays, attachUploadedFiles, validate(updatePdfSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
