const BaseRepository = require('../../core/BaseRepository')
const Faq = require('../../models/Faq.model')

class FaqRepository extends BaseRepository {
  constructor() {
    super(Faq, 'faq')
  }
}

module.exports = new FaqRepository()
