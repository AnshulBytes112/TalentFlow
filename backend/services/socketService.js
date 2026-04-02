const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io;

/**
 * Initialize Socket.io with performance and security optimizations
 */
const initSocket = (server, corsOptions) => {
  const socketCorsOptions = corsOptions || {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  };

  io = socketIO(server, {
    cors: {
      ...socketCorsOptions,
      methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.id).select('role profile.companyName');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      // Attach user info to socket
      socket.user = {
        id: user._id.toString(),
        role: user.role,
        company: user.profile?.companyName
      };

      next();
    } catch (err) {
      console.error('Socket Auth Error:', err.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    console.log(`⚡ Socket connected: ${socket.id} (User: ${userId})`);

    // Join user to their private room
    socket.join(userId);

    // If recruiter, join company room
    if (socket.user.role === 'recruiter' && socket.user.company) {
      const companyRoom = `company:${socket.user.company.replace(/\s+/g, '_').toLowerCase()}`;
      socket.join(companyRoom);
      console.log(`🏢 User ${userId} joined company room: ${companyRoom}`);
    }

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} (Reason: ${reason})`);
    });

    socket.on('error', (error) => {
      console.error(`❌ Socket error for ${userId}:`, error);
    });
  });

  return io;
};

/**
 * Helper to get the io instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

/**
 * Emit event to a specific user
 * Wrapped in try-catch to be non-blocking and safe
 */
const emitToUser = (userId, event, data) => {
  try {
    if (io) {
      const targetRoom = userId.toString();
      io.to(targetRoom).emit(event, data);
    }
  } catch (error) {
    console.error(`❌ Socket emit to user ${userId} failed:`, error.message);
  }
};

/**
 * Emit event to a specific room
 * Wrapped in try-catch to be non-blocking and safe
 */
const emitToRoom = (room, event, data) => {
  try {
    if (io) {
      io.to(room.toString()).emit(event, data);
    }
  } catch (error) {
    console.error(`❌ Socket emit to room ${room} failed:`, error.message);
  }
};

/**
 * Force disconnect all sockets for a specific user
 * Useful when an account is deactivated or deleted
 */
const disconnectUser = (userId) => {
  try {
    if (io) {
      const targetRoom = userId.toString();
      io.in(targetRoom).disconnectSockets(true);
      console.log(`🔌 Forcefully disconnected all sockets for user ${userId}`);
    }
  } catch (error) {
    console.error(`❌ Failed to disconnect user ${userId}:`, error.message);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToRoom,
  disconnectUser
};
