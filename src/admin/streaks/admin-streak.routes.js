const router = require('express').Router()
const controller = require('./admin-streak.controller')

router.get('/', controller.listAll)
router.get('/:id', controller.getDetails)
router.post('/:id/grant-freeze', controller.grantFreeze)
router.post('/:id/reset', controller.resetStreak)

module.exports = router