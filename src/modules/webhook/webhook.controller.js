const Content = require('../../models/Content.model')
const { rootLogger } = require('../../config/logger')

exports.updateHlsUrl = async (req, res, next) => {
  try {
    const { contentId, hlsUrl } = req.body
    
    if (!contentId || !hlsUrl) {
      return res.status(400).json({ success: false, message: 'contentId and hlsUrl are required in the payload' })
    }

    const updatedContent = await Content.findByIdAndUpdate(
      contentId,
      { hlsUrl },
      { new: true }
    )

    if (!updatedContent) {
      return res.status(404).json({ success: false, message: 'Content not found' })
    }

    rootLogger.info(`[WEBHOOK] Updated HLS URL for content ${contentId} to ${hlsUrl}`)

    res.status(200).json({
      success: true,
      message: 'HLS URL updated successfully'
    })
  } catch (error) {
    rootLogger.error(error, '[WEBHOOK] Error updating HLS URL')
    next(error)
  }
}
