# Create Chat model
chat_model = """const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'system'],
    default: 'text'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  messages: [messageSchema],
  lastMessage: {
    content: String,
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for other participant (from current user's perspective)
chatSchema.methods.getOtherParticipant = function(currentUserId) {
  return this.participants.find(p => !p.equals(currentUserId));
};

// Method to add message
chatSchema.methods.addMessage = function(senderId, message, messageType = 'text') {
  const newMessage = {
    senderId,
    message,
    messageType,
    isRead: false
  };
  
  this.messages.push(newMessage);
  this.lastMessage = {
    content: message,
    senderId,
    timestamp: new Date()
  };
  this.lastActivity = new Date();
  
  // Update unread count for other participants
  this.participants.forEach(participantId => {
    if (!participantId.equals(senderId)) {
      const currentCount = this.unreadCount.get(participantId.toString()) || 0;
      this.unreadCount.set(participantId.toString(), currentCount + 1);
    }
  });
  
  return this.save();
};

// Method to mark messages as read
chatSchema.methods.markAsRead = function(userId) {
  this.messages.forEach(message => {
    if (!message.senderId.equals(userId) && !message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
    }
  });
  
  // Reset unread count for this user
  this.unreadCount.set(userId.toString(), 0);
  
  return this.save();
};

// Static method to find or create chat
chatSchema.statics.findOrCreate = async function(buyerId, sellerId, itemId) {
  let chat = await this.findOne({
    participants: { $all: [buyerId, sellerId] },
    itemId: itemId
  }).populate('participants', 'username profile.hostel')
    .populate('itemId', 'title price images');
  
  if (!chat) {
    chat = new this({
      participants: [buyerId, sellerId],
      itemId: itemId,
      messages: [],
      unreadCount: {
        [buyerId]: 0,
        [sellerId]: 0
      }
    });
    await chat.save();
    await chat.populate('participants', 'username profile.hostel');
    await chat.populate('itemId', 'title price images');
  }
  
  return chat;
};

// Index for better performance
chatSchema.index({ participants: 1, itemId: 1 });
chatSchema.index({ lastActivity: -1 });
chatSchema.index({ 'participants': 1, 'lastActivity': -1 });

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
"""

with open('campus-thrift-backend/models/Chat.js', 'w') as f:
    f.write(chat_model)

print("✓ Created Chat.js model")