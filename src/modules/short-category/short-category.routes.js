const router = require('express').Router()
const controller = require('./short-category.controller')

router.get('/', controller.listCategories)

module.exports = router
