const BaseRepository = require('../../core/BaseRepository')
const Booster        = require('../../models/Booster.model')

class BoosterRepository extends BaseRepository {
  constructor() { super(Booster, 'booster') }

  async findItemById(boosterId, itemId) {
    const booster = await this.findById(boosterId)
    if (!booster) return null
    const item = booster.items.find((i) => i._id.toString() === itemId)
    return { booster, item }
  }

  async addItem(boosterId, item) {
    return this.pushToArray(boosterId, 'items', item)
  }

  async removeItem(boosterId, itemId) {
    return this.pullFromArray(boosterId, 'items', { _id: itemId })
  }

  async updateItem(boosterId, itemId, data) {
    return this.model.findOneAndUpdate(
      { _id: boosterId, 'items._id': itemId },
      { $set: { 'items.$': { ...data, _id: itemId } } },
      { new: true }
    ).lean()
  }
}

module.exports = new BoosterRepository()
