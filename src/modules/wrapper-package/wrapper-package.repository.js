const BaseRepository = require('../../core/BaseRepository')
const WrapperPackage = require('../../models/WrapperPackage.model')

class WrapperPackageRepository extends BaseRepository {
  constructor() {
    super(WrapperPackage, 'wrapper-package')
  }
}

module.exports = new WrapperPackageRepository()
