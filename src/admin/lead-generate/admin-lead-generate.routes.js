const router = require('express').Router()
const controller = require('./admin-lead-generate.controller')
const { validate, validateQuery } = require('../../core/validate')
const { listLeadGenerateQuerySchema, updateLeadGenerateSchema } = require('./admin-lead-generate.schema')

router.get('/', validateQuery(listLeadGenerateQuerySchema), controller.list)
router.put('/:id', validate(updateLeadGenerateSchema), controller.update)

module.exports = router
