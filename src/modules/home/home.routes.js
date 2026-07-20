const router = require('express').Router()
const controller = require('./home.controller')

router.get('/', controller.getHome)

module.exports = router
