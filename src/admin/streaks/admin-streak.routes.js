const router = require('express').Router()
const controller = require('./admin-streak.controller')

router.get('/', controller.listAll)

// Slab routes (must be before /:id routes to prevent conflict)
router.get('/slabs/all', controller.listSlabs)
router.post('/slabs', controller.createSlab)
router.put('/slabs/:id', controller.updateSlab)
router.delete('/slabs/:id', controller.deleteSlab)

router.get('/:id', controller.getDetails)
router.post('/:id/grant-freeze', controller.grantFreeze)
router.post('/:id/reset', controller.resetStreak)

module.exports = router