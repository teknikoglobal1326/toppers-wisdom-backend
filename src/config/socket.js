const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('./env');
const redis = require('./redis');
const { rootLogger } = require('./logger');

// Require the models
const LiveChatMessage = require('../models/LiveChatMessage.model');
const LivePoll = require('../models/LivePoll.model');

let io;

console.log("config.FRONTEND_URL==============?", config.FRONTEND_URL);

const getRaisedHands = async (contentId) => {
  const data = await redis.get(`live_raised_hands:${contentId}`)
  return data ? JSON.parse(data) : []
}

const saveRaisedHands = async (contentId, list) => {
  await redis.set(`live_raised_hands:${contentId}`, JSON.stringify(list))
}
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        config.FRONTEND_URL,
        'http://localhost:3001',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://192.168.1.58:3001',
        'http://192.168.1.58:3000',
        'http://192.168.1.58:5173',
        // 'http://160.187.87.138:8002'
      ],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication Middleware
  io.use(async (socket, next) => {
    try {
      rootLogger.info(`[SOCKET AUTH] Authenticating connection. Socket ID: ${socket.id}`);
      let token = socket.handshake.auth?.token || socket.handshake.query?.token;
      rootLogger.info(`[SOCKET AUTH] Token from auth/query: ${token}`);
      if (!token) {
        const authHeader = socket.handshake.headers?.authorization || socket.handshake.headers?.token;
        rootLogger.info(`[SOCKET AUTH] Token from headers: ${authHeader}`);
        if (authHeader) {
          if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
          } else {
            token = authHeader;
          }
        }
      }

      if (!token) return next(new Error('Authentication error'));

      let decoded;
      let role = 'user';
      try {
        decoded = jwt.verify(token, config.JWT_ADMIN_SECRET);
        role = 'admin';
      } catch (err) {
        decoded = jwt.verify(token, config.JWT_ACCESS_SECRET);
      }

      if (decoded && decoded._id && role === 'user') {
        const User = require('../models/User.model');
        const dbUser = await User.findById(decoded._id).lean();
        if (dbUser) {
          decoded.name = dbUser.name;
          decoded.phone = dbUser.phone;
        }
      }

      socket.user = decoded;
      socket.role = role;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    rootLogger.info({ socketId: socket.id, userId: socket.user?._id, role: socket.role }, 'New socket connection');

    // Join a live class room
    socket.on('join-live', async (data, callback) => {
      try {
        const { contentId } = data;
        if (!contentId) {
          if (callback) callback({ error: 'contentId is required' });
          return;
        }

        const roomName = `live_${contentId}`;
        socket.join(roomName);
        rootLogger.info(`[SOCKET] User ${socket.user?._id || 'anonymous'} (role: ${socket.role}) joined room ${roomName}. Socket ID: ${socket.id}`);

        // Fetch current chat mode from redis
        const chatMode = await redis.get(`live_chat_mode:${contentId}`) || 'private';

        // Fetch the active poll from DB
        const activePoll = await LivePoll.findOne({ content: contentId, isActive: true }).lean();

        // Fetch poll history from DB
        const pollHistory = await LivePoll.find({ content: contentId, isActive: false })
          .sort({ createdAt: -1 })
          .lean();

        // Fetch recent chat history from DB
        const recentChats = await LiveChatMessage.find({ content: contentId })
          .sort({ timestamp: -1 })
          .limit(50)
          .lean();

        // Reverse so they are in chronological order
        recentChats.reverse();

        // Fetch raised hands
        const raisedHandsList = await getRaisedHands(contentId);

        socket.emit('live-state', { chatMode, activePoll, recentChats, pollHistory, raisedHands: { list: raisedHandsList, count: raisedHandsList.length } });

        // Broadcast updated viewer count
        const customCountStr = await redis.get(`live_viewer_offset:${contentId}`);
        const customCount = customCountStr ? parseInt(customCountStr, 10) : 0;
        const currentSize = io.sockets.adapter.rooms.get(roomName)?.size || 1;
        const displayCount = customCount > 0 ? customCount : currentSize;

        io.to(roomName).emit('viewer-count-updated', { count: displayCount, actualCount: currentSize });

        if (callback) callback({ success: true, room: roomName, chatMode, activePoll, recentChats, pollHistory, raisedHands: { list: raisedHandsList, count: raisedHandsList.length }, viewerCount: displayCount, actualCount: currentSize });
      } catch (error) {
        rootLogger.error(error, 'Error in join-live');
        if (callback) callback({ error: 'Internal server error' });
      }
    });

    // Raise Hand
    socket.on('raise-hand', async (data, callback) => {
      try {
        const { contentId } = data;
        if (!contentId) {
          if (callback) callback({ error: 'contentId is required' });
          return;
        }

        const roomName = `live_${contentId}`;
        const list = await getRaisedHands(contentId);
        const userId = socket.user?._id;

        if (!userId) {
          if (callback) callback({ error: 'Authentication required' });
          return;
        }

        // Check if already in the list
        const exists = list.some(item => item.userId === userId.toString());
        if (!exists) {
          list.push({
            userId: userId.toString(),
            name: socket.user.name || 'Anonymous Student',
            phone: socket.user.phone || '',
            socketId: socket.id,
            raisedAt: new Date()
          });
          await saveRaisedHands(contentId, list);
        }

        io.to(roomName).emit('hand-raised-sync', { list, count: list.length });

        if (callback) callback({ success: true, list });
      } catch (error) {
        rootLogger.error(error, 'Error in raise-hand');
        if (callback) callback({ error: 'Internal server error' });
      }
    });

    // Lower Hand
    socket.on('lower-hand', async (data, callback) => {
      try {
        const { contentId } = data;
        let targetUserId = data.userId; // Admin can specify whose hand to lower
        if (!contentId) {
          if (callback) callback({ error: 'contentId is required' });
          return;
        }

        const roomName = `live_${contentId}`;
        const list = await getRaisedHands(contentId);

        // If not admin, or targetUserId not specified, default to self
        if (socket.role !== 'admin' || !targetUserId) {
          targetUserId = socket.user?._id?.toString();
        }

        if (!targetUserId) {
          if (callback) callback({ error: 'User ID is required' });
          return;
        }

        const updatedList = list.filter(item => item.userId !== targetUserId.toString());
        await saveRaisedHands(contentId, updatedList);

        io.to(roomName).emit('hand-raised-sync', { list: updatedList, count: updatedList.length });

        if (callback) callback({ success: true, list: updatedList });
      } catch (error) {
        rootLogger.error(error, 'Error in lower-hand');
        if (callback) callback({ error: 'Internal server error' });
      }
    });

    // Get list of joined users (only admin)
    socket.on('get-live-users', async (data, callback) => {
      try {
        if (socket.role !== 'admin') {
          if (callback) callback({ error: 'Unauthorized' });
          return;
        }

        const { contentId } = data;
        if (!contentId) {
          if (callback) callback({ error: 'contentId is required' });
          return;
        }

        const roomName = `live_${contentId}`;
        const sockets = await io.in(roomName).fetchSockets();
        rootLogger.info(`[SOCKET DEBUG] get-live-users requested for room ${roomName}. Total active connections in room: ${sockets.length}`);

        sockets.forEach(s => {
          rootLogger.info(`[SOCKET DEBUG] Socket ID: ${s.id} | User ID: ${s.user?._id || 'none'} | User Role: ${s.role || 'none'}`);
        });

        const users = sockets
          .filter(s => s.user && s.role !== 'admin') // exclude admins
          .map(s => ({
            id: s.user._id,
            name: s.user.name || 'Anonymous Student',
            phone: s.user.phone || '',
          }));

        // Deduplicate users by ID
        const uniqueUsers = [];
        const seen = new Set();
        for (const user of users) {
          if (!seen.has(user.id)) {
            seen.add(user.id);
            uniqueUsers.push(user);
          }
        }

        if (callback) callback({ success: true, users: uniqueUsers });
      } catch (error) {
        rootLogger.error(error, 'Error in get-live-users');
        if (callback) callback({ error: 'Internal server error' });
      }
    });

    // Chat privacy mode (only admin)
    socket.on('set-chat-mode', async (data, callback) => {
      try {
        if (socket.role !== 'admin') {
          if (callback) callback({ error: 'Unauthorized' });
          return;
        }

        const { contentId, mode } = data; // mode: 'public' | 'private'
        if (!contentId || !['public', 'private'].includes(mode)) {
          if (callback) callback({ error: 'Invalid payload' });
          return;
        }

        const roomName = `live_${contentId}`;
        rootLogger.info(`[SOCKET CHAT MODE] Host ${socket.user?._id || 'anonymous'} is changing chat mode for room ${roomName} to "${mode}"`);
        await redis.set(`live_chat_mode:${contentId}`, mode);

        io.to(roomName).emit('chat-mode-changed', { mode });

        if (callback) callback({ success: true, mode });
      } catch (error) {
        rootLogger.error(error, 'Error in set-chat-mode');
        if (callback) callback({ error: 'Internal server error' });
      }
    });

    // Recalculate and sync viewer count
    socket.on('sync-viewer-count', async (data, callback) => {
      try {
        const { contentId } = data;
        const roomName = `live_${contentId}`;
        if (!contentId) {
          if (callback) callback({ error: 'contentId is required' });
          return;
        }

        // Broadcast updated viewer count
        const customCountStr = await redis.get(`live_viewer_offset:${contentId}`);
        const customCount = customCountStr ? parseInt(customCountStr, 10) : 0;
        const currentSize = io.sockets.adapter.rooms.get(roomName)?.size || 1;
        const displayCount = customCount > 0 ? customCount : currentSize;

        io.to(roomName).emit('viewer-count-updated', { count: displayCount, actualCount: currentSize });
        rootLogger.info(`[SOCKET SYNC] Forced viewer count sync for room ${roomName}. New size: ${currentSize}`);

        if (callback) callback({ success: true, count: displayCount, actualCount: currentSize });
      } catch (error) {
        rootLogger.error(error, 'Error in sync-viewer-count');
        if (callback) callback({ error: 'Internal server error' });
      }
    });

    // Set custom/override viewer count shown to students
    socket.on('set-viewer-count', async (data, callback) => {
      try {
        if (socket.role !== 'admin') {
          if (callback) callback({ error: 'Unauthorized' });
          return;
        }

        const { contentId, count } = data;
        if (!contentId) {
          if (callback) callback({ error: 'contentId is required' });
          return;
        }

        const parsedCount = parseInt(count, 10);
        if (isNaN(parsedCount)) {
          if (callback) callback({ error: 'Invalid count value' });
          return;
        }

        const roomName = `live_${contentId}`;
        if (parsedCount > 0) {
          await redis.set(`live_viewer_offset:${contentId}`, parsedCount);
        } else {
          await redis.del(`live_viewer_offset:${contentId}`);
        }

        const currentSize = io.sockets.adapter.rooms.get(roomName)?.size || 1;
        const displayCount = parsedCount > 0 ? parsedCount : currentSize;

        io.to(roomName).emit('viewer-count-updated', { count: displayCount, actualCount: currentSize });
        rootLogger.info(`[SOCKET OVERRIDE] Set display viewer count override for room ${roomName} to: ${displayCount}`);

        if (callback) callback({ success: true, count: displayCount, actualCount: currentSize });
      } catch (error) {
        rootLogger.error(error, 'Error in set-viewer-count');
        if (callback) callback({ error: 'Internal server error' });
      }
    });

    socket.on('chat-message', async (data, callback) => {
      try {
        const { contentId, message } = data;
        rootLogger.info(`[SOCKET MESSAGE] Received chat-message from user ${socket.user?._id || 'anonymous'} (role: ${socket.role}) in room live_${contentId}. Message: "${message}"`);
        if (!contentId || !message) {
          rootLogger.warn(`[SOCKET MESSAGE] Invalid payload received: contentId=${contentId}, message=${message}`);
          if (callback) callback({ error: 'Invalid payload' });
          return;
        }

        const roomName = `live_${contentId}`;
        const chatMode = await redis.get(`live_chat_mode:${contentId}`) || 'private';

        // Construct message payload and save to DB
        const chatMessage = await LiveChatMessage.create({
          content: contentId,
          message,
          senderId: socket.user._id,
          senderName: socket.user.name || (socket.role === 'admin' ? 'Host' : 'Student'),
          role: socket.role,
        });

        const messagePayload = chatMessage.toObject();

        if (socket.role === 'admin' || chatMode === 'public') {
          // Broadcast to everyone in the room
          io.to(roomName).emit('new-message', messagePayload);
        } else {
          // Private mode: user is sending. 
          // Send to sender so they see their own message
          socket.emit('new-message', messagePayload);

          // And send to all admins in the room
          const sockets = await io.in(roomName).fetchSockets();
          for (const s of sockets) {
            if (s.role === 'admin' && s.id !== socket.id) {
              s.emit('new-message', messagePayload);
            }
          }
        }

        if (callback) callback({ success: true });
      } catch (error) {
        rootLogger.error(error, 'Error in chat-message');
        if (callback) callback({ error: 'Internal server error' });
      }
    });

    // Create Poll (only admin)
    socket.on('create-poll', async (data, callback) => {
      try {
        if (socket.role !== 'admin') {
          if (callback) callback({ error: 'Unauthorized' });
          return;
        }

        const { contentId, question, options } = data;
        if (!contentId || !question || !options || !Array.isArray(options)) {
          if (callback) callback({ error: 'Invalid payload' });
          return;
        }

        // Deactivate any existing active polls for this content
        await LivePoll.updateMany({ content: contentId, isActive: true }, { isActive: false });

        const pollId = new Date().getTime().toString();

        const pollDoc = await LivePoll.create({
          content: contentId,
          pollId,
          question,
          options: options.map((opt, idx) => ({ id: idx.toString(), text: opt, votes: 0 })),
          isActive: true,
          voters: []
        });

        const poll = pollDoc.toObject();
        const roomName = `live_${contentId}`;
        io.to(roomName).emit('poll-started', poll);

        if (callback) callback({ success: true, poll });
      } catch (error) {
        rootLogger.error(error, 'Error in create-poll');
        if (callback) callback({ error: 'Internal server error' });
      }
    });

    // Submit Poll Answer
    socket.on('submit-poll', async (data, callback) => {
      try {
        const { contentId, pollId, optionId } = data;
        if (!contentId || !pollId || optionId === undefined) {
          if (callback) callback({ error: 'Invalid payload' });
          return;
        }

        // Check if poll exists and is active
        const poll = await LivePoll.findOne({ content: contentId, pollId, isActive: true });

        if (!poll) {
          if (callback) callback({ error: 'Poll is not active or not found' });
          return;
        }

        // Prevent double voting
        if (poll.voters.includes(socket.user._id)) {
          if (callback) callback({ error: 'Already voted' });
          return;
        }

        const option = poll.options.find(o => o.id === optionId.toString());
        if (option) {
          // Increment vote and add user to voters array atomically
          const updatedPoll = await LivePoll.findOneAndUpdate(
            { _id: poll._id, 'options.id': optionId.toString(), voters: { $ne: socket.user._id } },
            {
              $inc: { 'options.$.votes': 1 },
              $push: { voters: socket.user._id }
            },
            { new: true }
          ).lean();

          if (!updatedPoll) {
            if (callback) callback({ error: 'Could not process vote' });
            return;
          }

          const roomName = `live_${contentId}`;
          io.to(roomName).emit('poll-updated', updatedPoll);

          if (callback) callback({ success: true });
        } else {
          if (callback) callback({ error: 'Invalid option' });
        }
      } catch (error) {
        rootLogger.error(error, 'Error in submit-poll');
        if (callback) callback({ error: 'Internal server error' });
      }
    });

    // End Poll (only admin)
    socket.on('end-poll', async (data, callback) => {
      try {
        if (socket.role !== 'admin') {
          if (callback) callback({ error: 'Unauthorized' });
          return;
        }

        const { contentId, pollId } = data;
        if (!contentId || !pollId) {
          if (callback) callback({ error: 'Invalid payload' });
          return;
        }

        const updatedPoll = await LivePoll.findOneAndUpdate(
          { content: contentId, pollId },
          { isActive: false },
          { new: true }
        ).lean();

        if (updatedPoll) {
          const roomName = `live_${contentId}`;
          io.to(roomName).emit('poll-ended', updatedPoll);

          if (callback) callback({ success: true, poll: updatedPoll });
          return;
        }

        if (callback) callback({ error: 'Poll not found' });
      } catch (error) {
        rootLogger.error(error, 'Error in end-poll');
        if (callback) callback({ error: 'Internal server error' });
      }
    });

    socket.on('disconnecting', async () => {
      for (const room of socket.rooms) {
        if (room.startsWith('live_')) {
          const contentId = room.substring(5);
          try {
            // Remove raised hand if this user had raised their hand
            const list = await getRaisedHands(contentId);
            const userId = socket.user?._id?.toString();
            if (userId) {
              const updatedList = list.filter(item => item.userId !== userId);
              if (updatedList.length !== list.length) {
                await saveRaisedHands(contentId, updatedList);
                io.to(room).emit('hand-raised-sync', { list: updatedList, count: updatedList.length });
              }
            }

            const customCountStr = await redis.get(`live_viewer_offset:${contentId}`);
            const customCount = customCountStr ? parseInt(customCountStr, 10) : 0;
            // The size still includes the disconnecting socket, so we subtract 1
            const currentSize = io.sockets.adapter.rooms.get(room)?.size || 1;
            const actualCount = Math.max(1, currentSize - 1);
            const displayCount = customCount > 0 ? customCount : actualCount;
            io.to(room).emit('viewer-count-updated', { count: displayCount, actualCount });
          } catch (err) {
            rootLogger.error(err, 'Error in disconnecting viewer broadcast');
          }
        }
      }
    });

    socket.on('disconnect', () => {
      rootLogger.info({ socketId: socket.id }, 'Socket disconnected');
    });
  });
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

module.exports = {
  initSocket,
  getIo
};
