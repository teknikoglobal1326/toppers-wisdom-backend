const mongoose = require('mongoose');
const courseTestService = require('../src/modules/course-test/course-test.service');

async function run() {
  const mongoUri = 'mongodb+srv://mongodb:D9574Opjqpw5K78F@teknikoglobal.5wwbpjo.mongodb.net/toppers-wisdom';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const userId = '6a869105039ea03f58943e7c';
  const testId = '6a868f01b05c062660750b49';

  try {
    const result = await courseTestService.getInstruction(testId, userId, 'hi');
    console.log('Success! Result:', result);
  } catch (err) {
    console.error('Error caught:', err);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
