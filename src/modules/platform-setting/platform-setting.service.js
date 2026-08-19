const BaseService = require('../../core/BaseService')
const platformSettingRepository = require('./platform-setting.repository')
const { createLogger } = require('../../config/logger')

class PlatformSettingService extends BaseService {
  constructor() {
    super(platformSettingRepository, 'platform-setting')
    this.logger = createLogger('platform-setting:service')
  }

  async getSettings() {
    return this.repository.getSingleSettings()
  }

  async updateSettings(data) {
    const settings = await this.repository.getSingleSettings()
    if (!settings) {
      return this.repository.create(data)
    }
    return this.repository.updateById(settings._id, data)
  }
}

module.exports = new PlatformSettingService()
