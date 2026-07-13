const mongoose = require('mongoose');

const testItemSchema = new mongoose.Schema({
  moduleType: { 
    type: String, 
    enum: ['TestSeries', 'PreviousYearPaper', 'LiveTestSeries'], 
    required: true 
  },
  moduleId: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    required: true,
    refPath: 'tests.moduleType'
  }]
}, { _id: false });

const boosterItemSchema = new mongoose.Schema({
  moduleType: { 
    type: String, 
    enum: ['Booster', 'Vocabulary', 'Editorial', 'vocabulary', 'editorial'], 
    required: true 
  },
  moduleId: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    required: true,
    refPath: 'boosters.moduleType'
  }]
}, { _id: false });

const subscriptionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String },
  price: { type: Number, required: true },
  durationDays: { type: Number, required: true },
  
  tests: [testItemSchema], 
  boosters: [boosterItemSchema],
  
  isActive: { type: Boolean, default: true, index: true },
  isDeleted: { type: Boolean, default: false, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
