const router     = require('express').Router()
const controller = require('./admin-booster.controller')
const { validate, validateQuery } = require('../../core/validate')
const { createBoosterSchema, updateBoosterSchema, listBoosterQuerySchema } = require('./admin-booster.schema')
const { uploadBoosterFiles, parseFields, parseFiles } = require('./admin-booster.upload')

router.get('/',                validateQuery(listBoosterQuerySchema), controller.listAll)
router.post('/',               uploadBoosterFiles, parseFields, validate(createBoosterSchema), parseFiles, controller.createBooster)
router.get('/:id',             controller.getOne)
router.put('/:id',             uploadBoosterFiles, parseFields, validate(updateBoosterSchema), parseFiles, controller.updateBooster)
router.delete('/:id',          controller.deleteBooster)
router.post('/:id/upload-url', controller.getUploadUrl)

module.exports = router
