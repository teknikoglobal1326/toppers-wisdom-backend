const Subscription = require('../../models/Subscription.model');
const UserSubscription = require('../../models/UserSubscription.model');
const SubscriptionOrder = require('../../models/SubscriptionOrder.model');
const User = require('../../models/User.model');
const { uploadFile } = require('../../lib/fileUpload');

const extractObjectIds = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) {
    let list = [];
    val.forEach(item => {
      list = list.concat(extractObjectIds(item));
    });
    return list;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        return extractObjectIds(JSON.parse(trimmed));
      } catch (e) {
        // Fall through
      }
    }
    return trimmed.split(',').map(id => id.trim().replace(/^["']|["']$/g, '')).filter(id => id.match(/^[0-9a-fA-F]{24}$/));
  }
  return [];
};

// Create Subscription
exports.createSubscription = async (req, res, next) => {
  try {
    const { name, description, price, durationDays, isActive, examId, examIds } = req.body;
    let { banner, tests, boosters, materials } = req.body;

    if (typeof tests === 'string') {
      try { tests = JSON.parse(tests); } catch (e) { tests = []; }
    }
    if (typeof boosters === 'string') {
      try { boosters = JSON.parse(boosters); } catch (e) { boosters = []; }
    }
    if (typeof materials === 'string') {
      try { materials = JSON.parse(materials); } catch (e) { materials = []; }
    }

    let parsedExamIds = [];
    if (examIds) {
      parsedExamIds = parsedExamIds.concat(extractObjectIds(examIds));
    }
    if (examId) {
      parsedExamIds = parsedExamIds.concat(extractObjectIds(examId));
    }
    parsedExamIds = [...new Set(parsedExamIds)];

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
      materials: materials || [],
      banner,
      examId: parsedExamIds.length > 0 ? parsedExamIds[0] : undefined,
      examIds: parsedExamIds,
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
      .populate('examId', 'name title')
      .populate('examIds', 'name title')
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
      .populate('boosters.moduleId', 'title thumbnail')
      .populate('examId', 'name title')
      .populate('examIds', 'name title');

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
    const { name, description, price, durationDays, isActive, examId, examIds } = req.body;
    let { banner, tests, boosters, materials } = req.body;

    if (typeof tests === 'string') {
      try { tests = JSON.parse(tests); } catch (e) { tests = []; }
    }
    if (typeof boosters === 'string') {
      try { boosters = JSON.parse(boosters); } catch (e) { boosters = []; }
    }
    if (typeof materials === 'string') {
      try { materials = JSON.parse(materials); } catch (e) { materials = []; }
    }

    let parsedExamIds;
    if (examIds !== undefined || examId !== undefined) {
      parsedExamIds = [];
      if (examIds !== undefined) {
        parsedExamIds = parsedExamIds.concat(extractObjectIds(examIds));
      }
      if (examId !== undefined) {
        parsedExamIds = parsedExamIds.concat(extractObjectIds(examId));
      }
      parsedExamIds = [...new Set(parsedExamIds)];
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

    if (parsedExamIds !== undefined) {
      subscription.examIds = parsedExamIds;
      subscription.examId = parsedExamIds.length > 0 ? parsedExamIds[0] : undefined;
    } else if (examId !== undefined) {
      subscription.examId = examId;
    }

    if (tests) subscription.tests = tests;
    if (boosters) subscription.boosters = boosters;
    if (materials) subscription.materials = materials;
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

    const [globalTotal, globalActive, globalInactive] = await Promise.all([
      UserSubscription.countDocuments({}),
      UserSubscription.countDocuments({ isActive: true }),
      UserSubscription.countDocuments({ isActive: false })
    ]);

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
        totalPages: Math.ceil(total / limitNum),
        globalTotal,
        globalActive,
        globalInactive
      }
    });
  } catch (error) {
    next(error);
  }
};

