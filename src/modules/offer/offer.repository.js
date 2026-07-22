const BaseRepository = require('../../core/BaseRepository')
const Offer = require('../../models/Offer.model')

class OfferRepository extends BaseRepository {
  constructor() {
    super(Offer, 'offer')
  }
}

module.exports = new OfferRepository()
