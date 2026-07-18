const Subscription = require('../../models/Subscription.model');
const mongoose = require('mongoose');

class SubscriptionService {
    async checkSubscriptions(type, id) {
        if (!type || !id) {
            return [];
        }

        const objectId = new mongoose.Types.ObjectId(id);
        const filter = { isActive: true, isDeleted: false };
        const queryOptions = [];

        const typeStr = type.toLowerCase();

        if (['test-series', 'testseries'].includes(typeStr)) {
            queryOptions.push({ 'tests': { $elemMatch: { moduleType: 'TestSeries', moduleId: objectId } } });
        } else if (['previous-year-paper', 'previousyearpaper'].includes(typeStr)) {
            queryOptions.push({ 'tests': { $elemMatch: { moduleType: 'PreviousYearPaper', moduleId: objectId } } });
        } else if (['live-test-series', 'livetestseries'].includes(typeStr)) {
            queryOptions.push({ 'tests': { $elemMatch: { moduleType: 'LiveTestSeries', moduleId: objectId } } });
        } else if (typeStr === 'booster') {
            queryOptions.push({ 'boosters': { $elemMatch: { moduleType: 'Booster', moduleId: objectId } } });
        } else if (['vocabulary', 'editorial'].includes(typeStr)) {
            // Capitalize first letter to match Enum if necessary or use regex/in
            const capType = typeStr.charAt(0).toUpperCase() + typeStr.slice(1);
            queryOptions.push({ 'boosters': { $elemMatch: { moduleType: { $in: [capType, typeStr] }, moduleId: objectId } } });
        } else {
            queryOptions.push({ 'tests.moduleId': objectId });
            queryOptions.push({ 'boosters.moduleId': objectId });
        }

        if (queryOptions.length > 0) {
            filter.$or = queryOptions;
        }

        const subscriptions = await Subscription.find(filter)
            .select('name description price durationDays tests boosters')
            .lean();

        return subscriptions.map(sub => ({
            _id: sub._id,
            name: sub.name,
            description: sub.description,
            price: sub.price,
            durationDays: sub.durationDays,
            image: null // Fallback since Subscription schema doesn't have an image field yet
        }));
    }

    async purchaseSubscription(userId, subscriptionId) {
        const Subscription = require('../../models/Subscription.model');
        const SubscriptionOrder = require('../../models/SubscriptionOrder.model');
        const Razorpay = require('razorpay');
        const config = require('../../config/env');
        const AppError = require('../../core/AppError');

        const subscription = await Subscription.findById(subscriptionId);
        if (!subscription || subscription.isDeleted || !subscription.isActive) {
            throw new AppError('Subscription not found or inactive', 404);
        }

        const razorpay = new Razorpay({ key_id: config.RAZORPAY_KEY_ID, key_secret: config.RAZORPAY_KEY_SECRET });

        const rzpOrder = await razorpay.orders.create({
            amount: Math.round(subscription.price * 100),
            currency: 'INR',
            receipt: `sub_${Date.now()}`,
        });

        const order = await SubscriptionOrder.create({
            user: userId,
            subscription: subscription._id,
            amount: subscription.price,
            currency: 'INR',
            razorpayOrderId: rzpOrder.id,
            status: 'pending'
        });

        return {
            orderId: order._id,
            razorpayOrderId: rzpOrder.id,
            amount: subscription.price,
            currency: 'INR',
            keyId: config.RAZORPAY_KEY_ID
        };
    }

    async verifyPayment(userId, razorpayOrderId, razorpayPaymentId, razorpaySignature) {
        const SubscriptionOrder = require('../../models/SubscriptionOrder.model');
        const UserSubscription = require('../../models/UserSubscription.model');
        const Subscription = require('../../models/Subscription.model');
        const crypto = require('crypto');
        const config = require('../../config/env');
        const AppError = require('../../core/AppError');

        const expectedSig = crypto
            .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest('hex');

        if (expectedSig !== razorpaySignature) {
            throw new AppError('Invalid payment signature', 400, 'PAYMENT_INVALID');
        }

        const order = await SubscriptionOrder.findOne({ razorpayOrderId, user: userId });
        if (!order) throw new AppError('Order not found', 404);
        if (order.status === 'paid') throw new AppError('Payment already processed', 409);

        const subscription = await Subscription.findById(order.subscription);
        if (!subscription) throw new AppError('Subscription not found', 404);

        order.status = 'paid';
        order.razorpayPaymentId = razorpayPaymentId;
        order.razorpaySignature = razorpaySignature;
        order.paidAt = new Date();
        await order.save();

        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + (subscription.durationDays * 24 * 60 * 60 * 1000));

        const userSub = await UserSubscription.create({
            user: userId,
            subscription: subscription._id,
            order: order._id,
            startDate,
            endDate,
            isActive: true
        });

        return { success: true, userSubscription: userSub };
    }
}

module.exports = new SubscriptionService();
