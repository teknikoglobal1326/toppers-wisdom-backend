const router = require('express').Router()
const controller = require('./admin-course.controller')
const { validate, validateQuery } = require('../../core/validate')
const { uploadCourseImages, parseFormData, uploadTimetableFile, parseTimetableForm } = require('./admin-course.upload')
const {
    createCourseSchema,
    updateCourseSchema,
    addLessonSchema,
    uploadUrlSchema,
    imageUploadSchema,
    listQuerySchema,
} = require('./admin-course.schema')

router.get('/', validateQuery(listQuerySchema), controller.listAll)
router.post('/', uploadCourseImages, parseFormData, validate(createCourseSchema), controller.createCourse)
router.get('/:id', controller.getOne)
router.put('/:id', uploadCourseImages, parseFormData, validate(updateCourseSchema), controller.updateCourse)
router.delete('/:id', controller.deleteCourse)
router.patch('/:id/publish', controller.publish)
router.post('/:id/lessons', validate(addLessonSchema), controller.addLesson)
router.delete('/:id/lessons/:lessonId', controller.removeLesson)
router.post('/:id/lessons/:lessonId/upload-url', validate(uploadUrlSchema), controller.uploadUrl)
router.post('/:id/thumbnail-upload-url', validate(imageUploadSchema), controller.thumbnailUploadUrl)
router.post('/:id/banner-upload-url', validate(imageUploadSchema), controller.bannerUploadUrl)
router.put('/:id/timetable', uploadTimetableFile, parseTimetableForm, controller.updateTimetable)

module.exports = router
