const router = require('express').Router()
const controller = require('./thought-of-the-day.controller')

router.get('/', controller.listFeed)
router.post('/:id/like', controller.toggleLike)
router.post('/:id/comment', controller.addComment)
router.post('/:id/share', controller.shareThought)

module.exports = router
