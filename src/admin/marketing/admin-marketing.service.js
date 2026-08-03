const BaseService = require('../../core/BaseService')
const NotificationCampaign = require('../../models/NotificationCampaign.model')
const Announcement = require('../../models/Announcement.model')
const { notificationQueue } = require('../../jobs/queue')
const AppError = require('../../core/AppError')

class AdminMarketingService extends BaseService {
  constructor() {
    super(NotificationCampaign, 'admin:marketing')
  }

  // --- Notification Campaigns ---
  async listNotifications({ page, limit, isProcessed } = {}) {
    const filter = { isDeleted: false }
    if (isProcessed !== undefined) {
      filter.isProcessed = typeof isProcessed === 'string' ? isProcessed === 'true' : !!isProcessed
    }
    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = Math.max(1, Number(limit) || 20)
    const skip = (pageNum - 1) * limitNum

    const [total, data] = await Promise.all([
      NotificationCampaign.countDocuments(filter),
      NotificationCampaign.find(filter)
        .sort({ schedule: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ])

    return {
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    }
  }

  async getNotification(id) {
    const campaign = await NotificationCampaign.findOne({ _id: id, isDeleted: false })
    if (!campaign) throw new AppError('Notification campaign not found', 404, 'NOT_FOUND')
    return campaign
  }

  async createNotification(data, adminId) {
    const campaign = await NotificationCampaign.create({
      ...data,
      createdBy: adminId
    })

    const runTime = new Date(campaign.schedule).getTime()
    const delay = Math.max(0, runTime - Date.now())

    try {
      const job = await notificationQueue.add(
        'notification-campaign-broadcast',
        { campaignId: campaign._id },
        { delay }
      )
      campaign.jobId = job.id
      await campaign.save()
    } catch (err) {
      this.logger.error({ err, campaignId: campaign._id }, 'Failed to queue notification campaign broadcast job')
    }

    return campaign
  }

  async deleteNotification(id) {
    const campaign = await NotificationCampaign.findOne({ _id: id, isDeleted: false })
    if (!campaign) throw new AppError('Notification campaign not found', 404, 'NOT_FOUND')

    if (campaign.jobId) {
      try {
        const job = await notificationQueue.getJob(campaign.jobId)
        if (job) {
          await job.remove()
          this.logger.info({ jobId: campaign.jobId }, 'Cancelled scheduled notification campaign job')
        }
      } catch (err) {
        this.logger.error({ err, jobId: campaign.jobId }, 'Failed to cancel scheduled notification campaign job')
      }
    }

    campaign.isDeleted = true
    await campaign.save()
    return campaign
  }

  async updateNotification(id, data, adminId) {
    const campaign = await NotificationCampaign.findOne({ _id: id, isDeleted: false })
    if (!campaign) throw new AppError('Notification campaign not found', 404, 'NOT_FOUND')

    const hasNewSchedule = data.schedule && new Date(data.schedule).getTime() !== new Date(campaign.schedule).getTime()

    Object.assign(campaign, data)

    if (hasNewSchedule) {
      if (campaign.jobId) {
        try {
          const oldJob = await notificationQueue.getJob(campaign.jobId)
          if (oldJob) await oldJob.remove()
        } catch (err) {
          this.logger.error({ err }, 'Failed to remove old notification job during update')
        }
      }

      const runTime = new Date(campaign.schedule).getTime()
      const delay = Math.max(0, runTime - Date.now())

      try {
        const job = await notificationQueue.add(
          'notification-campaign-broadcast',
          { campaignId: campaign._id },
          { delay }
        )
        campaign.jobId = job.id
      } catch (err) {
        this.logger.error({ err }, 'Failed to schedule new notification job during update')
      }
    }

    await campaign.save()
    return campaign
  }

  async resendNotification(id) {
    const campaign = await NotificationCampaign.findOne({ _id: id, isDeleted: false })
    if (!campaign) throw new AppError('Notification campaign not found', 404, 'NOT_FOUND')

    if (campaign.jobId) {
      try {
        const oldJob = await notificationQueue.getJob(campaign.jobId)
        if (oldJob) await oldJob.remove()
      } catch (err) {
        this.logger.error({ err }, 'Failed to remove old notification job during resend')
      }
    }

    campaign.isProcessed = false
    const job = await notificationQueue.add(
      'notification-campaign-broadcast',
      { campaignId: campaign._id },
      { delay: 0 }
    )
    campaign.jobId = job.id
    await campaign.save()

    return campaign
  }

  // --- Announcements ---
  async listAnnouncements({ page, limit, isProcessed } = {}) {
    const filter = { isDeleted: false }
    if (isProcessed !== undefined) {
      filter.isProcessed = isProcessed === 'true'
    }
    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = Math.max(1, Number(limit) || 20)
    const skip = (pageNum - 1) * limitNum

    const [total, data] = await Promise.all([
      Announcement.countDocuments(filter),
      Announcement.find(filter)
        .sort({ schedule: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ])

    return {
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    }
  }

  async getAnnouncement(id) {
    const announcement = await Announcement.findOne({ _id: id, isDeleted: false })
    if (!announcement) throw new AppError('Announcement not found', 404, 'NOT_FOUND')
    return announcement
  }

  async createAnnouncement(data, adminId) {
    const announcement = await Announcement.create({
      ...data,
      createdBy: adminId
    })

    const runTime = new Date(announcement.schedule).getTime()
    const delay = Math.max(0, runTime - Date.now())

    try {
      const job = await notificationQueue.add(
        'announcement-campaign-broadcast',
        { announcementId: announcement._id },
        { delay }
      )
      announcement.jobId = job.id
      await announcement.save()
    } catch (err) {
      this.logger.error({ err, announcementId: announcement._id }, 'Failed to queue announcement broadcast job')
    }

    return announcement
  }

  async deleteAnnouncement(id) {
    const announcement = await Announcement.findOne({ _id: id, isDeleted: false })
    if (!announcement) throw new AppError('Announcement not found', 404, 'NOT_FOUND')

    if (announcement.jobId) {
      try {
        const job = await notificationQueue.getJob(announcement.jobId)
        if (job) {
          await job.remove()
          this.logger.info({ jobId: announcement.jobId }, 'Cancelled scheduled announcement job')
        }
      } catch (err) {
        this.logger.error({ err, jobId: announcement.jobId }, 'Failed to cancel scheduled announcement job')
      }
    }

    announcement.isDeleted = true
    await announcement.save()
    return announcement
  }

  async updateAnnouncement(id, data, adminId) {
    const announcement = await Announcement.findOne({ _id: id, isDeleted: false })
    if (!announcement) throw new AppError('Announcement not found', 404, 'NOT_FOUND')

    const hasNewSchedule = data.schedule && new Date(data.schedule).getTime() !== new Date(announcement.schedule).getTime()

    Object.assign(announcement, data)

    if (hasNewSchedule) {
      if (announcement.jobId) {
        try {
          const oldJob = await notificationQueue.getJob(announcement.jobId)
          if (oldJob) await oldJob.remove()
        } catch (err) {
          this.logger.error({ err }, 'Failed to remove old announcement job during update')
        }
      }

      const runTime = new Date(announcement.schedule).getTime()
      const delay = Math.max(0, runTime - Date.now())

      try {
        const job = await notificationQueue.add(
          'announcement-campaign-broadcast',
          { announcementId: announcement._id },
          { delay }
        )
        announcement.jobId = job.id
      } catch (err) {
        this.logger.error({ err }, 'Failed to schedule new announcement job during update')
      }
    }

    await announcement.save()
    return announcement
  }

  async resendAnnouncement(id) {
    const announcement = await Announcement.findOne({ _id: id, isDeleted: false })
    if (!announcement) throw new AppError('Announcement not found', 404, 'NOT_FOUND')

    if (announcement.jobId) {
      try {
        const oldJob = await notificationQueue.getJob(announcement.jobId)
        if (oldJob) await oldJob.remove()
      } catch (err) {
        this.logger.error({ err }, 'Failed to remove old announcement job during resend')
      }
    }

    announcement.isProcessed = false
    const job = await notificationQueue.add(
      'announcement-campaign-broadcast',
      { announcementId: announcement._id },
      { delay: 0 }
    )
    announcement.jobId = job.id
    await announcement.save()

    return announcement
  }
}

module.exports = new AdminMarketingService()
