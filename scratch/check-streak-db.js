const mongoose = require('mongoose');

async function run() {
  const mongoUri = 'mongodb+srv://mongodb:D9574Opjqpw5K78F@teknikoglobal.5wwbpjo.mongodb.net/toppers-wisdom';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const userId = '6a7d5253039ea03f5893f60b';

  const Streak = require('../src/models/Streak.model');
  const DailyActivity = require('../src/models/DailyActivity.model');

  const streak = await Streak.findOne({ user: userId }).lean();
  console.log('Streak Document:', streak);

  const activities = await DailyActivity.find({ user: userId }).sort({ date: -1 }).limit(5).lean();
  console.log('Recent Daily Activities:', activities);

  await mongoose.disconnect();
}

run().catch(console.error);
