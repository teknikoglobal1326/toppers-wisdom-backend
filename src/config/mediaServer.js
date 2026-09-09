const NodeMediaServer = require('node-media-server');
const path = require('path');
const fs = require('fs');
const { rootLogger } = require('./logger');

const mediaRoot = path.join(__dirname, '..', '..', 'public', 'media');
if (!fs.existsSync(mediaRoot)) {
  fs.mkdirSync(mediaRoot, { recursive: true });
}

const config = {
  logType: 3,
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000, // NodeMediaServer HTTP port
    mediaroot: mediaRoot,
    allow_origin: '*'
  }
};

const nms = new NodeMediaServer(config);

const { spawn } = require('child_process');

nms.on('postPublish', (session) => {
  const streamPath = session.streamPath;
  if (!streamPath || !streamPath.startsWith('/live/')) return;
  
  rootLogger.info(`[NodeMediaServer] postPublish - StreamPath: ${streamPath}`);
  
  const streamName = streamPath.split('/')[2];
  const streamUrl = `rtmp://127.0.0.1:1935${streamPath}`;
  const outputDir = path.join(mediaRoot, 'live', streamName);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const ffmpegPath = process.platform === 'win32' ? 'ffmpeg' : '/usr/bin/ffmpeg';
  const args = [
    '-i', streamUrl,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-f', 'hls',
    '-hls_time', '10',
    '-hls_list_size', '0',
    path.join(outputDir, 'index.m3u8')
  ];
  
  rootLogger.info(`[FFmpeg] Starting HLS transcode for ${streamName}`);
  const ffmpeg = spawn(ffmpegPath, args);
  
  ffmpeg.stderr.on('data', data => {
    // Uncomment the next line if you need deep FFmpeg debug logs
    // console.log(`[FFmpeg] ${data.toString()}`);
  });
  
  ffmpeg.on('close', code => {
    rootLogger.info(`[FFmpeg] Transcode for ${streamName} exited with code ${code}`);
  });

  // Relay to Agora and other restream URLs
  const Content = require('../models/Content.model');
  Content.findById(streamName).lean().then(content => {
    if (content && content.restreamUrls && content.restreamUrls.length > 0) {
      for (const url of content.restreamUrls) {
        if (url && url.includes('agoramdn.com')) {
          rootLogger.info(`[FFmpeg] Relaying stream ${streamName} to Agora Ingress: ${url}`);
          const relayArgs = [
            '-i', streamUrl,
            '-c', 'copy',
            '-f', 'flv',
            url
          ];
          const relayFfmpeg = spawn(ffmpegPath, relayArgs);
          relayFfmpeg.on('close', code => {
            rootLogger.info(`[FFmpeg] Relay for ${streamName} exited with code ${code}`);
          });
        }
      }
    }
  }).catch(err => {
    rootLogger.error(`[FFmpeg] Error fetching content for relay: ${err.message}`);
  });
});

module.exports = nms;
