const router = require('express').Router()
const controller = require('./offer.controller')
const { validateQuery } = require('../../core/validate')
const { listOfferQuerySchema } = require('./offer.schema')

router.get('/', validateQuery(listOfferQuerySchema), controller.list)
router.get('/:id', controller.getOne)

module.exports = router
