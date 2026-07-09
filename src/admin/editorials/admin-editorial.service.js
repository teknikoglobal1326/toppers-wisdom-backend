const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const editorialRepository = require('../../modules/editorial/editorial.repository')

const makeSlug = (value = '') => value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

class AdminEditorialService extends BaseService {
    constructor() {
        super(editorialRepository, 'admin:editorial')
    }

    buildFilter({ type, status, isFree, editorialTest, search } = {}) {
        const filter = { isDeleted: false }
        if (type) filter.type = type
        if (status) filter.status = status
        if (typeof isFree === 'boolean') filter.isFree = isFree
        if (editorialTest) filter.editorialTest = editorialTest

        if (search) {
            const rx = new RegExp(search, 'i')
            filter.$or = [
                { title: rx },
                { shortDescription: rx },
                { description: rx },
            ]
        }

        return filter
    }

    async listAll(query = {}) {
        const filter = this.buildFilter(query)
        const direction = query.sortOrder === 'desc' ? -1 : 1
        const sortBy = query.sortBy || 'sortOrder'

        return this.getAll(filter, {
            page: query.page,
            limit: query.limit,
            sort: { [sortBy]: direction, createdAt: -1 },
            populate: [{ path: 'editorialTest', select: 'title status' }],
        })
    }

    async getOne(id) {
        const editorial = await editorialRepository.findOne(
            { _id: id, isDeleted: false },
            { populate: [{ path: 'editorialTest', select: 'title status' }] }
        )
        if (!editorial) throw new AppError('Editorial not found', 404, 'NOT_FOUND')
        return editorial
    }

    normalizePayload(data = {}, adminId) {
        const payload = { ...data, updatedBy: adminId }
        if (!payload.slug && payload.title) {
            payload.slug = `${makeSlug(payload.title)}-${Date.now().toString(36)}`
        }
        if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
            const parsed = Number(payload.sortOrder)
            if (!Number.isNaN(parsed)) payload.sortOrder = parsed
        }
        if (payload.editorialTest === '') payload.editorialTest = null
        return payload
    }

    async createEditorial(data, adminId) {
        const payload = this.normalizePayload(data, adminId)
        payload.createdBy = adminId
        return this.create(payload)
    }

    async updateEditorial(id, data, adminId) {
        const existing = await editorialRepository.findOne({ _id: id, isDeleted: false })
        if (!existing) throw new AppError('Editorial not found', 404, 'NOT_FOUND')
        return editorialRepository.updateById(id, this.normalizePayload(data, adminId))
    }

    async softDelete(id, adminId) {
        const existing = await editorialRepository.findOne({ _id: id, isDeleted: false })
        if (!existing) throw new AppError('Editorial not found', 404, 'NOT_FOUND')
        return editorialRepository.updateById(id, { isDeleted: true, status: 'inactive', updatedBy: adminId })
    }
}

module.exports = new AdminEditorialService()