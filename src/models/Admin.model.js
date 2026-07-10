const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const MODULES = ['courses', 'tests', 'boosters', 'users', 'blog', 'analytics', 'notifications', 'admins', 'exams', 'subexams', 'subjects', 'banners', 'topics', 'grammars', 'faqs', 'pdfs', 'shorts', 'qualifications', 'books', 'vocabulary', 'editorial']

const ROLE_PERMISSIONS = {
  superadmin: MODULES,
  manager: ['courses', 'tests', 'boosters', 'users', 'blog', 'analytics', 'notifications', 'exams', 'subexams', 'subjects', 'banners', 'topics', 'grammars', 'faqs', 'pdfs', 'shorts', 'qualifications', 'books', 'vocabulary', 'editorial'],
  editor: ['courses', 'tests', 'boosters', 'blog', 'exams', 'subexams', 'subjects', 'banners', 'topics', 'grammars', 'faqs', 'pdfs', 'shorts', 'qualifications', 'books', 'vocabulary', 'editorial'],
  viewer: ['analytics'],
}

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['superadmin', 'manager', 'editor', 'viewer'], default: 'editor' },
  permissions: { type: [String], enum: MODULES, default: [] },
  isActive: { type: Boolean, default: true, index: true },
  lastLoginAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true })

adminSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12)
  }
})

adminSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password)
}

// Empty permissions array means fall back to role defaults
adminSchema.methods.hasPermission = function (module) {
  const perms = this.permissions.length ? this.permissions : ROLE_PERMISSIONS[this.role] || []
  return perms.includes(module)
}

const Admin = mongoose.model('Admin', adminSchema)

module.exports = Admin
module.exports.MODULES = MODULES
module.exports.ROLE_PERMISSIONS = ROLE_PERMISSIONS