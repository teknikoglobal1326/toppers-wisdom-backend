const router = require('express').Router()
const controller = require('./admin-testimonial.controller')
const { validate, validateQuery } = require('../../core/validate')
const { createTestimonialSchema, updateTestimonialSchema, listTestimonialQuerySchema } = require('./admin-testimonial.schema')

const { upload } = require('../../middlewares/upload.middleware')
const path = require('path')
const { uploadFile } = require('../../lib/fileUpload')

const attachTestimonialImage = async (req, res, next) => {
  try {
    if (req.file) {
      const ext = path.extname(req.file.originalname) || '.jpg'
      const folder = `testimonials/${Date.now()}`
      req.body.image = await uploadFile(req.file.buffer, `image${ext}`, folder, req.file.mimetype)
    }
    next()
  } catch (err) {
    next(err)
  }
}

router.get('/', validateQuery(listTestimonialQuerySchema), controller.listTestimonials)
router.get('/:id', controller.getTestimonial)
router.post('/', upload.single('image'), attachTestimonialImage, validate(createTestimonialSchema), controller.createTestimonial)
router.patch('/:id', upload.single('image'), attachTestimonialImage, validate(updateTestimonialSchema), controller.updateTestimonial)
router.delete('/:id', controller.deleteTestimonial)

module.exports = router
