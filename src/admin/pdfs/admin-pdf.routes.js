const router = require('express').Router()
const controller = require('./admin-pdf.controller')
const { validate, validateQuery } = require('../../core/validate')
const { createPdfSchema, updatePdfSchema, listPdfQuerySchema, bulkCreatePdfSchema, assignPdfSchema } = require('./admin-pdf.schema')
const { uploadPdf } = require('../../middlewares/upload.middleware')
const { attachUploadedFiles } = require('./admin-pdf.service')

const parseArrays = (req, res, next) => {
  const arrayFields = ['subjects', 'topics', 'chapters', 'masterIds']
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

const multer = require('multer')
const uploadBulkPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }
})
const uploadBulkPdfFields = uploadBulkPdf.fields([
  { name: 'file', maxCount: 1 },
  { name: 'pdfFile' },
  { name: 'pdfFiles' },
  { name: 'image' },
  { name: 'imageFiles' }
])

const uploadPdfFields = uploadPdf.fields([
  { name: 'pdfFile', maxCount: 1 },
  { name: 'image', maxCount: 1 },
])

router.get('/', validateQuery(listPdfQuerySchema), controller.list)
router.post('/bulk', uploadBulkPdfFields, parseArrays, controller.bulkCreate)
router.post('/', uploadPdfFields, parseArrays, attachUploadedFiles, validate(createPdfSchema), controller.create)
router.get('/:id', controller.getOne)
router.patch('/:id/upload', uploadPdfFields, attachUploadedFiles, controller.uploadForDocument)
router.patch('/:id', uploadPdfFields, parseArrays, attachUploadedFiles, validate(updatePdfSchema), controller.update)
router.post('/:id/assign', validate(assignPdfSchema), controller.assign)
router.delete('/:id', controller.remove)

module.exports = router
