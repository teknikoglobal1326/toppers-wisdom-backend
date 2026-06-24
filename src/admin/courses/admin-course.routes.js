const router     = require('express').Router()
const controller = require('./admin-course.controller')

router.get('/',                                  controller.listAll)
router.post('/',                                 controller.createCourse)
router.get('/:id',                               controller.getOne)
router.put('/:id',                               controller.updateCourse)
router.delete('/:id',                            controller.deleteCourse)
router.patch('/:id/publish',                     controller.publish)
router.post('/:id/lessons',                      controller.addLesson)
router.delete('/:id/lessons/:lessonId',          controller.removeLesson)
router.post('/:id/lessons/:lessonId/upload-url', controller.uploadUrl)

module.exports = router
