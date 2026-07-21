const router = require('express').Router()
const controller = require('./admin-offer.controller')
const { validate, validateQuery } = require('../../core/validate')
const { upload } = require('../../middlewares/upload.middleware')
const { createOfferSchema, updateOfferSchema, listOfferQuerySchema } = require('../../modules/offer/offer.schema')

router.get('/', validateQuery(listOfferQuerySchema), controller.list)
router.get('/:id', controller.getOne)
router.post('/', upload.single('image'), validate(createOfferSchema), controller.create)
router.put('/:id', upload.single('image'), validate(updateOfferSchema), controller.update)
router.delete('/:id', controller.remove)
router.delete('/:id/hard', controller.hardRemove)

module.exports = router
