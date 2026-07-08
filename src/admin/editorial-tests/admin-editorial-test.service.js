const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const editorialTestRepository = require('../../modules/editorial-test/editorial-test.repository')

const makeSlug = (value = '') => value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

class AdminEditorialTestService extends BaseService {
    constructor() {
        super(editorialTestRepository, 'admin:editorial-test')
    }

    buildFilter({ status, isFree, subject, search } = {}) {
        const filter = { isDeleted: false }
        if (status) filter.status = status
        if (typeof isFree === 'boolean') filter.isFree = isFree
        if (subject) filter.subjects = subject
        if (search) {
            const rx = new RegExp(search, 'i')
            filter.$or = [{ title: rx }, { description: rx }, { instructions: rx }]
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
            populate: [{ path: 'subjects', select: 'name' }],
        })
    }

    async getOne(id) {
        const test = await editorialTestRepository.findOne(
            { _id: id, isDeleted: false },
            { populate: [{ path: 'subjects', select: 'name' }] }
        )
        if (!test) throw new AppError('Editorial test not found', 404, 'NOT_FOUND')
        return test
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
        return payload
    }

    async createEditorialTest(data, adminId) {
        const payload = this.normalizePayload(data, adminId)
        payload.createdBy = adminId
        return this.create(payload)
    }

    async updateEditorialTest(id, data, adminId) {
        const existing = await editorialTestRepository.findOne({ _id: id, isDeleted: false })
        if (!existing) throw new AppError('Editorial test not found', 404, 'NOT_FOUND')
        return editorialTestRepository.updateById(id, this.normalizePayload(data, adminId))
    }

    async softDelete(id, adminId) {
        const existing = await editorialTestRepository.findOne({ _id: id, isDeleted: false })
        if (!existing) throw new AppError('Editorial test not found', 404, 'NOT_FOUND')
        return editorialTestRepository.updateById(id, { isDeleted: true, status: 'inactive', updatedBy: adminId })
    }
}

module.exports = new AdminEditorialTestService()