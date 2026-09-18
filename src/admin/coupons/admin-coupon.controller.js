const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminCouponService = require('./admin-coupon.service')

const list = catchAsync(async (req, res) => {
  const result = await adminCouponService.listAll(req.query)
  sendPaginated(res, result.data, result.pagination)
})

const getOne = catchAsync(async (req, res) => {
  const coupon = await adminCouponService.getOne(req.params.id)
  sendSuccess(res, coupon)
})

const getUsages = catchAsync(async (req, res) => {
  const result = await adminCouponService.getUsages(req.params.id)
  sendSuccess(res, result, 'Coupon usages retrieved successfully')
})

const exportUsages = catchAsync(async (req, res) => {
  const result = await adminCouponService.getUsages(req.params.id)
  const coupon = result.coupon
  const usages = result.usages

  const formatExportDate = (date) => {
    if (!date) return 'N/A'
    const d = new Date(date)
    if (isNaN(d.getTime())) return 'N/A'
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const day = String(d.getDate()).padStart(2, '0')
    const month = months[d.getMonth()]
    const year = d.getFullYear()
    let hours = d.getHours()
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    hours = hours ? hours : 12
    return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`
  }

  const headers = ['S.No', 'Student Name', 'Phone', 'Email', 'Coupon Code', 'Item Type', 'Item Name', 'Original Price (INR)', 'Discount (INR)', 'Paid Amount (INR)', 'Order ID', 'Payment ID', 'Status', 'Used Date']
  const csvRows = [headers.join(',')]

  usages.forEach((u, idx) => {
    const rawPhone = u.user?.phone || ''
    const phoneVal = rawPhone ? '="' + String(rawPhone).replace(/"/g, '""') + '"' : '"N/A"'
    const dateVal = u.usedAt ? '="' + formatExportDate(u.usedAt) + '"' : '"N/A"'

    const row = [
      idx + 1,
      `"${String(u.user?.name || 'Student').replace(/"/g, '""')}"`,
      phoneVal,
      `"${String(u.user?.email || 'N/A').replace(/"/g, '""')}"`,
      `"${String(coupon?.code || '').toUpperCase()}"`,
      `"${String(u.itemType || '').toUpperCase()}"`,
      `"${String(u.purchasedItem || '').replace(/"/g, '""')}"`,
      u.originalAmount || 0,
      u.discountAmount || 0,
      u.paidAmount || 0,
      `"${String(u.orderId || '').replace(/"/g, '""')}"`,
      `"${String(u.paymentId || '').replace(/"/g, '""')}"`,
      `"${String(u.status || 'PAID').toUpperCase()}"`,
      dateVal
    ]
    csvRows.push(row.join(','))
  })

  const csvString = "\uFEFF" + csvRows.join('\r\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="coupon_${coupon?.code || 'usage'}_${new Date().toISOString().slice(0, 10)}.csv"`)
  res.status(200).send(csvString)
})

const create = catchAsync(async (req, res) => {
  const coupon = await adminCouponService.createCoupon(req.body, req.admin._id)
  sendCreated(res, coupon, 'Coupon created successfully')
})

const update = catchAsync(async (req, res) => {
  const coupon = await adminCouponService.updateCoupon(req.params.id, req.body, req.admin._id)
  sendSuccess(res, coupon, 'Coupon updated successfully')
})

const remove = catchAsync(async (req, res) => {
  await adminCouponService.softDelete(req.params.id, req.admin._id)
  sendSuccess(res, null, 'Coupon deleted successfully')
})

module.exports = { list, getOne, getUsages, exportUsages, create, update, remove }