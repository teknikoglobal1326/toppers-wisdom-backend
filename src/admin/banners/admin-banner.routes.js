const router = require('express').Router()
const controller = require('./admin-banner.controller')
const { validate, validateQuery } = require('../../core/validate')
const { upload } = require('../../middlewares/upload.middleware')
const { createBannerSchema, updateBannerSchema, listBannerQuerySchema } = require('./admin-banner.schema')

router.get('/', validateQuery(listBannerQuerySchema), controller.list)
router.post('/', upload.single('image'), validate(createBannerSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', upload.single('image'), validate(updateBannerSchema), controller.update)
router.delete('/:id', controller.remove)
// router.delete('/:id/hard', controller.hardRemove)

module.exports = router
