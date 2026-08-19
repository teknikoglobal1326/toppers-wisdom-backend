const router = require('express').Router();
const controller = require('./subscription.controller');
const { authMiddleware } = require('../../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/check', controller.checkSubscriptions);
router.post('/purchase', controller.purchaseSubscription);
router.post('/verify', controller.verifyPayment);
router.get('/history', controller.getPurchaseHistory);
router.get('/orders', controller.getSubscriptionOrders);

module.exports = router;
