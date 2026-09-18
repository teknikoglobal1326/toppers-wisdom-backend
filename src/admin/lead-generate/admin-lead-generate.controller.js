const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const adminLeadGenerateService = require('./admin-lead-generate.service')

const list = catchAsync(async (req, res) => {
  const result = await adminLeadGenerateService.listAll(req.query)
  sendPaginated(res, result.data, result.pagination)
})

const exportLeads = catchAsync(async (req, res) => {
  const leads = await adminLeadGenerateService.exportLeads(req.query)

  if (req.query.format === 'json') {
    return sendSuccess(res, leads, 'Export data retrieved successfully')
  }

  const formatExportDate = (date) => {
    if (!date) return 'N/A'
    const d = new Date(date)
    if (isNaN(d.getTime())) return 'N/A'
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const day = String(d.getDate()).padStart(2, '0')
    const month = months[d.getMonth()]
    const year = d.getFullYear()
    return `${day}-${month}-${year}`
  }

  const headers = ['S.No', 'Lead Name', 'Phone', 'Email', 'Lead Status', 'Visit Type', 'Purpose Type', 'Item Name', 'Amount (INR)', 'Read Status', 'Created At']
  const csvRows = [headers.join(',')]

  leads.forEach((lead, idx) => {
    const name = lead.name || lead.user?.name || 'Anonymous'
    const rawPhone = lead.phone || lead.user?.phone || ''
    const phoneVal = rawPhone ? '="' + String(rawPhone).replace(/"/g, '""') + '"' : '"N/A"'
    const email = lead.email || lead.user?.email || 'N/A'
    const dateVal = lead.createdAt ? '="' + formatExportDate(lead.createdAt) + '"' : '"N/A"'

    const row = [
      idx + 1,
      `"${String(name).replace(/"/g, '""')}"`,
      phoneVal,
      `"${String(email).replace(/"/g, '""')}"`,
      `"${String(lead.leadStatus || 'warm').toUpperCase()}"`,
      `"${String(lead.visitType || 'onboarding')}"`,
      `"${String(lead.purposeType || 'general')}"`,
      `"${String(lead.itemName || lead.itemTitle || 'N/A').replace(/"/g, '""')}"`,
      lead.amount || 0,
      lead.isRead ? '"Read"' : '"Unread"',
      dateVal
    ]
    csvRows.push(row.join(','))
  })

  const csvString = "\uFEFF" + csvRows.join('\r\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="leads_export_${new Date().toISOString().slice(0, 10)}.csv"`)
  res.status(200).send(csvString)
})

const update = catchAsync(async (req, res) => {
  const result = await adminLeadGenerateService.updateLead(req.params.id, req.body)
  sendSuccess(res, result, 'Lead updated successfully')
})

module.exports = { list, exportLeads, update }
