const router = require('express').Router()
const controller = require('./admin-topic.controller')
const { validate } = require('../../core/validate')
const { createTopicSchema, updateTopicSchema } = require('./admin-topic.schema')

router.get('/', controller.list)
router.post('/', validate(createTopicSchema), controller.create)
router.get('/:id', controller.getOne)
router.patch('/:id', validate(updateTopicSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
