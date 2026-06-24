/**
 * AuthRepository extends BaseRepository.
 * Gets findById, findOne, create, updateById, etc. for FREE.
 * Only adds auth-specific queries here.
 */
const BaseRepository = require('../../core/BaseRepository')
const User = require('../../models/User.model')

class AuthRepository extends BaseRepository {
  constructor() {
    super(User, 'auth')  // passes User model + 'auth' for logger context
  }

  // findByPhone is auth-specific — add it here
  async findByPhone(phone) {
    return this.findOne({ phone })  // uses BaseRepository.findOne
  }

  // findByPhone or create — upsert pattern
  async findOrCreate(phone) {
    return this.upsert({ phone }, { $setOnInsert: { phone, role: 'user' } })
  }
}

module.exports = new AuthRepository()