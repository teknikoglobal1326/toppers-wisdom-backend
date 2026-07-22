const express = require('express');
const router = express.Router();
const rewardsController = require('./rewards.controller');
const { authMiddleware } = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/wallet/balance', rewardsController.getWalletBalance);
router.get('/wallet/history', rewardsController.getWalletHistory);
router.get('/wallet/summary', rewardsController.getWalletSummary);

router.get('/streak/today', rewardsController.getTodayStreak);
router.post('/streak/complete', rewardsController.completeMission);
router.get('/streak/calendar', rewardsController.getStreakCalendar);

module.exports = router;
