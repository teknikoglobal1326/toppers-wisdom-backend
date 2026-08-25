const router = require('express').Router()
const controller = require('./math-generator.controller')

router.post('/tests/generate', controller.generateTest)
router.post('/tests', controller.generateTest)
router.get('/dashboard', controller.getDashboardData)
router.get('/tests/:testId/questions', controller.getTestQuestions)
router.post('/tests/:testId/answers', controller.submitAnswer)
router.post('/tests/:testId/submit', controller.submitTest)
router.get('/tests/:testId/result', controller.getResult)

module.exports = router
