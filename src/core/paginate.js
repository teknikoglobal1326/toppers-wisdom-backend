/**
 * Reusable pagination helper.
 * Used by BaseRepository.findMany() — never called directly in services.
 *
 * @param {mongoose.Model} model
 * @param {object} filter      - mongoose filter query
 * @param {object} options     - { page, limit, sort, select, populate }
 * @returns {{ data, pagination }}
 */
const paginate = async (model, filter = {}, options = {}) => {
  const page  = Math.max(1, parseInt(options.page)  || 1)
  const limit = Math.min(100, parseInt(options.limit) || 10)
  const sort  = options.sort || { createdAt: -1 }
  const skip  = (page - 1) * limit

  let query = model.find(filter).sort(sort).skip(skip).limit(limit).lean()
  if (options.select)   query = query.select(options.select)
  if (options.populate) query = query.populate(options.populate)

  const [data, total] = await Promise.all([query, model.countDocuments(filter)])

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
  }
}

module.exports = { paginate }