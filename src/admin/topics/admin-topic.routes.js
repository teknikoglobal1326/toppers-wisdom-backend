const router = require('express').Router()
const controller = require('./admin-topic.controller')
const { validate, validateQuery } = require('../../core/validate')
const { createTopicSchema, updateTopicSchema, listTopicQuerySchema } = require('./admin-topic.schema')

router.get('/', validateQuery(listTopicQuerySchema), controller.list)
router.post('/', validate(createTopicSchema), controller.create)
router.get('/:id', controller.getOne)
router.patch('/:id', validate(updateTopicSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
