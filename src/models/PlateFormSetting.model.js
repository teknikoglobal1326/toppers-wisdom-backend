const mongoose = require('mongoose')

const plateFormSettingSchema = new mongoose.Schema({
  siteName:          { type: String, trim: true, default: "Toppers Wisdom" },
  siteLogo:          { type: String, default: "" },
  supportEmail:      { type: String, trim: true, default: "support@topperswisdom.com" },
  supportPhone:      { type: String, trim: true, default: "+91-9999999999" },
  supportWhatsapp:   { type: String, trim: true, default: "+91-9999999999" },
  officeAddress:     { type: String, trim: true, default: "New Delhi, India" },
  platformFee:       { type: Number, default: 0 },
  gst:               { type: Number, default: 0 },
  appVersion:        { type: String, default: "1.0.0" },
  razorpayKeyId:     { type: String, default: "" },
  razorpaySecretKey: { type: String, default: "" },
  openaiApiKey:      { type: String, default: "" },
  prompt1:           { type: String, default: "" },
  prompt2:           { type: String, default: "" },
  instagramUrl:      { type: String, default: "" },
  facebookUrl:       { type: String, default: "" },
  youtubeUrl:        { type: String, default: "" },
  telegramUrl:       { type: String, default: "" },
}, { timestamps: true })

module.exports = mongoose.model('PlateFormSetting', plateFormSettingSchema)
