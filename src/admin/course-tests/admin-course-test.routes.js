const path = require('path')
const router = require('express').Router()
const controller = require('./admin-course-test.controller')
const { validate } = require('../../core/validate')
const { createCourseTestSchema, updateCourseTestSchema } = require('./admin-course-test.schema')
const { upload } = require('../../middlewares/upload.middleware')
const { uploadFile } = require('../../lib/fileUpload')

const uploadCourseTestImage = upload.fields([{ name: 'image', maxCount: 1 }])

const attachUploadedFiles = async (req, _res, next) => {
  try {
    const folder = `course-tests/${req.params.id ?? `new-${Date.now()}`}`

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
router.post('/', uploadCourseTestImage, attachUploadedFiles, validate(createCourseTestSchema), controller.create)
router.get('/:id', controller.getOne)
router.patch('/:id', uploadCourseTestImage, attachUploadedFiles, validate(updateCourseTestSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
