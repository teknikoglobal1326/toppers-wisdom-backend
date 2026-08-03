const router = require('express').Router()
const controller = require('./admin-marketing.controller')
const { validate, validateQuery } = require('../../core/validate')
const { createNotificationSchema, updateNotificationSchema, createAnnouncementSchema, updateAnnouncementSchema, listCampaignQuerySchema } = require('./admin-marketing.schema')

const { upload } = require('../../middlewares/upload.middleware')
const path = require('path')
const { uploadFile } = require('../../lib/fileUpload')

const attachCampaignImage = async (req, res, next) => {
    try {
        if (req.file) {
            const ext = path.extname(req.file.originalname) || '.jpg'
            const folder = `marketing/${Date.now()}`
            req.body.image = await uploadFile(req.file.buffer, `image${ext}`, folder, req.file.mimetype)
        }
        next()
    } catch (err) {
        next(err)
    }
}

// --- Notification Campaigns ---
router.get('/notifications', validateQuery(listCampaignQuerySchema), controller.listSentNotifications)
router.get('/notifications/scheduled', validateQuery(listCampaignQuerySchema), controller.listScheduledNotifications)
router.get('/notifications/:id', controller.getNotification)
router.post('/notifications', upload.single('image'), attachCampaignImage, validate(createNotificationSchema), controller.createNotification)
router.patch('/notifications/:id', upload.single('image'), attachCampaignImage, validate(updateNotificationSchema), controller.updateNotification)
router.delete('/notifications/:id', controller.deleteNotification)
router.get('/notifications/:id/resend', controller.resendNotification)

const parseAnnouncementBlocks = (req, res, next) => {
    if (req.body.announcementBlocks && typeof req.body.announcementBlocks === 'string') {
        try {
            req.body.announcementBlocks = JSON.parse(req.body.announcementBlocks)
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: 'Invalid announcementBlocks JSON format'
            })
        }
    }
    next()
}

// --- Announcements ---
router.get('/announcements', validateQuery(listCampaignQuerySchema), controller.listAnnouncements)
router.get('/announcements/:id', controller.getAnnouncement)
router.post('/announcements', upload.single('image'), attachCampaignImage, parseAnnouncementBlocks, validate(createAnnouncementSchema), controller.createAnnouncement)
router.patch('/announcements/:id', upload.single('image'), attachCampaignImage, parseAnnouncementBlocks, validate(updateAnnouncementSchema), controller.updateAnnouncement)
router.delete('/announcements/:id', controller.deleteAnnouncement)
router.get('/announcements/:id/resend', controller.resendAnnouncement)

module.exports = router
