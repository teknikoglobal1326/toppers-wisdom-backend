const Subscription = require('../../models/Subscription.model');
const UserSubscription = require('../../models/UserSubscription.model');
const SubscriptionOrder = require('../../models/SubscriptionOrder.model');
const User = require('../../models/User.model');
const { uploadFile } = require('../../lib/fileUpload');

// Create Subscription
exports.createSubscription = async (req, res, next) => {
  try {
    const { name, description, price, durationDays, isActive } = req.body;
    let { banner, tests, boosters } = req.body;

    if (typeof tests === 'string') {
      try { tests = JSON.parse(tests); } catch (e) { tests = []; }
    }
    if (typeof boosters === 'string') {
      try { boosters = JSON.parse(boosters); } catch (e) { boosters = []; }
    }

    if (Array.isArray(tests)) {
      tests = tests.map(t => ({ ...t, moduleType: t.moduleType ? t.moduleType.charAt(0).toUpperCase() + t.moduleType.slice(1) : t.moduleType }));
    }
    if (Array.isArray(boosters)) {
      boosters = boosters.map(b => ({ ...b, moduleType: b.moduleType ? b.moduleType.charAt(0).toUpperCase() + b.moduleType.slice(1) : b.moduleType }));
    }

    if (req.file) {
      const ext = req.file.originalname.split('.').pop().toLowerCase();
      banner = await uploadFile(
        req.file.buffer,
        `banner-${Date.now()}.${ext}`,
        `subscriptions/banners/new-${Date.now()}`,
        req.file.mimetype
      );
    }

    const newSubscription = new Subscription({
      name,
      description,
      price,
      durationDays,
      tests: tests || [],
      boosters: boosters || [],
      banner,
      createdBy: req.admin._id
    });

    await newSubscription.save();

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: newSubscription
    });
  } catch (error) {
    next(error);
  }
};

// Get All Subscriptions
exports.getAllSubscriptions = async (req, res, next) => {
  try {
    const subscriptions = await Subscription.find({ isDeleted: false })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    next(error);
  }
};

// Get Single Subscription
exports.getSubscriptionById = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({ _id: req.params.id, isDeleted: false })
      .populate('tests.moduleId', 'title thumbnail')
      .populate('boosters.moduleId', 'title thumbnail');

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    res.status(200).json({
      success: true,
      data: subscription
    });
  } catch (error) {
    next(error);
  }
};

// Update Subscription
exports.updateSubscription = async (req, res, next) => {
  try {
    const { name, description, price, durationDays, isActive } = req.body;
    let { banner, tests, boosters } = req.body;

    if (typeof tests === 'string') {
      try { tests = JSON.parse(tests); } catch (e) { tests = []; }
    }
    if (typeof boosters === 'string') {
      try { boosters = JSON.parse(boosters); } catch (e) { boosters = []; }
    }

    if (Array.isArray(tests)) {
      tests = tests.map(t => ({ ...t, moduleType: t.moduleType ? t.moduleType.charAt(0).toUpperCase() + t.moduleType.slice(1) : t.moduleType }));
    }
    if (Array.isArray(boosters)) {
      boosters = boosters.map(b => ({ ...b, moduleType: b.moduleType ? b.moduleType.charAt(0).toUpperCase() + b.moduleType.slice(1) : b.moduleType }));
    }

    const subscription = await Subscription.findOne({ _id: req.params.id, isDeleted: false });
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    subscription.name = name || subscription.name;
    subscription.description = description !== undefined ? description : subscription.description;
    subscription.price = price !== undefined ? price : subscription.price;
    subscription.durationDays = durationDays !== undefined ? durationDays : subscription.durationDays;


    if (tests) subscription.tests = tests;
    if (boosters) subscription.boosters = boosters;
    if (isActive !== undefined) subscription.isActive = isActive;

    if (req.file) {
      const ext = req.file.originalname.split('.').pop().toLowerCase();
      banner = await uploadFile(
        req.file.buffer,
        `banner-${Date.now()}.${ext}`,
        `subscriptions/banners/${subscription._id}`,
        req.file.mimetype
      );
    }
    if (banner) subscription.banner = banner;

    await subscription.save();

    res.status(200).json({
      success: true,
      message: 'Subscription updated successfully',
      data: subscription
    });
  } catch (error) {
    next(error);
  }
};

// Delete Subscription
exports.deleteSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Subscription deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get Purchased Subscription History with User Info
exports.getSubscriptionHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, subscriptionId, userId, search, isActive } = req.query;
    const filter = {};

    if (subscriptionId) {
      filter.subscription = subscriptionId;
    }
    if (userId) {
      filter.user = userId;
    }
    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    if (search) {
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      const userIds = matchingUsers.map(u => u._id);
      filter.user = { $in: userIds };
    }

    const total = await UserSubscription.countDocuments(filter);

    const history = await UserSubscription.find(filter)
      .populate('user', 'name phone email avatar')
      .populate('subscription', 'name price durationDays')
      .populate('order', 'amount currency status razorpayOrderId razorpayPaymentId paidAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    res.status(200).json({
      success: true,
      data: history,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

