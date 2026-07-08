const router = require('express').Router()
const controller = require('./admin-course-test.controller')
const { validate, validateQuery } = require('../../core/validate')
const { createCourseTestSchema, updateCourseTestSchema, listCourseTestQuerySchema } = require('./admin-course-test.schema')
const { upload } = require('../../middlewares/upload.middleware')
const { attachUploadedFiles } = require('./admin-course-test.service')

const uploadCourseTestImage = upload.fields([{ name: 'image', maxCount: 1 }])

router.get('/', validateQuery(listCourseTestQuerySchema), controller.list)
router.post('/', uploadCourseTestImage, attachUploadedFiles, validate(createCourseTestSchema), controller.create)
router.get('/:id', controller.getOne)
router.patch('/:id', uploadCourseTestImage, attachUploadedFiles, validate(updateCourseTestSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
