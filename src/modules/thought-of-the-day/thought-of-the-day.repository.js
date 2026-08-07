const BaseRepository = require('../../core/BaseRepository')
const ThoughtOfTheDay = require('../../models/ThoughtOfTheDay.model')

class ThoughtOfTheDayRepository extends BaseRepository {
  constructor() {
    super(ThoughtOfTheDay, 'thoughtoftheday')
  }
}

module.exports = new ThoughtOfTheDayRepository()
