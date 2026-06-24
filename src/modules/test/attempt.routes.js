const router     = require('express').Router()
const controller = require('./test.controller')

router.get('/', controller.getMyAttempts)

module.exports = router
