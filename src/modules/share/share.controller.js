const crypto = require('crypto');
const mongoose = require('mongoose');
const path = require('path');
const ShareLink = require('../../models/ShareLink.model');
const { uploadFile } = require('../../lib/fileUpload');

// Custom app scheme - modify as needed
const APP_SCHEME = 'topperswisdom://';
// Fallback URL for Play Store / App Store
const FALLBACK_URL = 'https://play.google.com/store/apps/details?id=com.topperswisdom';

const getBaseUrl = (req) => {
  const forwardedProtocol = req.get('x-forwarded-proto')?.split(',')[0].trim();
  const forwardedHost = req.get('x-forwarded-host')?.split(',')[0].trim();
  const protocol = forwardedProtocol || req.protocol;
  const host = forwardedHost || req.get('host');

  return `${protocol}://${host}`;
};

const getImageUrl = (image, baseUrl) => {
  if (!image) return '';

  const imageUrl = new URL(image, baseUrl);
  if (['localhost', '127.0.0.1', '::1'].includes(imageUrl.hostname)) {
    return new URL(`${imageUrl.pathname}${imageUrl.search}`, baseUrl).href;
  }

  return imageUrl.href;
};

/**
 * Generate a short link for sharing a resource
 * POST /api/v1/share/generate
 */
exports.generateLink = async (req, res) => {
  try {
    const { resourceType, resourceId, title, description } = req.body;
    let imageUrl = req.body.image || ''; // Fallback to body.image string if provided

    if (!resourceType || !resourceId) {
      return res.status(400).json({
        success: false,
        message: 'resourceType and resourceId are required'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resourceId format'
      });
    }

    // Process image file if uploaded via multipart/form-data
    if (req.file) {
      const ext = path.extname(req.file.originalname) || '.jpg';
      const timestamp = Date.now();
      const folder = `shares/new-${timestamp}`;
      const filename = `share-${timestamp}${ext}`;
      imageUrl = await uploadFile(req.file.buffer, filename, folder, req.file.mimetype);
    }

    // Generate a unique short slug (8 characters)
    let slug = crypto.randomBytes(4).toString('hex');
    
    // Check if it already exists (very rare, but good practice)
    let exists = await ShareLink.findOne({ slug });
    while (exists) {
      slug = crypto.randomBytes(4).toString('hex');
      exists = await ShareLink.findOne({ slug });
    }

    // Determine createdBy based on whether a user is logged in (if auth middleware is used)
    const createdBy = req.user ? req.user._id : null;

    const newShareLink = new ShareLink({
      slug,
      resourceType,
      resourceId,
      title: title || '',
      image: imageUrl || '',
      description: description || '',
      createdBy
    });

    await newShareLink.save();

    // The actual domain will be determined dynamically by the request, or from env config
    const baseUrl = getBaseUrl(req);
    const shortLink = `${baseUrl}/s/${slug}`;

    return res.status(201).json({
      success: true,
      message: 'Share link generated successfully',
      data: {
        slug,
        link: shortLink
      }
    });

  } catch (error) {
    console.error('Error generating share link:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Resolve a short link, render Open Graph tags, and redirect
 * GET /s/:slug
 */
exports.resolveLink = async (req, res) => {
  try {
    const { slug } = req.params;

    const shareLink = await ShareLink.findOne({ slug });

    if (!shareLink) {
      return res.status(404).send('<h2>Link not found or expired.</h2>');
    }

    const { resourceType, resourceId, title, image, description } = shareLink;

    // Construct the deep link URL for the mobile app
    const deepLinkUrl = `${APP_SCHEME}share?type=${encodeURIComponent(resourceType)}&id=${encodeURIComponent(resourceId)}`;

    const baseUrl = getBaseUrl(req);
    const fullImageUrl = getImageUrl(image, baseUrl);
    const shareUrl = `${baseUrl}/s/${encodeURIComponent(slug)}`;
    const pageTitle = title || 'Toppers Wisdom - Shared Content';
    const pageDescription = description || 'Click the link to open this content directly in the app.';
    const escapeHtml = (value) => String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    const escapeJs = (value) => JSON.stringify(String(value));
    const escapedTitle = escapeHtml(pageTitle);
    const escapedDescription = escapeHtml(pageDescription);
    const escapedImageUrl = escapeHtml(fullImageUrl);
    const escapedDeepLinkUrl = escapeHtml(deepLinkUrl);
    const escapedShareUrl = escapeHtml(shareUrl);

    // Render an HTML page with Open Graph metadata and JavaScript redirect
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapedTitle}</title>
    
    <!-- Open Graph Meta Tags for Previews (WhatsApp, Telegram, Facebook, etc.) -->
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDescription}" />
    ${fullImageUrl ? `<meta property="og:image" content="${escapedImageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />` : ''}
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapedShareUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapedTitle}" />
    <meta name="twitter:description" content="${escapedDescription}" />
    ${fullImageUrl ? `<meta name="twitter:image" content="${escapedImageUrl}" />` : ''}

    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background-color: #f0f2f5; text-align: center; padding: 20px; box-sizing: border-box; }
      .card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 400px; width: 100%; margin-bottom: 20px; }
      .card img { max-width: 100%; border-radius: 8px; margin-bottom: 20px; object-fit: cover; max-height: 250px; }
      .card h1 { color: #333; font-size: 24px; margin-bottom: 10px; margin-top: 0; }
      .card p { color: #666; font-size: 16px; margin-bottom: 0; line-height: 1.5; }
      .loader { border: 4px solid #f3f3f3; border-top: 4px solid #007bff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 20px auto; }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      .status-text { color: #555; font-weight: 500; margin-bottom: 20px; }
      .btn { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; width: 100%; box-sizing: border-box; transition: background-color 0.2s; }
      .btn:hover { background-color: #0056b3; }
    </style>
</head>
<body>
    <div class="card">
        ${fullImageUrl ? `<img src="${escapedImageUrl}" alt="${escapedTitle}">` : ''}
        <h1>${escapedTitle}</h1>
        <p>${escapedDescription}</p>
    </div>

    <div class="loader"></div>
    <div class="status-text">Opening in Toppers Wisdom App...</div>
    
    <a href="${escapedDeepLinkUrl}" class="btn">Open in App</a>

    <script>
        window.onload = function() {
            var deepLink = ${escapeJs(deepLinkUrl)};
            var fallbackLink = ${escapeJs(FALLBACK_URL)};
            
            // Try to open the app
            window.location.href = deepLink;

            // Set a timeout to redirect to the fallback URL if the app doesn't open
            setTimeout(function() {
                // We check if the document is still visible to avoid redirecting 
                // if the app successfully opened and pushed the browser to the background
                if (!document.hidden) {
                    window.location.href = fallbackLink;
                }
            }, 3000); // Wait 3 seconds
        };
    </script>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);

  } catch (error) {
    console.error('Error resolving share link:', error);
    return res.status(500).send('<h2>Internal server error</h2>');
  }
};
