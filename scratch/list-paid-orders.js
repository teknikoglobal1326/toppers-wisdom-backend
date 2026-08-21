const mongoose = require('mongoose');

async function run() {
  const mongoUri = 'mongodb+srv://mongodb:D9574Opjqpw5K78F@teknikoglobal.5wwbpjo.mongodb.net/toppers-wisdom';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const CourseOrder = require('../src/models/CourseOrder.model');
  const User = require('../src/models/User.model');

  const paidOrders = await CourseOrder.find({ status: 'paid' }).lean();
  console.log('Paid orders count:', paidOrders.length);
  for (const order of paidOrders) {
    const user = await User.findById(order.user).select('phone name email').lean();
    console.log(`Order ID: ${order._id} | User: ${user?.phone} (${user?.name}) | Items:`, order.items.map(i => i.itemId));
  }

  await mongoose.disconnect();
}

run().catch(console.error);
