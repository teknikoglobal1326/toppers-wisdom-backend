const router = require('express').Router()
const controller = require('./platform-setting.controller')

router.get('/', controller.getSettings)

module.exports = router
