const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Chat = require('../models/Chat');
const User = require('../models/User');
const Item = require('../models/Item');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/chats
// @desc    Get all conversations for current user
// @access  Private
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user._id;

    const [chats, total] = await Promise.all([
      Chat.find({ 
        participants: userId,
        isActive: true 
      })
        .populate('participants', 'username profile.hostel')
        .populate('itemId', 'title price images category isActive isSold')
        .populate('lastMessage.senderId', 'username')
        .sort({ lastActivity: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Chat.countDocuments({ 
        participants: userId,
        isActive: true 
      })
    ]);

    // Process chats to show other participant and unread count
    const processedChats = chats.map(chat => {
      const otherParticipant = chat.participants.find(p => !p._id.equals(userId));
      const unreadCount = chat.unreadCount?.get(userId.toString()) || 0;

      return {
        id: chat._id,
        otherParticipant,
        item: chat.itemId,
        lastMessage: chat.lastMessage,
        lastActivity: chat.lastActivity,
        unreadCount,
        isActive: chat.isActive,
        createdAt: chat.createdAt
      };
    });

    res.json({
      chats: processedChats,
      pagination: {
        current: Number(page),
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        totalItems: total
      }
    });

  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ message: 'Server error while fetching conversations' });
  }
});

// @route   GET /api/chats/:id
// @desc    Get specific conversation with messages
// @access  Private
router.get('/:id', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { page = 1, limit = 50 } = req.query;
    const userId = req.user._id;
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId)
      .populate('participants', 'username profile.hostel')
      .populate('itemId', 'title price images category sellerId isActive isSold')
      .lean();

    if (!chat || !chat.isActive) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is participant
    if (!chat.participants.some(p => p._id.equals(userId))) {
      return res.status(403).json({ message: 'Access denied to this conversation' });
    }

    // Paginate messages (most recent first, then reverse for display)
    const totalMessages = chat.messages.length;
    const skip = Math.max(0, totalMessages - (page * limit));
    const paginatedMessages = chat.messages
      .slice(skip, skip + limit)
      .map(message => ({
        id: message._id,
        senderId: message.senderId,
        message: message.message,
        messageType: message.messageType,
        isRead: message.isRead,
        createdAt: message.createdAt,
        readAt: message.readAt
      }));

    const otherParticipant = chat.participants.find(p => !p._id.equals(userId));
    const unreadCount = chat.unreadCount?.get(userId.toString()) || 0;

    res.json({
      chat: {
        id: chat._id,
        participants: chat.participants,
        otherParticipant,
        item: chat.itemId,
        messages: paginatedMessages,
        lastActivity: chat.lastActivity,
        unreadCount,
        isActive: chat.isActive,
        createdAt: chat.createdAt
      },
      pagination: {
        current: Number(page),
        total: Math.ceil(totalMessages / limit),
        hasNext: skip > 0,
        totalMessages
      }
    });

    // Mark messages as read (don't wait for completion)
    Chat.findById(chatId)
      .then(chatDoc => {
        if (chatDoc && unreadCount > 0) {
          return chatDoc.markAsRead(userId);
        }
      })
      .catch(err => console.error('Error marking messages as read:', err));

  } catch (error) {
    console.error('Get chat error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid conversation ID' });
    }
    res.status(500).json({ message: 'Server error while fetching conversation' });
  }
});

// @route   POST /api/chats
// @desc    Start new conversation or get existing one
// @access  Private
router.post('/', auth, [
  body('itemId')
    .isMongoId()
    .withMessage('Valid item ID is required'),
  body('message')
    .optional()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { itemId, message } = req.body;
    const buyerId = req.user._id;

    // Check if item exists and is active
    const item = await Item.findById(itemId)
      .populate('sellerId', 'username profile.hostel');

    if (!item || !item.isActive || item.isSold) {
      return res.status(404).json({ message: 'Item not found or not available' });
    }

    const sellerId = item.sellerId._id;

    // Prevent seller from messaging themselves
    if (sellerId.equals(buyerId)) {
      return res.status(400).json({ message: 'You cannot message yourself about your own item' });
    }

    // Find or create conversation
    let chat = await Chat.findOrCreate(buyerId, sellerId, itemId);

    // Add initial message if provided
    if (message && message.trim()) {
      await chat.addMessage(buyerId, message.trim());

      // Emit real-time notification to seller
      req.io?.to(sellerId.toString()).emit('new_message', {
        chatId: chat._id,
        senderId: buyerId,
        senderName: req.user.username,
        message: message.trim(),
        itemTitle: item.title,
        timestamp: new Date()
      });
    }

    // Populate for response
    await chat.populate([
      { path: 'participants', select: 'username profile.hostel' },
      { path: 'itemId', select: 'title price images category' }
    ]);

    res.status(201).json({
      message: 'Conversation started successfully',
      chat: {
        id: chat._id,
        participants: chat.participants,
        otherParticipant: chat.participants.find(p => !p._id.equals(buyerId)),
        item: chat.itemId,
        lastMessage: chat.lastMessage,
        lastActivity: chat.lastActivity,
        createdAt: chat.createdAt
      }
    });

  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ message: 'Server error while starting conversation' });
  }
});

// @route   POST /api/chats/:id/messages
// @desc    Send message to conversation
// @access  Private
router.post('/:id/messages', auth, [
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'system'])
    .withMessage('Invalid message type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { message, messageType = 'text' } = req.body;
    const chatId = req.params.id;
    const senderId = req.user._id;

    const chat = await Chat.findById(chatId)
      .populate('participants', 'username')
      .populate('itemId', 'title');

    if (!chat || !chat.isActive) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is participant
    if (!chat.participants.some(p => p._id.equals(senderId))) {
      return res.status(403).json({ message: 'Access denied to this conversation' });
    }

    // Add message to conversation
    await chat.addMessage(senderId, message.trim(), messageType);

    // Get other participant for real-time notification
    const otherParticipant = chat.participants.find(p => !p._id.equals(senderId));

    // Emit real-time message to other participant
    if (otherParticipant) {
      req.io?.to(otherParticipant._id.toString()).emit('new_message', {
        chatId: chat._id,
        senderId,
        senderName: req.user.username,
        message: message.trim(),
        messageType,
        itemTitle: chat.itemId?.title,
        timestamp: new Date()
      });
    }

    // Emit to chat room (for real-time updates in chat view)
    req.io?.to(chatId).emit('message_added', {
      chatId: chat._id,
      senderId,
      message: message.trim(),
      messageType,
      timestamp: new Date()
    });

    res.status(201).json({
      message: 'Message sent successfully',
      messageData: {
        senderId,
        message: message.trim(),
        messageType,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error while sending message' });
  }
});

// @route   PUT /api/chats/:id/read
// @desc    Mark messages as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const chatId = req.params.id;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);

    if (!chat || !chat.isActive) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is participant
    if (!chat.participants.includes(userId)) {
      return res.status(403).json({ message: 'Access denied to this conversation' });
    }

    await chat.markAsRead(userId);

    // Emit real-time update to other participant
    const otherParticipant = chat.participants.find(p => !p.equals(userId));
    if (otherParticipant) {
      req.io?.to(otherParticipant.toString()).emit('messages_read', {
        chatId: chat._id,
        readBy: userId
      });
    }

    res.json({ message: 'Messages marked as read' });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error while marking messages as read' });
  }
});

// @route   DELETE /api/chats/:id
// @desc    Deactivate conversation
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const chatId = req.params.id;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is participant
    if (!chat.participants.includes(userId)) {
      return res.status(403).json({ message: 'Access denied to this conversation' });
    }

    // Soft delete - set isActive to false
    chat.isActive = false;
    await chat.save();

    res.json({ message: 'Conversation deleted successfully' });

  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ message: 'Server error while deleting conversation' });
  }
});

// @route   GET /api/chats/unread/count
// @desc    Get total unread messages count for current user
// @access  Private
router.get('/unread/count', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const chats = await Chat.find({
      participants: userId,
      isActive: true
    }).lean();

    let totalUnread = 0;
    chats.forEach(chat => {
      const unreadCount = chat.unreadCount?.get(userId.toString()) || 0;
      totalUnread += unreadCount;
    });

    res.json({
      totalUnread,
      activeConversations: chats.length
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error while fetching unread count' });
  }
});

module.exports = router;
