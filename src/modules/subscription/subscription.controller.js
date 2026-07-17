const catchAsync = require('../../core/catchAsync');
const { sendSuccess } = require('../../core/response');
const subscriptionService = require('./subscription.service');

const checkSubscriptions = catchAsync(async (req, res) => {
    const { type, id } = req.query;
    const result = await subscriptionService.checkSubscriptions(type, id);
    sendSuccess(res, result, 'Subscriptions retrieved successfully');
});

const purchaseSubscription = catchAsync(async (req, res) => {
    const { subscriptionId } = req.body;
    const result = await subscriptionService.purchaseSubscription(req.user._id, subscriptionId);
    sendSuccess(res, result, 'Subscription purchase initiated');
});

const verifyPayment = catchAsync(async (req, res) => {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const result = await subscriptionService.verifyPayment(req.user._id, razorpayOrderId, razorpayPaymentId, razorpaySignature);
    sendSuccess(res, result, 'Payment verified and subscription activated');
});

const getPurchaseHistory = catchAsync(async (req, res) => {
    const { paginate } = require('../../core/paginate');
    const UserSubscription = require('../../models/UserSubscription.model');
    const filter = { user: req.user._id };
    const paginated = await paginate(UserSubscription, filter, {
        page: req.query.page,
        limit: req.query.limit,
        sort: { createdAt: -1 },
        populate: { path: 'subscription', select: 'name description price durationDays' }
    });
    sendSuccess(res, paginated, 'Purchase history retrieved successfully');
});

module.exports = { checkSubscriptions, purchaseSubscription, verifyPayment, getPurchaseHistory };
