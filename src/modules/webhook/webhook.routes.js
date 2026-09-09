const express = require('express')
const router = express.Router()
const webhookController = require('./webhook.controller')

// Generic webhook for streaming providers to push the HLS URL once generation finishes or stream starts
router.post('/live-stream/hls', webhookController.updateHlsUrl)

module.exports = router
