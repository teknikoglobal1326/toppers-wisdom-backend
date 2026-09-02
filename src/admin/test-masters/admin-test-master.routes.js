const router     = require('express').Router()
const controller = require('./admin-test-master.controller')

router.get('/',                                                  controller.listAll)
router.post('/',                                                 controller.createTest)
router.get('/:id',                                               controller.getOne)
router.put('/:id',                                               controller.updateTest)
router.delete('/:id',                                            controller.deleteTest)
router.patch('/:id/publish',                                     controller.publish)
router.post('/:id/assign',                                       controller.assignTest)

module.exports = router
