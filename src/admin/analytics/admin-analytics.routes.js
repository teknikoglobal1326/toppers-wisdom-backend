const router     = require('express').Router()
const controller = require('./admin-analytics.controller')

router.get('/overview', controller.overview)
router.get('/revenue',  controller.revenue)
router.get('/users',    controller.users)

module.exports = router
