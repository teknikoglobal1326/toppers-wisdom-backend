const router = require('express').Router()

router.use('/qualifications', require('./qualification/qualification.common.routes'))
router.use('/exams',          require('./exam/exam.common.routes'))
router.use('/cms',         require('./cms/cms.common.routes'))
router.use('/app-version', require('./app-version/app-version.common.routes'))

module.exports = router
