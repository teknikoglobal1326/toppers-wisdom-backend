const BaseRepository = require('../../core/BaseRepository')
const PlateFormSetting = require('../../models/PlateFormSetting.model')

class PlatformSettingRepository extends BaseRepository {
  constructor() {
    super(PlateFormSetting, 'platform-setting')
  }

  async getSingleSettings() {
    return this.findOne({})
  }
}

module.exports = new PlatformSettingRepository()
