const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('./env');
const redis = require('./redis');
const { rootLogger } = require('./logger');

// Require the models
const LiveChatMessage = require('../models/LiveChatMessage.model');
const LivePoll = require('../models/LivePoll.model');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [config.FRONTEND_URL, 'http://localhost:3001', 'http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication Middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));

      let decoded;
      let role = 'user';
      try {
        decoded = jwt.verify(token, config.JWT_ADMIN_SECRET);
        role = 'admin';
      } catch (err) {
        decoded = jwt.verify(token, config.JWT_ACCESS_SECRET);
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

        // Fetch current chat mode from redis
        const chatMode = await redis.get(`live_chat_mode:${contentId}`) || 'public';

        // Fetch the active poll from DB
        const activePoll = await LivePoll.findOne({ content: contentId, isActive: true }).lean();

        // Fetch recent chat history from DB
        const recentChats = await LiveChatMessage.find({ content: contentId })
          .sort({ timestamp: -1 })
          .limit(50)
          .lean();

        // Reverse so they are in chronological order
        recentChats.reverse();

        socket.emit('live-state', { chatMode, activePoll, recentChats });

        if (callback) callback({ success: true, room: roomName, chatMode, activePoll, recentChats });
      } catch (error) {
        rootLogger.error(error, 'Error in join-live');
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
        await redis.set(`live_chat_mode:${contentId}`, mode);

        io.to(roomName).emit('chat-mode-changed', { mode });

        if (callback) callback({ success: true, mode });
      } catch (error) {
        rootLogger.error(error, 'Error in set-chat-mode');
        if (callback) callback({ error: 'Internal server error' });
      }
    });

    // Send chat message
    socket.on('chat-message', async (data, callback) => {
      try {
        const { contentId, message } = data;
        if (!contentId || !message) {
          if (callback) callback({ error: 'Invalid payload' });
          return;
        }

        const roomName = `live_${contentId}`;
        const chatMode = await redis.get(`live_chat_mode:${contentId}`) || 'public';

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
