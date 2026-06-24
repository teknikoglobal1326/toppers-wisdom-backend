const BaseRepository = require('../../core/BaseRepository')
const Banner = require('../../models/Banner.model')

class BannerRepository extends BaseRepository {
  constructor() {
    super(Banner, 'banner')
  }
}

module.exports = new BannerRepository()