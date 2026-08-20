const path = require('path')
const BaseService = require('../../core/BaseService')
const facultyRepository = require('../../modules/faculty/faculty.repository')
const Faculty = require('../../models/Faculty.model')
const AppError = require('../../core/AppError')
const { uploadFile } = require('../../lib/fileUpload')

class AdminFacultyService extends BaseService {
  constructor() {
    super(facultyRepository, 'admin:faculty')
  }

  async processImage(file, base64String) {
    if (file) {
      const ext = path.extname(file.originalname) || '.jpg'
      const timestamp = Date.now()
      const folder = `faculties/${timestamp}`
      const filename = `faculty-${timestamp}${ext}`
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
        const folder = `faculties/${timestamp}`
        const filename = `faculty-${timestamp}${ext}`
        return uploadFile(buffer, filename, folder, mimeType)
      }
    }
    return null
  }

  async listAll({ search, status, examId, subexamId, courseId, sortOrder, page, limit } = {}) {
    const filter = { isDeleted: false }

    if (status && status !== 'all') {
      filter.status = status.toLowerCase()
    }

    if (examId && examId !== 'null' && examId !== 'undefined') {
      filter.examId = examId
    }

    if (subexamId && subexamId !== 'null' && subexamId !== 'undefined') {
      filter.subexamId = subexamId
    }

    if (courseId && courseId !== 'null' && courseId !== 'undefined') {
      filter.courseId = courseId
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } }
      ]
    }

    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = Math.max(1, Number(limit) || 10)
    const skip = (pageNum - 1) * limitNum
    const sortDirection = sortOrder === 'asc' ? 1 : -1

    const [total, data, globalTotal, globalActive, globalInactive] = await Promise.all([
      Faculty.countDocuments(filter),
      Faculty.find(filter)
        .sort({ sortOrder: 1, createdAt: sortDirection })
        .skip(skip)
        .limit(limitNum)
        .populate('examId', 'name')
        .populate('subexamId', 'name')
        .populate('subjectId', 'name')
        .populate('courseId', 'title')
        .lean(),
      Faculty.countDocuments({ isDeleted: false }),
      Faculty.countDocuments({ isDeleted: false, status: 'active' }),
      Faculty.countDocuments({ isDeleted: false, status: 'inactive' })
    ])

    return {
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
        globalTotal,
        globalActive,
        globalInactive
      }
    }
  }

  async getOne(id) {
    const faculty = await Faculty.findOne({ _id: id, isDeleted: false })
      .populate('examId', 'name')
      .populate('subexamId', 'name')
      .populate('subjectId', 'name')
      .populate('courseId', 'title')
    if (!faculty) throw new AppError('Faculty member not found', 404, 'NOT_FOUND')
    return faculty
  }

  async createFaculty(data, file, adminId) {
    const payload = { ...data }

    // Normalize field names
    if (!payload.name && payload.facultyName) payload.name = payload.facultyName
    if (!payload.bio && payload.description) payload.bio = payload.description
    if (payload.status) payload.status = payload.status.toLowerCase()

    // Clean ObjectId empty strings
    if (payload.examId === '' || payload.examId === 'null' || payload.examId === 'undefined') payload.examId = null
    if (payload.subexamId === '' || payload.subexamId === 'null' || payload.subexamId === 'undefined') payload.subexamId = null
    if (payload.courseId === '' || payload.courseId === 'null' || payload.courseId === 'undefined') payload.courseId = null
    if (payload.subjectId === '' || payload.subjectId === 'null' || payload.subjectId === 'undefined') payload.subjectId = null

    if (adminId) payload.createdBy = adminId

    const imageInput = payload.image || payload.profilePhoto
    const processedImage = await this.processImage(file, imageInput)

    if (processedImage) {
      payload.image = processedImage
    } else if (imageInput && typeof imageInput === 'string' && !imageInput.startsWith('data:image/')) {
      payload.image = imageInput
    } else {
      delete payload.image
    }
    delete payload.profilePhoto

    const faculty = await Faculty.create(payload)
    return this.getOne(faculty._id)
  }

  async updateFaculty(id, data, file, _adminId) {
    const faculty = await Faculty.findOne({ _id: id, isDeleted: false })
    if (!faculty) throw new AppError('Faculty member not found', 404, 'NOT_FOUND')

    const payload = { ...data }

    if (payload.facultyName && !payload.name) payload.name = payload.facultyName
    if (payload.description && !payload.bio) payload.bio = payload.description
    if (payload.status) payload.status = payload.status.toLowerCase()

    if (payload.examId === '' || payload.examId === 'null' || payload.examId === 'undefined') payload.examId = null
    if (payload.subexamId === '' || payload.subexamId === 'null' || payload.subexamId === 'undefined') payload.subexamId = null
    if (payload.courseId === '' || payload.courseId === 'null' || payload.courseId === 'undefined') payload.courseId = null
    if (payload.subjectId === '' || payload.subjectId === 'null' || payload.subjectId === 'undefined') payload.subjectId = null

    const imageInput = payload.image || payload.profilePhoto
    const processedImage = await this.processImage(file, imageInput)

    if (processedImage) {
      payload.image = processedImage
    } else if (imageInput && typeof imageInput === 'string' && !imageInput.startsWith('data:image/')) {
      payload.image = imageInput
    } else if (imageInput === '' || imageInput === null) {
      payload.image = null
    } else if (imageInput && typeof imageInput === 'string' && imageInput.startsWith('data:image/')) {
      delete payload.image
    }
    delete payload.profilePhoto

    Object.assign(faculty, payload)
    await faculty.save()

    return this.getOne(id)
  }

  async softDelete(id) {
    const faculty = await Faculty.findOne({ _id: id, isDeleted: false })
    if (!faculty) throw new AppError('Faculty member not found', 404, 'NOT_FOUND')

    faculty.isDeleted = true
    await faculty.save()
    this.logger.info({ facultyId: id }, 'Faculty member soft deleted')
    return true
  }

  async hardDelete(id) {
    const faculty = await Faculty.findOne({ _id: id })
    if (!faculty) throw new AppError('Faculty member not found', 404, 'NOT_FOUND')

    await Faculty.deleteOne({ _id: id })
    this.logger.info({ facultyId: id }, 'Faculty member permanently deleted')
    return true
  }
}

module.exports = new AdminFacultyService()
