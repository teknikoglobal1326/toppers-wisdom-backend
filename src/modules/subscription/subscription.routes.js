const router = require('express').Router();
const controller = require('./subscription.controller');
const { authMiddleware } = require('../../middlewares/auth.middleware');

router.get('/check', controller.checkSubscriptions);

// Protected routes
router.use(authMiddleware);
router.post('/purchase', controller.purchaseSubscription);
router.post('/verify', controller.verifyPayment);
router.get('/history', controller.getPurchaseHistory);

module.exports = router;
