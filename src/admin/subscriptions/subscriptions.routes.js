const express = require('express');
const router = express.Router();
const subscriptionsController = require('./subscriptions.controller');

router.post('/', subscriptionsController.createSubscription);
router.get('/', subscriptionsController.getAllSubscriptions);
router.get('/:id', subscriptionsController.getSubscriptionById);
router.put('/:id', subscriptionsController.updateSubscription);
router.delete('/:id', subscriptionsController.deleteSubscription);

module.exports = router;
