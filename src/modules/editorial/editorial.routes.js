const router = require('express').Router()
const controller = require('./editorial.controller')
const { validate, validateQuery } = require('../../core/validate')
const { listEditorialQuerySchema, setEditorialLikeSchema, setEditorialReadSchema, setEditorialBookmarkSchema } = require('./editorial.schema')

router.get('/purchase-status', controller.getPurchaseStatus)
router.post('/purchase', controller.purchaseSection)

router.get('/', validateQuery(listEditorialQuerySchema), controller.list)
router.patch('/read/:id', validate(setEditorialReadSchema), controller.setRead)
router.patch('/bookmark/:id', validate(setEditorialBookmarkSchema), controller.setBookmark)
router.patch('/:id/like', validate(setEditorialLikeSchema), controller.setLike)
router.get('/:id', controller.getOne)

module.exports = router
