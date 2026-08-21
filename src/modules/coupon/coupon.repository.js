const BaseRepository = require('../../core/BaseRepository')
const Coupon = require('../../models/Coupon.model')

class CouponRepository extends BaseRepository {
  constructor() {
    super(Coupon, 'coupon')
  }
}

module.exports = new CouponRepository()
