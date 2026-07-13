const Subscription = require('../../models/Subscription.model');

// Create Subscription
exports.createSubscription = async (req, res, next) => {
  try {
    const { name, description, price, durationDays, tests, boosters } = req.body;

    const newSubscription = new Subscription({
      name,
      description,
      price,
      durationDays,
      tests: tests || [],
      boosters: boosters || [],
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
    const { name, description, price, durationDays, tests, boosters, isActive } = req.body;

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
