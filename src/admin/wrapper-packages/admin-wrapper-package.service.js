const path = require('path')
const BaseService = require('../../core/BaseService')
const wrapperPackageRepository = require('../../modules/wrapper-package/wrapper-package.repository')
const AppError = require('../../core/AppError')
const { uploadFile } = require('../../lib/fileUpload')
const { createLogger } = require('../../config/logger')

class AdminWrapperPackageService extends BaseService {
  constructor() {
    super(wrapperPackageRepository, 'admin:wrapper-package')
    this.logger = createLogger('admin:wrapper-package:service')
  }

  async listAll({ status, page, limit, search, exam, type } = {}) {
    const filter = { isDeleted: false }
    if (status && status !== 'all') filter.status = status
    if (type && type !== 'all') filter.type = type
    if (search) filter.title = new RegExp(search, 'i')
    if (exam) filter.exam = exam
    
    const result = await this.getAll(filter, { 
      page, 
      limit, 
      sort: { sortOrder: 1, createdAt: -1 }, 
      populate: [
        { path: 'exam', select: 'name hiName enName' },
        { path: 'courses', select: 'title price type mrp' }
      ]
    })

    return result
  }

  async getOne(id) {
    const pkg = await wrapperPackageRepository.findOne({ _id: id, isDeleted: false }, {
      populate: [
        { path: 'exam', select: 'name hiName enName' },
        { path: 'courses', select: 'title price type mrp' }
      ]
    })
    if (!pkg) throw new AppError('Wrapper package not found', 404, 'NOT_FOUND')
    return pkg
  }

  async uploadImage(file) {
    if (!file) return null
    const ext = path.extname(file.originalname) || '.jpg'
    const filename = `${Date.now()}${ext}`
    return uploadFile(file.buffer, filename, 'wrapper-packages', file.mimetype)
  }

  async createPackage(data, file) {
    const payload = { ...data }
    
    // Parse courses if it's sent as a stringified array
    if (typeof payload.courses === 'string') {
      try {
        payload.courses = JSON.parse(payload.courses)
      } catch (e) {
        payload.courses = [payload.courses]
      }
    }

    if (payload.price !== undefined && payload.price !== null && payload.price !== '') {
      const parsedPrice = Number(payload.price)
      payload.price = !Number.isNaN(parsedPrice) ? parsedPrice : 0
    } else {
      payload.price = 0
    }

    if (payload.mrp !== undefined && payload.mrp !== null && payload.mrp !== '') {
      const parsedMrp = Number(payload.mrp)
      payload.mrp = !Number.isNaN(parsedMrp) ? parsedMrp : 0
    } else {
      payload.mrp = 0
    }

    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSort = Number(payload.sortOrder)
      payload.sortOrder = !Number.isNaN(parsedSort) ? parsedSort : 0
    } else {
      payload.sortOrder = 0
    }

    if (payload.isFree !== undefined) {
      payload.isFree = payload.isFree === true || payload.isFree === 'true'
    }

    if (payload.type === 'free' || payload.isFree) {
      payload.isFree = true
      payload.type = 'free'
      payload.price = 0
      payload.mrp = 0
    } else if (!payload.type) {
      payload.type = 'recorded'
    }
    
    const image = await this.uploadImage(file)
    if (image) payload.image = image
    return this.create(payload)
  }

  async updatePackage(id, data, file) {
    const pkg = await wrapperPackageRepository.findOne({ _id: id, isDeleted: false })
    if (!pkg) throw new AppError('Wrapper package not found', 404, 'NOT_FOUND')
    
    const payload = { ...data }
    
    // Parse courses if it's sent as a stringified array
    if (typeof payload.courses === 'string') {
      try {
        payload.courses = JSON.parse(payload.courses)
      } catch (e) {
        payload.courses = [payload.courses]
      }
    }

    if (payload.price !== undefined && payload.price !== null && payload.price !== '') {
      const parsedPrice = Number(payload.price)
      payload.price = !Number.isNaN(parsedPrice) ? parsedPrice : 0
    }

    if (payload.mrp !== undefined && payload.mrp !== null && payload.mrp !== '') {
      const parsedMrp = Number(payload.mrp)
      payload.mrp = !Number.isNaN(parsedMrp) ? parsedMrp : 0
    }

    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSort = Number(payload.sortOrder)
      payload.sortOrder = !Number.isNaN(parsedSort) ? parsedSort : 0
    }

    if (payload.isFree !== undefined) {
      payload.isFree = payload.isFree === true || payload.isFree === 'true'
    }

    if (payload.type === 'free' || payload.isFree) {
      payload.isFree = true
      payload.type = 'free'
      payload.price = 0
      payload.mrp = 0
    }
    
    if (file) {
      payload.image = await this.uploadImage(file)
    }
    return wrapperPackageRepository.updateById(id, payload)
  }

  async softDelete(id) {
    const pkg = await wrapperPackageRepository.findOne({ _id: id, isDeleted: false })
    if (!pkg) throw new AppError('Wrapper package not found', 404, 'NOT_FOUND')
    await wrapperPackageRepository.updateById(id, { isDeleted: true })
    this.logger.info({ packageId: id }, 'Wrapper package soft deleted')
  }
}

module.exports = new AdminWrapperPackageService()
