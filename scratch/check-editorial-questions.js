const mongoose = require('mongoose');

async function check() {
  const { connectDB } = require('../src/config/database');
  await connectDB();
  console.log("Connected to DB");

  const QuestionModel = require('../src/models/Question.model');
  const testId = '6a86f71b1aaf53909c160c6a';

  // Let's find any question that mentions this ID in any field
  const allFields = ['test', 'editorialTest', 'editorial', 'testSeries', 'liveTest', 'mathTest', 'dailyQuiz'];
  for (const field of allFields) {
    try {
      const count = await QuestionModel.countDocuments({ [field]: testId });
      if (count > 0) {
        console.log(`FOUND in standard Question model under field [${field}]: ${count} questions.`);
        const sample = await QuestionModel.find({ [field]: testId }).limit(1).lean();
        console.log("Sample:", JSON.stringify(sample, null, 2));
      }
    } catch (e) {
      // Ignored
    }
  }

  // Let's also search EditorialQuestion again but without isDeleted or status filters, just in case
  const EditorialQuestion = require('../src/models/EditorialQuestion.model');
  const rawCount = await EditorialQuestion.countDocuments({});
  console.log("Total raw documents in EditorialQuestion collection:", rawCount);

  await mongoose.disconnect();
}

check().catch(console.error);
