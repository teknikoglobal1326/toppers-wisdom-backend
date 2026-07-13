const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb+srv://mongodb:D9574Opjqpw5K78F@teknikoglobal.5wwbpjo.mongodb.net/toppers-wisdom');
  console.log("Connected to DB");
  const exams = await mongoose.connection.db.collection('exams').find({}).limit(5).toArray();
  console.log(JSON.stringify(exams, null, 2));
  mongoose.disconnect();
}
main();
