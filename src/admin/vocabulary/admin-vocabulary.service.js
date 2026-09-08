const escapeRegExp = (str) => {
    if (!str) return '';
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const path = require('path')
const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const vocabularyRepository = require('../../modules/vocabulary/vocabulary.repository')
const { VALID_TYPES } = require('./admin-vocabulary.schema')



class AdminVocabularyService extends BaseService {
    constructor() {
        super(vocabularyRepository, 'admin:vocabulary')
    }

    buildFilter({ type, status, search, word, examId, exam } = {}) {
        const filter = { isDeleted: false }

        if (type) {
            if (!VALID_TYPES.includes(type)) {
                throw new AppError('Invalid vocabulary type', 400, 'VALIDATION_ERROR')
            }
            filter.type = type
        }

        if (status) filter.status = status

        if (word) {
            filter.word = new RegExp(word, 'i')
        }

        const targetExam = examId || exam
        if (targetExam) {
            if (Array.isArray(targetExam)) {
                filter.exam = { $in: targetExam }
            } else if (typeof targetExam === 'string') {
                if (targetExam.includes(',')) {
                    filter.exam = { $in: targetExam.split(',') }
                } else {
                    filter.exam = targetExam
                }
            }
        }

        if (search) {
            const rx = new RegExp(search, 'i')
            filter.$or = [
                { title: rx },
                { word: rx },
                { shortDescription: rx },
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
            populate: ['exam', 'subjectIds'],
        })
    }

    async getOne(id) {
        const vocabulary = await vocabularyRepository.findOne({ _id: id, isDeleted: false }, { populate: ['exam', 'subjectIds'] })
        if (!vocabulary) throw new AppError('Vocabulary not found', 404, 'NOT_FOUND')
        return vocabulary
    }

    async createVocabulary(data, adminId) {
        const payload = { ...data, createdBy: adminId, updatedBy: adminId }
        if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
            const parsedSortOrder = Number(payload.sortOrder)
            if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
        }
        return this.create(payload)
    }

    async updateVocabulary(id, data, adminId) {
        const existing = await vocabularyRepository.findOne({ _id: id, isDeleted: false })
        if (!existing) throw new AppError('Vocabulary not found', 404, 'NOT_FOUND')

        const payload = { ...data, updatedBy: adminId }
        if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
            const parsedSortOrder = Number(payload.sortOrder)
            if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
        }

        return vocabularyRepository.updateById(id, payload)
    }

    async softDelete(id, adminId) {
        const existing = await vocabularyRepository.findOne({ _id: id, isDeleted: false })
        if (!existing) throw new AppError('Vocabulary not found', 404, 'NOT_FOUND')

        return vocabularyRepository.updateById(id, {
            isDeleted: true,
            status: 'inactive',
            updatedBy: adminId,
        })
    }

    async bulkUpload(file, commonData = {}, adminId) {
        if (!file) throw new AppError('Excel or Word file is required', 400, 'VALIDATION_ERROR')

        const extension = path.extname(file.originalname).toLowerCase()
        let rawRows = []

        if (extension === '.xlsx' || extension === '.xls' || extension === '.csv') {
            const XLSX = require('xlsx')
            const workbook = XLSX.read(file.buffer, { type: 'buffer' })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]
            rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
        } else if (extension === '.docx' || extension === '.doc') {
            const mammoth = require('mammoth')
            const cheerio = require('cheerio')
            const { value: html } = await mammoth.convertToHtml({ buffer: file.buffer })
            const $ = cheerio.load(html)

            $("table").each((_, tableDom) => {
                const tableRows = $(tableDom).find("tr")
                if (tableRows.length < 2) return

                const headers = []
                $(tableRows[0]).find("td, th").each((_, cell) => {
                    headers.push($(cell).text().trim().toLowerCase().replace(/[\s_-]+/g, ""))
                })

                for (let i = 1; i < tableRows.length; i++) {
                    const cells = $(tableRows[i]).find("td")
                    const rowData = {}
                    cells.each((cIdx, cell) => {
                        const header = headers[cIdx]
                        if (header) {
                            rowData[header] = $(cell).text().trim()
                        }
                    })
                    if (Object.keys(rowData).length > 0) {
                        rawRows.push(rowData)
                    }
                }
            })
        } else {
            throw new AppError('Unsupported file type. Please upload Excel (.xlsx, .xls, .csv) or Word (.docx, .doc) files.', 400, 'VALIDATION_ERROR')
        }

        if (!rawRows.length) {
            throw new AppError('No data found in uploaded file', 400, 'VALIDATION_ERROR')
        }

        const parseListField = (val) => {
            if (!val) return []
            if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean)
            if (typeof val === 'string') {
                if (val.startsWith('[') && val.endsWith(']')) {
                    try {
                        const parsed = JSON.parse(val)
                        if (Array.isArray(parsed)) return parsed.map(s => String(s).trim()).filter(Boolean)
                    } catch (_) { }
                }
                return val.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean)
            }
            return []
        }

        const parseArrayObjectIds = (val) => {
            if (!val) return []
            if (Array.isArray(val)) return val.filter(Boolean)
            if (typeof val === 'string') {
                if (val.startsWith('[') && val.endsWith(']')) {
                    try {
                        const parsed = JSON.parse(val)
                        if (Array.isArray(parsed)) return parsed.filter(Boolean)
                    } catch (_) { }
                }
                return val.split(',').map(s => s.trim()).filter(Boolean)
            }
            return []
        }

        const defaultThumbnail = 'https://placehold.co/400x300?text=Vocabulary'

        const documentsToInsert = []
        for (const row of rawRows) {
            const normalizedRow = {}
            for (const key of Object.keys(row)) {
                const normKey = key.toLowerCase().replace(/[\s_-]+/g, "")
                normalizedRow[normKey] = row[key]
            }

            const word = (normalizedRow.word || normalizedRow.term || normalizedRow.vocab || normalizedRow.vocabulary || normalizedRow.title || '').toString().trim()
            if (!word) continue; // Skip empty rows

            const title = (normalizedRow.title || word).toString().trim()

            let type = (normalizedRow.type || normalizedRow.vocabtype || normalizedRow.category || commonData.type || 'daily_vocab').toString().trim()
            if (!VALID_TYPES.includes(type)) {
                type = commonData.type && VALID_TYPES.includes(commonData.type) ? commonData.type : 'daily_vocab'
            }

            let status = (normalizedRow.status || commonData.status || 'active').toString().trim().toLowerCase()
            if (!['draft', 'active', 'inactive'].includes(status)) {
                status = 'active'
            }

            const pronunciation = (normalizedRow.pronunciation || normalizedRow.phonetic || '').toString().trim()
            const shortDescription = (normalizedRow.shortdescription || normalizedRow.shortdesc || normalizedRow.meaning || normalizedRow.definition || normalizedRow.description || '').toString().trim()
            const longDescription = (normalizedRow.longdescription || normalizedRow.longdesc || normalizedRow.detail || normalizedRow.details || normalizedRow.explanation || '').toString().trim()

            const usages = parseListField(normalizedRow.usages || normalizedRow.usage || normalizedRow.examples || normalizedRow.example)
            const synonyms = parseListField(normalizedRow.synonyms || normalizedRow.synonym)
            const antonyms = parseListField(normalizedRow.antonyms || normalizedRow.antonym)

            const rawOrder = normalizedRow.sortorder || normalizedRow.order || commonData.sortOrder
            const sortOrder = rawOrder !== undefined && rawOrder !== '' && !isNaN(Number(rawOrder)) ? Number(rawOrder) : 0

            const thumbnail = (normalizedRow.thumbnail || normalizedRow.image || commonData.thumbnail || defaultThumbnail).toString().trim()

            const exam = parseArrayObjectIds(commonData.exam || normalizedRow.exam || normalizedRow.exams)
            const subjectIds = parseArrayObjectIds(commonData.subjectIds || normalizedRow.subjectids || normalizedRow.subjects || normalizedRow.subject)

            let publishDate = new Date()
            const rawDate = normalizedRow.publishdate || normalizedRow.date || commonData.publishDate
            if (rawDate) {
                const parsedDate = new Date(rawDate)
                if (!isNaN(parsedDate.getTime())) publishDate = parsedDate
            }

            documentsToInsert.push({
                title,
                type,
                word,
                pronunciation,
                thumbnail,
                shortDescription,
                longDescription,
                usages,
                synonyms,
                antonyms,
                publishDate,
                sortOrder,
                status,
                exam,
                subjectIds,
                createdBy: adminId,
                updatedBy: adminId,
            })
        }

        if (!documentsToInsert.length) {
            throw new AppError('No valid vocabulary rows found in the uploaded file. Ensure at least "word" field is provided.', 400, 'VALIDATION_ERROR')
        }

        const inserted = await vocabularyRepository.insertMany(documentsToInsert)
        return {
            insertedCount: inserted.length,
            vocabularies: inserted,
        }
    }
}

module.exports = new AdminVocabularyService()