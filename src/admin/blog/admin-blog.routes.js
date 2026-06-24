const router     = require('express').Router()
const controller = require('./admin-blog.controller')

router.get('/',              controller.listAll)
router.post('/',             controller.createPost)
router.get('/:id',           controller.getOne)
router.put('/:id',           controller.updatePost)
router.delete('/:id',        controller.deletePost)
router.patch('/:id/publish', controller.publish)

module.exports = router
