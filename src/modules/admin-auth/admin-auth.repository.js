const BaseRepository = require('../../core/BaseRepository')
const Admin = require('../../models/Admin.model')

class AdminAuthRepository extends BaseRepository {
  constructor() {
    super(Admin, 'admin-auth')
  }

  async findByEmail(email) {
    return this.model.findOne({ email }).select('+password')
  }
}

module.exports = new AdminAuthRepository()