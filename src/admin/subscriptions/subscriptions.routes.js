const express = require('express');
const router = express.Router();
const subscriptionsController = require('./subscriptions.controller');
const { upload } = require('../../middlewares/upload.middleware');

router.post('/', upload.single('banner'), subscriptionsController.createSubscription);
router.get('/', subscriptionsController.getAllSubscriptions);
router.get('/history', subscriptionsController.getSubscriptionHistory);
router.get('/:id', subscriptionsController.getSubscriptionById);
router.put('/:id', upload.single('banner'), subscriptionsController.updateSubscription);
router.delete('/:id', subscriptionsController.deleteSubscription);

module.exports = router;
