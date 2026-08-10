const BaseService = require('../../core/BaseService')
const thoughtOfTheDayRepository = require('./thought-of-the-day.repository')
const ThoughtOfTheDay = require('../../models/ThoughtOfTheDay.model')
const TWPost = require('../../models/TWPost.model')

class ThoughtOfTheDayService extends BaseService {
  constructor() {
    super(thoughtOfTheDayRepository, 'thought-of-the-day')
  }

  async listFeed(query) {
    this.logger.info({ query }, 'Listing toppers wisdom feed')
    const page = Math.max(1, parseInt(query.page) || 1)
    const limit = Math.min(100, parseInt(query.limit) || 10)
    const skip = (page - 1) * limit
    const search = query.search ? String(query.search).trim() : ''

    const thoughtFilter = {
      isDeleted: false,
      status: 'active'
    }
    if (search) {
      thoughtFilter.$or = [
        { authorName: new RegExp(search, 'i') },
        { quote: new RegExp(search, 'i') }
      ]
    }

    const postFilter = {
      isDeleted: false,
      status: 'active'
    }
    if (search) {
      postFilter.$or = [
        { title: new RegExp(search, 'i') },
        { shortDescription: new RegExp(search, 'i') },
        { textContent: new RegExp(search, 'i') }
      ]
    }

    const pipeline = [
      { $match: thoughtFilter },
      { $addFields: { itemType: 'thought' } },
      {
        $unionWith: {
          coll: TWPost.collection.name,
          pipeline: [
            { $match: postFilter },
            { $addFields: { itemType: 'post' } }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [{ $skip: skip }, { $limit: limit }]
        }
      }
    ]

    const result = await ThoughtOfTheDay.aggregate(pipeline)

    const total = result[0]?.metadata[0]?.total || 0
    const data = result[0]?.data || []

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      }
    }
  }
}

module.exports = new ThoughtOfTheDayService()
