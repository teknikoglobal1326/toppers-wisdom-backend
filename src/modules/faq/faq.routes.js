const router = require('express').Router()
const controller = require('./faq.controller')
const { validateQuery } = require('../../core/validate')
const { listFaqQuerySchema } = require('./faq.schema')

router.get('/', validateQuery(listFaqQuerySchema), controller.list)

module.exports = router
