const router     = require('express').Router()
const controller = require('./test.controller')
const { validate }     = require('../../core/validate')
const { submitSchema } = require('./test.schema')

router.get('/',                                    controller.listTests)
router.get('/attempts',                            controller.getMyAttempts)
router.get('/:id',                                 controller.getTest)
router.get('/:id/sub-tests/:subTestId/start',      controller.startSubTest)
router.get('/:id/leaderboard',                     controller.getLeaderboard)
router.post('/:id/sub-tests/:subTestId/submit',    validate(submitSchema), controller.submitAttempt)

module.exports = router
