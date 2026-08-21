const mongoose = require('mongoose');

async function run() {
  const mongoUri = 'mongodb+srv://mongodb:D9574Opjqpw5K78F@teknikoglobal.5wwbpjo.mongodb.net/toppers-wisdom';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const testId = '6a868f01b05c062660750b49';
  
  // Find in CourseTest
  const CourseTest = require('../src/models/CourseTest.model');
  const CourseSeparatedTest = require('../src/models/CourseSeparatedTest.model');

  let test = await CourseTest.findById(testId).lean();
  let modelName = 'CourseTest';
  if (!test) {
    test = await CourseSeparatedTest.findById(testId).lean();
    modelName = 'CourseSeparatedTest';
  }

  console.log('Test found in:', modelName);
  console.log('Test Details:', test);

  if (test) {
    const courseId = test.course;
    console.log('Course ID:', courseId);

    // Let's check for any purchases/orders for courseId
    const CourseOrder = require('../src/models/CourseOrder.model');
    const Enrollment = require('../src/models/Enrollment.model');

    const enrollments = await Enrollment.find({ course: courseId }).lean();
    console.log('Enrollments for course:', enrollments);

    const orders = await CourseOrder.find({ 'items.itemId': courseId }).lean();
    console.log('Orders for course:', orders);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
