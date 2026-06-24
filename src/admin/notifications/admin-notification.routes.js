const router     = require('express').Router()
const controller = require('./admin-notification.controller')
const { validate }        = require('../../core/validate')
const { broadcastSchema } = require('./admin-notification.schema')

router.post('/broadcast', validate(broadcastSchema), controller.broadcast)

module.exports = router
