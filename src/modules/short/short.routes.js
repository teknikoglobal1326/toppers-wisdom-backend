const router = require('express').Router()
const controller = require('./short.controller')

router.get('/', controller.listShorts)

module.exports = router
