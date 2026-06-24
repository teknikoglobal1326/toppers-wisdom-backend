const BaseRepository = require('../../core/BaseRepository')
const User = require('../../models/User.model')

class UserRepository extends BaseRepository {
  constructor() {
    super(User, 'user')
  }

  // Only user-specific queries here. Everything else comes from BaseRepository.

  async findByPhone(phone) {
    return this.findOne({ phone })
  }

  async updateSubExam(userId, qualification, examType, subExam) {
    return this.updateById(userId, {
      qualification: { _id: qualification._id, name: qualification.name },
      examType:      { _id: examType._id,      name: examType.name },
      subExam:       { _id: subExam._id,        name: subExam.name },
      profileComplete: true,
    })
  }

  async getSavedItems(userId) {
    const user = await this.findById(userId, { select: 'savedItems' })
    return user?.savedItems || []
  }

  async addSavedItem(userId, item) {
    return this.pushToArray(userId, 'savedItems', item)   // BaseRepository.pushToArray
  }

  async removeSavedItem(userId, itemId) {
    return this.pullFromArray(userId, 'savedItems', { itemId })  // BaseRepository.pullFromArray
  }

  async addWatchDuration(userId, seconds) {
    return this.increment(userId, { watchDuration: seconds })   // BaseRepository.increment
  }
}

module.exports = new UserRepository()