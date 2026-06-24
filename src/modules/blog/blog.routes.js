const router     = require('express').Router()
const controller = require('./blog.controller')

router.get('/',       controller.listPosts)
router.get('/:slug',  controller.getPost)

module.exports = router
