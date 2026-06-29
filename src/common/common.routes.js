const router = require('express').Router()

router.use('/qualifications', require('./qualification/qualification.common.routes'))

module.exports = router
