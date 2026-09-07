const mongoose = require('mongoose')

const offerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    image: { type: String, required: true },
    type: { type: String, enum: ["course", "testSeries", "subscription"], required: true },
    itemModel: { type: String, enum: ["Course", "TestSeries", "Subscription"] },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: false, refPath: "itemModel" },
    exams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exam' }],
    subExams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SubExam' }],
    subscriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' }],
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

function setItemModel(doc) {
  if (doc && doc.type) {
    if (doc.type === 'course') doc.itemModel = 'Course';
    else if (doc.type === 'testSeries') doc.itemModel = 'TestSeries';
    else if (doc.type === 'subscription') doc.itemModel = 'Subscription';
  }
}

offerSchema.pre('save', function (next) {
  setItemModel(this);
  next();
});

offerSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update) {
    if (update.type === 'course') update.itemModel = 'Course';
    else if (update.type === 'testSeries') update.itemModel = 'TestSeries';
    else if (update.type === 'subscription') update.itemModel = 'Subscription';
    else if (update.$set && update.$set.type) {
      if (update.$set.type === 'course') update.$set.itemModel = 'Course';
      if (update.$set.type === 'testSeries') update.$set.itemModel = 'TestSeries';
      if (update.$set.type === 'subscription') update.$set.itemModel = 'Subscription';
    }
  }
  next();
});

module.exports = mongoose.model("Offer", offerSchema);
