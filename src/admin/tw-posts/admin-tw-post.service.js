const path = require('path')
const BaseService = require('../../core/BaseService')
const twPostRepository = require('../../modules/tw-post/tw-post.repository')
const AppError = require('../../core/AppError')
const { uploadFile } = require('../../lib/fileUpload')

class AdminTWPostService extends BaseService {
  constructor() {
    super(twPostRepository, 'admin:twpost')
  }

  async listAll({ status, type, sortOrder, page, limit, search } = {}) {
    const filter = { isDeleted: false }
    if (status) filter.status = status
    if (type) filter.type = type
    if (search) filter.title = new RegExp(search, 'i')
    const direction = sortOrder === 'desc' ? -1 : 1
    return this.getAll(filter, { page, limit, sort: { sortOrder: direction, createdAt: -1 } })
  }

  async getOne(id) {
    const post = await twPostRepository.findOne({ _id: id, isDeleted: false })
    if (!post) throw new AppError('TW Post not found', 404, 'NOT_FOUND')
    return post
  }

  async processImage(file, base64String) {
    if (file) {
      const ext = path.extname(file.originalname) || '.jpg'
      const timestamp = Date.now()
      const folder = `tw-posts/new-${timestamp}`
      const filename = `post-${timestamp}${ext}`
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
        const folder = `tw-posts/new-${timestamp}`
        const filename = `post-${timestamp}${ext}`
        return uploadFile(buffer, filename, folder, mimeType)
      }
    }
    return null
  }

  async createPost(data, file) {
    const payload = { ...data }
    
    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSortOrder = Number(payload.sortOrder)
      if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
    }
    
    const processedImage = await this.processImage(file, data.image)
    if (processedImage) {
      payload.image = processedImage
    } else if (payload.image && typeof payload.image === 'string' && payload.image.startsWith('data:image/')) {
      delete payload.image
    }
    
    return this.create(payload)
  }

  async updatePost(id, data, file) {
    const post = await twPostRepository.findOne({ _id: id, isDeleted: false })
    if (!post) throw new AppError('TW Post not found', 404, 'NOT_FOUND')
    const payload = { ...data }
    
    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSortOrder = Number(payload.sortOrder)
      if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
    }

    const processedImage = await this.processImage(file, data.image)
    if (processedImage) {
      payload.image = processedImage
    } else if (payload.image && typeof payload.image === 'string' && payload.image.startsWith('data:image/')) {
      delete payload.image
    }
    
    return twPostRepository.updateById(id, payload)
  }

  async softDelete(id) {
    const post = await twPostRepository.findOne({ _id: id, isDeleted: false })
    if (!post) throw new AppError('TW Post not found', 404, 'NOT_FOUND')
    await twPostRepository.updateById(id, { isDeleted: true })
  }
}

module.exports = new AdminTWPostService()
