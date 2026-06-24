const router     = require('express').Router()
const controller = require('./qualification.controller')

router.get('/',                         controller.listAll)
router.get('/:id/exam-types',           controller.getExamTypes)
router.get('/exam-types/:id/sub-exams', controller.getSubExams)

module.exports = router
