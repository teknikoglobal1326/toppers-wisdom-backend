const router     = require('express').Router()
const controller = require('./admin-booster.controller')

router.get('/',                              controller.listAll)
router.post('/',                             controller.createBooster)
router.get('/:id',                           controller.getOne)
router.put('/:id',                           controller.updateBooster)
router.delete('/:id',                        controller.deleteBooster)
router.post('/:id/items',                    controller.addItem)
router.put('/:id/items/:itemId',             controller.updateItem)
router.delete('/:id/items/:itemId',          controller.removeItem)
router.post('/:id/items/:itemId/upload-url', controller.getUploadUrl)

module.exports = router
