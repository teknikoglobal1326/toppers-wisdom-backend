const router = require('express').Router()
const controller = require('./short.controller')

router.get('/:categoryId', controller.listShorts)

module.exports = router
