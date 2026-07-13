const router     = require('express').Router()
const controller = require('./progress.controller')
const { validate }           = require('../../core/validate')
const { updateLessonSchema } = require('./progress.schema')

router.post('/lesson',           validate(updateLessonSchema), controller.updateLesson)
router.get('/tests',             controller.getTestProgress)
router.get('/course/:courseId',  controller.getCourseProgress)

module.exports = router
