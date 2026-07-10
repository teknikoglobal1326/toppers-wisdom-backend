const router = require('express').Router()
const controller = require('./admin-faq.controller')
const { validate, validateQuery } = require('../../core/validate')
const { createFaqSchema, updateFaqSchema, listFaqQuerySchema } = require('./admin-faq.schema')

router.get('/', validateQuery(listFaqQuerySchema), controller.list)
router.post('/', validate(createFaqSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', validate(updateFaqSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
