const router = require('express').Router()
const controller = require('./admin-ai-test.controller')

router.get('/', controller.listAll)
router.get('/:id', controller.getOne)
router.delete('/:id', controller.deleteTest)

module.exports = router
