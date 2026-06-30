const router = require('express').Router()

router.use('/qualifications', require('./qualification/qualification.common.routes'))
router.use('/exams', require('./exam/exam.common.routes'))

module.exports = router
