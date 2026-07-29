const router = require('express').Router()
const controller = require('./admin-course-test.controller')
const { validate, validateQuery } = require('../../core/validate')
const { createCourseTestSchema, updateCourseTestSchema, listCourseTestQuerySchema } = require('./admin-course-test.schema')
const { upload } = require('../../middlewares/upload.middleware')
const { attachUploadedFiles } = require('./admin-course-test.service')
const multer = require('multer')

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

const uploadCourseTestImage = upload.fields([{ name: 'image', maxCount: 1 }])

const uploadBulkCourseTest = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
})
const uploadBulkCourseTestFields = uploadBulkCourseTest.fields([
  { name: 'file', maxCount: 1 }
])

router.get('/', validateQuery(listCourseTestQuerySchema), controller.list)
router.post('/bulk', uploadBulkCourseTestFields, parseArrays, controller.bulkCreate)
router.post('/', uploadCourseTestImage, parseArrays, attachUploadedFiles, validate(createCourseTestSchema), controller.create)
router.get('/:id', controller.getOne)
router.patch('/:id', uploadCourseTestImage, parseArrays, attachUploadedFiles, validate(updateCourseTestSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
