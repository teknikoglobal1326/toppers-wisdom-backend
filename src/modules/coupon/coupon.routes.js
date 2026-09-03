const express = require('express')
const router = express.Router()
const controller = require('./coupon.controller')

router.get('/', controller.getActiveCoupons)

module.exports = router
