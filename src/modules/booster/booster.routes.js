const router     = require('express').Router()
const controller = require('./booster.controller')
const { validate }     = require('../../core/validate')
const { reportSchema } = require('./booster.schema')

router.get('/',                              controller.listBoosters)
router.get('/:id',                           controller.getBooster)
router.get('/:id/items/:itemId/audio-url',   controller.getAudioUrl)
router.post('/:id/items/:itemId/save',       controller.saveItem)
router.post('/:id/items/:itemId/report',     validate(reportSchema), controller.reportItem)

module.exports = router
