const router     = require('express').Router()
const controller = require('./admin-user.controller')

router.get('/',             controller.listAll)
router.get('/:id',          controller.getOne)
router.patch('/:id',        controller.updateUser)
router.get('/:id/orders',   controller.getUserOrders)
router.get('/:id/attempts', controller.getUserAttempts)

module.exports = router
