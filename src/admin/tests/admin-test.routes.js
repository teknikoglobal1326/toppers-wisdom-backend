const router     = require('express').Router()
const controller = require('./admin-test.controller')

router.get('/',                                                  controller.listAll)
router.post('/',                                                 controller.createTest)
router.get('/:id',                                               controller.getOne)
router.put('/:id',                                               controller.updateTest)
router.delete('/:id',                                            controller.deleteTest)
router.patch('/:id/publish',                                     controller.publish)
router.post('/:id/sub-tests',                                    controller.addSubTest)
router.post('/:id/sub-tests/:subTestId/questions',               controller.addQuestion)
router.post('/:id/sub-tests/:subTestId/questions/bulk',          controller.bulkAddQuestions)
router.delete('/:id/sub-tests/:subTestId/questions/:questionId', controller.removeQuestion)

module.exports = router
