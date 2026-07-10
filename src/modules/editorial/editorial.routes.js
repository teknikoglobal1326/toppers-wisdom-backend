const router = require('express').Router()
const controller = require('./editorial.controller')
const { validate, validateQuery } = require('../../core/validate')
const { listEditorialQuerySchema, setEditorialLikeSchema } = require('./editorial.schema')

router.get('/', validateQuery(listEditorialQuerySchema), controller.list)
router.patch('/:id/like', validate(setEditorialLikeSchema), controller.setLike)
router.get('/:id', controller.getOne)

module.exports = router
