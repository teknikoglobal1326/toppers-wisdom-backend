const BaseRepository = require('../../core/BaseRepository')
const Booster        = require('../../models/Booster.model')

class BoosterRepository extends BaseRepository {
  constructor() { super(Booster, 'booster') }
}

module.exports = new BoosterRepository()
