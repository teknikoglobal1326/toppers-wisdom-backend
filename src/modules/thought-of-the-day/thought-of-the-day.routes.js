const router = require('express').Router()
const controller = require('./thought-of-the-day.controller')

router.get('/', controller.listFeed)

module.exports = router
