const router     = require('express').Router()
const controller = require('./booster.controller')

router.get('/',    controller.listBoosters)
router.get('/:id', controller.getBooster)

module.exports = router
