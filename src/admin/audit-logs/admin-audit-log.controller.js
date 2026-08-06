const catchAsync = require("../../core/catchAsync");
const { sendPaginated } = require("../../core/response");
const AuditLog = require("../../models/AuditLog.model");
const { paginate } = require("../../core/paginate");

const list = catchAsync(async (req, res) => {
  const filter = {};

  if (req.query.actorName) {
    filter.actorName = new RegExp(req.query.actorName, "i");
  }

  if (req.query.roleName) {
    filter.roleName = new RegExp(req.query.roleName, "i");
  }

  if (req.query.module) {
    filter.module = req.query.module;
  }

  if (req.query.action) {
    filter.action = req.query.action;
  }

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.startDate || req.query.endDate) {
    filter.createdAt = {};
    if (req.query.startDate) {
      filter.createdAt.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      filter.createdAt.$lte = new Date(req.query.endDate);
    }
  }

  const sortBy = req.query.sortBy || "createdAt";
  const sortDirection = req.query.order === "asc" ? 1 : -1;

  const { data: logs, pagination } = await paginate(AuditLog, filter, {
    page: req.query.page,
    limit: req.query.limit,
    sort: { [sortBy]: sortDirection }
  });

  sendPaginated(res, logs, pagination, "Audit logs retrieved successfully");
});

module.exports = { list };
