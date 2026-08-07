const path = require('path')
const BaseService = require('../../core/BaseService')
const thoughtOfTheDayRepository = require('../../modules/thought-of-the-day/thought-of-the-day.repository')
const AppError = require('../../core/AppError')
const { uploadFile } = require('../../lib/fileUpload')

class AdminThoughtOfTheDayService extends BaseService {
  constructor() {
    super(thoughtOfTheDayRepository, 'admin:thoughtoftheday')
  }

  async listAll({ status, sortOrder, page, limit, search } = {}) {
    const filter = { isDeleted: false }
    if (status) filter.status = status
    if (search) filter.authorName = new RegExp(search, 'i')
    const direction = sortOrder === 'desc' ? -1 : 1
    return this.getAll(filter, { page, limit, sort: { sortOrder: direction, createdAt: -1 } })
  }

  async getOne(id) {
    const thought = await thoughtOfTheDayRepository.findOne({ _id: id, isDeleted: false })
    if (!thought) throw new AppError('Thought of the day not found', 404, 'NOT_FOUND')
    return thought
  }

  async processImage(file, base64String) {
    if (file) {
      const ext = path.extname(file.originalname) || '.jpg'
      const timestamp = Date.now()
      const folder = `thoughts/new-${timestamp}`
      const filename = `author-${timestamp}${ext}`
      return uploadFile(file.buffer, filename, folder, file.mimetype)
    }

    if (base64String && typeof base64String === 'string' && base64String.startsWith('data:image/')) {
      const parts = base64String.split(';base64,')
      if (parts.length === 2) {
        const mimeType = parts[0].replace('data:', '')
        const extMatch = mimeType.match(/image\/([a-zA-Z0-9-+/]+)/)
        let ext = '.jpg'
        if (extMatch && extMatch[1]) {
           ext = `.${extMatch[1] === 'jpeg' ? 'jpg' : extMatch[1]}`
        }
        const base64Data = parts[1].replace(/\s/g, '')
        const buffer = Buffer.from(base64Data, 'base64')
        const timestamp = Date.now()
        const folder = `thoughts/new-${timestamp}`
        const filename = `author-${timestamp}${ext}`
        return uploadFile(buffer, filename, folder, mimeType)
      }
    }
    return null
  }

  async createThought(data, file) {
    const payload = { ...data }
    
    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSortOrder = Number(payload.sortOrder)
      if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
    }
    
    const processedImage = await this.processImage(file, data.authorImage)
    if (processedImage) {
      payload.authorImage = processedImage
    } else if (payload.authorImage && typeof payload.authorImage === 'string' && payload.authorImage.startsWith('data:image/')) {
      delete payload.authorImage
    }
    
    return this.create(payload)
  }

  async updateThought(id, data, file) {
    const thought = await thoughtOfTheDayRepository.findOne({ _id: id, isDeleted: false })
    if (!thought) throw new AppError('Thought of the day not found', 404, 'NOT_FOUND')
    const payload = { ...data }
    
    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSortOrder = Number(payload.sortOrder)
      if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
    }

    const processedImage = await this.processImage(file, data.authorImage)
    if (processedImage) {
      payload.authorImage = processedImage
    } else if (payload.authorImage && typeof payload.authorImage === 'string' && payload.authorImage.startsWith('data:image/')) {
      delete payload.authorImage
    }
    
    return thoughtOfTheDayRepository.updateById(id, payload)
  }

  async softDelete(id) {
    const thought = await thoughtOfTheDayRepository.findOne({ _id: id, isDeleted: false })
    if (!thought) throw new AppError('Thought of the day not found', 404, 'NOT_FOUND')
    await thoughtOfTheDayRepository.updateById(id, { isDeleted: true })
  }
}

module.exports = new AdminThoughtOfTheDayService()
