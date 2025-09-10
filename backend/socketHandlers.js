const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Chat = require('../models/Chat');

// Store active connections
const activeUsers = new Map();

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.isActive) {
      return next(new Error('Authentication error: Invalid user'));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
};

const socketHandlers = (io) => {
  // Authentication middleware
  io.use(authenticateSocket);

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.userId})`);

    // Store active user
    activeUsers.set(socket.userId, {
      socketId: socket.id,
      username: socket.user.username,
      lastSeen: new Date()
    });

    // Join user's personal room for notifications
    socket.join(socket.userId);

    // Broadcast user online status to relevant users
    socket.broadcast.emit('user_online', {
      userId: socket.userId,
      username: socket.user.username
    });

    // Send active users count
    io.emit('active_users_count', activeUsers.size);

    // Handle joining chat rooms
    socket.on('join_chat', async (chatId) => {
      try {
        const chat = await Chat.findById(chatId);
        if (chat && chat.participants.includes(socket.userId)) {
          socket.join(chatId);
          console.log(`User ${socket.user.username} joined chat: ${chatId}`);
        }
      } catch (error) {
        console.error('Error joining chat:', error);
        socket.emit('error', { message: 'Failed to join chat room' });
      }
    });

    // Handle leaving chat rooms
    socket.on('leave_chat', (chatId) => {
      socket.leave(chatId);
      console.log(`User ${socket.user.username} left chat: ${chatId}`);
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { chatId } = data;
      socket.to(chatId).emit('user_typing', {
        userId: socket.userId,
        username: socket.user.username,
        chatId
      });
    });

    socket.on('typing_stop', (data) => {
      const { chatId } = data;
      socket.to(chatId).emit('user_stopped_typing', {
        userId: socket.userId,
        chatId
      });
    });

    // Handle real-time message sending
    socket.on('send_message', async (data) => {
      try {
        const { chatId, message, messageType = 'text' } = data;

        // Validate input
        if (!chatId || !message?.trim()) {
          return socket.emit('error', { message: 'Invalid message data' });
        }

        // Find and validate chat
        const chat = await Chat.findById(chatId)
          .populate('participants', 'username')
          .populate('itemId', 'title');

        if (!chat || !chat.participants.some(p => p._id.toString() === socket.userId)) {
          return socket.emit('error', { message: 'Access denied to this chat' });
        }

        // Add message to database
        await chat.addMessage(socket.userId, message.trim(), messageType);

        // Get other participant
        const otherParticipant = chat.participants.find(p => p._id.toString() !== socket.userId);

        const messageData = {
          chatId,
          senderId: socket.userId,
          senderName: socket.user.username,
          message: message.trim(),
          messageType,
          timestamp: new Date(),
          itemTitle: chat.itemId?.title
        };

        // Emit to chat room
        io.to(chatId).emit('new_message', messageData);

        // Send notification to other participant if they're online
        if (otherParticipant && activeUsers.has(otherParticipant._id.toString())) {
          io.to(otherParticipant._id.toString()).emit('message_notification', {
            ...messageData,
            chatId,
            preview: message.trim().length > 50 
              ? message.trim().substring(0, 50) + '...' 
              : message.trim()
          });
        }

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle item view tracking
    socket.on('view_item', async (data) => {
      try {
        const { itemId } = data;
        if (!itemId) return;

        // Broadcast item view to other users (for real-time view counts)
        socket.broadcast.emit('item_viewed', {
          itemId,
          viewerId: socket.userId
        });

      } catch (error) {
        console.error('Error tracking item view:', error);
      }
    });

    // Handle real-time item updates
    socket.on('item_updated', (data) => {
      const { itemId, updates } = data;
      socket.broadcast.emit('item_changed', {
        itemId,
        updates,
        updatedBy: socket.userId
      });
    });

    // Handle boost notifications
    socket.on('item_boosted', (data) => {
      const { itemId } = data;
      io.emit('item_boost_notification', {
        itemId,
        boostedBy: socket.userId,
        timestamp: new Date()
      });
    });

    // Handle user status updates
    socket.on('update_status', async (data) => {
      const { status } = data;
      if (['online', 'away', 'busy'].includes(status)) {
        activeUsers.get(socket.userId).status = status;
        socket.broadcast.emit('user_status_change', {
          userId: socket.userId,
          status,
          timestamp: new Date()
        });
      }
    });

    // Handle market alerts/notifications
    socket.on('subscribe_category', (data) => {
      const { category } = data;
      socket.join(`category_${category}`);
      console.log(`User ${socket.user.username} subscribed to category: ${category}`);
    });

    socket.on('unsubscribe_category', (data) => {
      const { category } = data;
      socket.leave(`category_${category}`);
      console.log(`User ${socket.user.username} unsubscribed from category: ${category}`);
    });

    // Handle price alerts
    socket.on('set_price_alert', (data) => {
      const { category, maxPrice } = data;
      socket.join(`price_alert_${category}_${maxPrice}`);
      console.log(`User ${socket.user.username} set price alert: ${category} under ₹${maxPrice}`);
    });

    // Handle location-based notifications
    socket.on('join_hostel_room', (data) => {
      const { hostel } = data;
      if (['Boys', 'Girls'].includes(hostel)) {
        socket.join(`hostel_${hostel}`);
        console.log(`User ${socket.user.username} joined hostel room: ${hostel}`);
      }
    });

    // Handle admin notifications (if user is admin)
    socket.on('join_admin_room', () => {
      if (socket.user.isAdmin) {
        socket.join('admin_room');
        console.log(`Admin ${socket.user.username} joined admin room`);
      }
    });

    // Handle heartbeat/ping for connection status
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date() });
      if (activeUsers.has(socket.userId)) {
        activeUsers.get(socket.userId).lastSeen = new Date();
      }
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${socket.user.username} (${reason})`);

      // Remove from active users
      activeUsers.delete(socket.userId);

      // Broadcast user offline status
      socket.broadcast.emit('user_offline', {
        userId: socket.userId,
        username: socket.user.username,
        lastSeen: new Date()
      });

      // Update active users count
      io.emit('active_users_count', activeUsers.size);

      // Stop any typing indicators
      socket.rooms.forEach(room => {
        if (room !== socket.id) {
          socket.to(room).emit('user_stopped_typing', {
            userId: socket.userId,
            chatId: room
          });
        }
      });
    });

    // Handle connection errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.user.username}:`, error);
    });
  });

  // Utility functions for emitting to specific groups
  const emitToCategory = (category, event, data) => {
    io.to(`category_${category}`).emit(event, data);
  };

  const emitToHostel = (hostel, event, data) => {
    io.to(`hostel_${hostel}`).emit(event, data);
  };

  const emitToAdmins = (event, data) => {
    io.to('admin_room').emit(event, data);
  };

  const emitPriceAlert = (category, price, itemData) => {
    // Emit to users who set price alerts for this category and price range
    io.fetchSockets().then(sockets => {
      sockets.forEach(socket => {
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
          if (room.startsWith(`price_alert_${category}_`)) {
            const alertPrice = parseInt(room.split('_').pop());
            if (price <= alertPrice) {
              socket.emit('price_alert_triggered', {
                category,
                alertPrice,
                actualPrice: price,
                item: itemData
              });
            }
          }
        });
      });
    });
  };

  // Export utility functions for use in routes
  io.emitToCategory = emitToCategory;
  io.emitToHostel = emitToHostel;
  io.emitToAdmins = emitToAdmins;
  io.emitPriceAlert = emitPriceAlert;
  io.activeUsers = activeUsers;

  // Periodic cleanup of inactive connections
  setInterval(() => {
    const now = new Date();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

    activeUsers.forEach((userData, userId) => {
      if (now - userData.lastSeen > inactiveThreshold) {
        activeUsers.delete(userId);
        io.emit('user_offline', {
          userId,
          username: userData.username,
          lastSeen: userData.lastSeen
        });
      }
    });

    // Emit updated count
    io.emit('active_users_count', activeUsers.size);
  }, 60000); // Check every minute

  return io;
};

module.exports = socketHandlers;
