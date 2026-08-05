const router = require('express').Router()
const controller = require('./admin-editorial-topic.controller')
const { validate, validateQuery } = require('../../core/validate')
const { createTopicSchema, updateTopicSchema, listTopicQuerySchema } = require('./admin-editorial-topic.schema')

router.get('/', validateQuery(listTopicQuerySchema), controller.listTopics)
router.get('/:id', controller.getTopic)
router.post('/', validate(createTopicSchema), controller.createTopic)
router.patch('/:id', validate(updateTopicSchema), controller.updateTopic)
router.delete('/:id', controller.deleteTopic)

module.exports = router