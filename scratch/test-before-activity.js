const mongoose = require('mongoose');
const rewardsService = require('../src/modules/rewards/rewards.service');

async function run() {
  const mongoUri = 'mongodb+srv://mongodb:D9574Opjqpw5K78F@teknikoglobal.5wwbpjo.mongodb.net/toppers-wisdom';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const userId = '6a7d5253039ea03f5893f60b';

  const DailyActivity = require('../src/models/DailyActivity.model');
  const Streak = require('../src/models/Streak.model');

  const originalActivity = await DailyActivity.findOne({ user: userId, date: rewardsService.getMidnight() });
  const originalStreak = await Streak.findOne({ user: userId });

  if (originalActivity && originalStreak) {
    // Mock the activity as not completed/not maintained
    const mockedActivity = {
      ...originalActivity.toObject(),
      streakMaintained: false,
      missions: {
        'test-series-test': false,
        pyp_paper: false,
        pyp_dictionary: false,
        ai_test: false
      }
    };

    // Mock the streak document's lastActivityDate to August 19th (2 days ago)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const mockedStreak = {
      ...originalStreak.toObject(),
      lastActivityDate: twoDaysAgo
    };

    // Override the repository query functions to return our mocks
    rewardsService.getTodayActivity = async () => mockedActivity;
    
    // Temporarily stub Streak.findOne
    const origFindOne = Streak.findOne;
    Streak.findOne = async () => mockedStreak;

    const result = await rewardsService.getTodayStreak(userId);
    console.log('\n--- Mocked "Before Activity" API Response (with last activity on August 19) ---');
    console.log(result);

    // Restore Streak.findOne
    Streak.findOne = origFindOne;
  }

  await mongoose.disconnect();
}

run().catch(console.error);
