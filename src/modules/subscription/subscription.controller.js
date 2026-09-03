const catchAsync = require('../../core/catchAsync');
const { sendSuccess, sendPaginated } = require('../../core/response');
const subscriptionService = require('./subscription.service');
const { paginate } = require('../../core/paginate');
const UserSubscription = require('../../models/UserSubscription.model');
const SubscriptionOrder = require('../../models/SubscriptionOrder.model');

const checkSubscriptions = catchAsync(async (req, res) => {
    const { type, id } = req.query;
    const result = await subscriptionService.checkSubscriptions(type, id, req.user);
    sendSuccess(res, result, 'Subscriptions retrieved successfully');
});

const purchaseSubscription = catchAsync(async (req, res) => {
    const { subscriptionId, couponCode } = req.body;
    const result = await subscriptionService.purchaseSubscription(req.user._id, subscriptionId, couponCode);
    sendSuccess(res, result, 'Subscription purchase initiated');
});

const verifyPayment = catchAsync(async (req, res) => {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const result = await subscriptionService.verifyPayment(req.user._id, razorpayOrderId, razorpayPaymentId, razorpaySignature);
    sendSuccess(res, result, 'Payment verified and subscription activated');
});

const getPurchaseHistory = catchAsync(async (req, res) => {
    const filter = { user: req.user._id };
    const paginated = await paginate(UserSubscription, filter, {
        page: req.query.page,
        limit: req.query.limit,
        sort: { createdAt: -1 },
        populate: { path: 'subscription', select: 'name description price durationDays' }
    });
    
    const mapped = paginated.data.map(sub => {
        const subObj = sub.toObject ? sub.toObject() : sub;
        const now = new Date();
        const end = new Date(subObj.endDate);
        const remainingDays = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
        return {
            ...subObj,
            remainingDays
        };
    });

    sendPaginated(res, mapped, paginated.pagination, 'Purchase history retrieved successfully');
});

const getSubscriptionOrders = catchAsync(async (req, res) => {
    const filter = { user: req.user._id };
    const paginated = await paginate(SubscriptionOrder, filter, {
        page: req.query.page,
        limit: req.query.limit,
        sort: { createdAt: -1 },
        populate: { path: 'subscription', select: 'name description price durationDays' }
    });

    const ordersWithRemaining = paginated.data.map(order => {
        const orderObj = order.toObject ? order.toObject() : order;
        const now = new Date();
        const paidAtTime = orderObj.paidAt ? new Date(orderObj.paidAt).getTime() : 0;
        const durationDays = orderObj.duration || 0;
        const endTime = paidAtTime + (durationDays * 24 * 60 * 60 * 1000);
        const remainingDays = orderObj.status === 'paid' ? Math.max(0, Math.ceil((endTime - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
        return {
            ...orderObj,
            remainingDays
        };
    });

    sendPaginated(res, ordersWithRemaining, paginated.pagination, 'Subscription orders retrieved successfully');
});

module.exports = { checkSubscriptions, purchaseSubscription, verifyPayment, getPurchaseHistory, getSubscriptionOrders };
