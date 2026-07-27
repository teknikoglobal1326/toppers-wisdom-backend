const router = require('express').Router()
const controller = require('./live-test.controller')

router.get('/syllabus', controller.getSyllabus)
router.post('/auto-generate-questions', controller.autoGenerateQuestions)

module.exports = router
