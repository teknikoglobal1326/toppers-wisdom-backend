const router = require('express').Router()
const controller = require('./admin-dashboard.controller')

router.get('/stats', controller.getDashboardStats)

module.exports = router
