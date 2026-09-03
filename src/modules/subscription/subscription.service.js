/* eslint-disable no-console */
const Subscription = require('../../models/Subscription.model');
const mongoose = require('mongoose');

class SubscriptionService {
    async checkSubscriptions(type, id, user) {
        if (!type) {
            return [];
        }

        const objectId = id && mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
        const filter = { isActive: true, isDeleted: false };
        const queryOptions = [];

        const typeStr = type.toLowerCase();


        if (typeStr === 'editorial') {
            if (!objectId) {
                queryOptions.push({ 'boosters.moduleType': { $in: ['Editorial', 'editorial'] } });
            } else {
                queryOptions.push({
                    $or: [
                        {
                            boosters: {
                                $elemMatch: {
                                    moduleType: { $in: ['Editorial', 'editorial'] },
                                    $or: [
                                        { moduleId: { $exists: false } },
                                        { moduleId: { $size: 0 } }
                                    ]
                                }
                            }
                        },
                        {
                            boosters: {
                                $elemMatch: {
                                    moduleType: { $in: ['Editorial', 'editorial'] },
                                    moduleId: objectId
                                }
                            }
                        }
                    ]
                });
            }
        } else if (['test-series', 'testseries'].includes(typeStr)) {
            if (objectId) queryOptions.push({ 'tests': { $elemMatch: { moduleType: 'TestSeries', moduleId: objectId } } });
        } else if (['previous-year-paper', 'previousyearpaper'].includes(typeStr)) {
            if (objectId) queryOptions.push({ 'tests': { $elemMatch: { moduleType: 'PreviousYearPaper', moduleId: objectId } } });
        } else if (['live-test-series', 'livetestseries'].includes(typeStr)) {
            if (objectId) queryOptions.push({ 'tests': { $elemMatch: { moduleType: 'LiveTestSeries', moduleId: objectId } } });
        } else if (['sectional-test', 'sectionaltest', 'sectionaltestseries', 'sectional-test-series'].includes(typeStr)) {
            if (objectId) queryOptions.push({ 'tests': { $elemMatch: { moduleType: { $in: ['SectionalTestSeries', 'SectionalTest'] }, moduleId: objectId } } });
        } else if (typeStr === 'vocabulary') {
            if (objectId) queryOptions.push({ 'boosters': { $elemMatch: { moduleType: { $in: ['Vocabulary', 'vocabulary'] }, moduleId: objectId } } });
        } else {
            if (objectId) {
                queryOptions.push({ 'tests.moduleId': objectId });
                queryOptions.push({ 'boosters.moduleId': objectId });
            }
        }

        if (queryOptions.length > 0) {
            filter.$and = filter.$and || [];
            filter.$and.push({ $or: queryOptions });
        }

        let examId = null;
        if (user) {
            const User = require('../../models/User.model');
            const userDoc = await User.findById(user._id).select('exam').lean();
            if (userDoc?.exam) {
                examId = userDoc.exam;
            } else if (user.examId) {
                examId = user.examId;
            }
        }

        if (examId) {
            filter.$and = filter.$and || [];
            filter.$and.push({
                $or: [
                    { examIds: examId },
                    { examId: examId }
                ]
            });
        }


        const subscriptions = await Subscription.find(filter)
            .select('name description price durationDays tests boosters banner isPremium')
            .lean();

        return subscriptions.map(sub => ({
            _id: sub._id,
            name: sub.name,
            description: sub.description,
            price: sub.price,
            durationDays: sub.durationDays,
            isPremium: Boolean(sub.isPremium),
            image: sub.banner || null
        }));
    }

    async purchaseSubscription(userId, subscriptionId, couponCode = null) {
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

        let discount = 0;
        let grandTotal = subscription.price;
        let appliedCoupon = null;

        if (couponCode) {
            const couponService = require('../coupon/coupon.service');
            const validation = await couponService.validateAndCalculateDiscount(couponCode, userId, subscription.price);
            if (validation.isValid) {
                discount = validation.discountAmount;
                grandTotal = subscription.price - discount;
                appliedCoupon = validation.couponApplied;
            }
        }

        let rzpOrder = null;
        if (grandTotal > 0) {
            rzpOrder = await razorpay.orders.create({
                amount: Math.round(grandTotal * 100),
                currency: 'INR',
                receipt: `sub_receipt_${Date.now()}`
            });
            console.log(`[SubscriptionService] Razorpay order created: ${rzpOrder.id} for amount ${grandTotal}`);
        } else {
            console.log(`[SubscriptionService] Free subscription/coupon applied. No Razorpay order needed.`);
        }

        const subscriptionDetails = {
            name: subscription.name,
            description: subscription.description,
            price: subscription.price
        };

        console.log(`[SubscriptionService] Creating SubscriptionOrder for user: ${userId}, subscription: ${subscription._id}`);
        console.log(`[SubscriptionService] Supplying fields: duration=${subscription.durationDays}, isActive=${subscription.isActive}, subscriptionDetails=${JSON.stringify(subscriptionDetails)}`);

        const orderData = {
            user: userId,
            subscription: subscription._id,
            amount: grandTotal, // storing discounted amount as final amount
            currency: 'INR',
            razorpayOrderId: rzpOrder ? rzpOrder.id : null,
            status: grandTotal > 0 ? 'pending' : 'paid',
            paidAt: grandTotal > 0 ? null : new Date(),
            duration: subscription.durationDays,
            isActive: subscription.isActive,
            couponApplied: appliedCoupon,
            subscriptionDetails
        };

        const order = await SubscriptionOrder.create(orderData);

        console.log(`[SubscriptionService] Created Order ID: ${order._id}. Saved fields: duration=${order.duration}, isActive=${order.isActive}, detailsExists=${!!order.subscriptionDetails}`);

        if (orderData.status === 'paid') {
            await this.activateSubscriptionForFreeOrder(order);
            return {
                orderId: order._id,
                razorpayOrderId: null,
                amount: grandTotal,
                currency: 'INR',
                keyId: null,
                status: 'paid',
                payment_status: 'success'
            };
        }

        return {
            orderId: order._id,
            razorpayOrderId: rzpOrder.id,
            amount: grandTotal,
            currency: 'INR',
            keyId: process.env.RAZORPAY_KEY_ID,
            status: 'pending',
            payment_status: 'pending'
        };
    }

    async activateSubscriptionForFreeOrder(order) {
        const UserSubscription = require('../../models/UserSubscription.model');
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + (order.duration || 0));

        await UserSubscription.create({
            user: order.user,
            subscription: order.subscription,
            order: order._id,
            startDate: new Date(),
            endDate,
            status: 'active'
        });

        if (order.couponApplied && order.couponApplied.code) {
            const Coupon = require('../../models/Coupon.model');
            await Coupon.updateOne({ code: order.couponApplied.code }, { $inc: { usageCount: 1 } });
        }
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

        await UserSubscription.create({
            user: userId,
            subscription: order.subscription,
            order: order._id,
            startDate: new Date(),
            endDate,
            status: 'active'
        });

        if (order.couponApplied && order.couponApplied.code) {
            const Coupon = require('../../models/Coupon.model');
            await Coupon.updateOne({ code: order.couponApplied.code }, { $inc: { usageCount: 1 } });
        }

        console.log(`[SubscriptionService] Subscription activated for user: ${userId}, Order: ${order._id}`);

        try {
            const { notificationQueue } = require('../../jobs/queue');
            await notificationQueue.add('subscription-success', {
                userId,
                orderId: order._id,
                amount: order.amount
            });
        } catch (err) {
            console.error('Failed to queue subscription success notification:', err);
        }

        return { success: true, userSubscription: UserSubscription };
    }
}

module.exports = new SubscriptionService();
