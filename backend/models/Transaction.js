const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Transaction amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  originalPrice: {
    type: Number,
    required: [true, 'Original price is required'],
    min: [0, 'Original price cannot be negative']
  },
  savings: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'completed', 'cancelled', 'disputed'],
      message: 'Status must be one of: pending, completed, cancelled, disputed'
    },
    default: 'pending'
  },
  transactionType: {
    type: String,
    enum: ['sale', 'purchase'],
    required: true
  },
  pointsAwarded: {
    type: Number,
    default: 5,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'card', 'other'],
    default: 'cash'
  },
  meetingLocation: {
    type: String,
    trim: true,
    maxlength: [200, 'Meeting location cannot exceed 200 characters']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  completedAt: {
    type: Date,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancellationReason: {
    type: String,
    trim: true,
    maxlength: [200, 'Cancellation reason cannot exceed 200 characters']
  },
  rating: {
    buyer: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      review: {
        type: String,
        maxlength: [300, 'Review cannot exceed 300 characters']
      }
    },
    seller: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      review: {
        type: String,
        maxlength: [300, 'Review cannot exceed 300 characters']
      }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for transaction age
transactionSchema.virtual('transactionAge').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return 'Just now';
});

// Pre-save middleware to calculate savings
transactionSchema.pre('save', function(next) {
  if (this.originalPrice && this.amount) {
    this.savings = this.originalPrice - this.amount;
  }
  next();
});

// Method to complete transaction
transactionSchema.methods.complete = async function() {
  this.status = 'completed';
  this.completedAt = new Date();

  // Award points to both buyer and seller
  const User = mongoose.model('User');

  await Promise.all([
    User.findByIdAndUpdate(this.buyerId, {
      $inc: { 
        'profile.points': this.pointsAwarded,
        'profile.totalTransactions': 1,
        'profile.moneySaved': this.savings
      }
    }),
    User.findByIdAndUpdate(this.sellerId, {
      $inc: { 
        'profile.points': this.pointsAwarded,
        'profile.totalTransactions': 1
      }
    })
  ]);

  // Mark item as sold
  const Item = mongoose.model('Item');
  await Item.findByIdAndUpdate(this.itemId, {
    isSold: true,
    soldAt: new Date()
  });

  return this.save();
};

// Method to cancel transaction
transactionSchema.methods.cancel = function(reason = '') {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  return this.save();
};

// Static method to get user transaction stats
transactionSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    {
      $match: {
        $or: [{ buyerId: userId }, { sellerId: userId }],
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalTransactions: { $sum: 1 },
        totalSpent: {
          $sum: {
            $cond: [{ $eq: ['$buyerId', userId] }, '$amount', 0]
          }
        },
        totalEarned: {
          $sum: {
            $cond: [{ $eq: ['$sellerId', userId] }, '$amount', 0]
          }
        },
        totalSaved: {
          $sum: {
            $cond: [{ $eq: ['$buyerId', userId] }, '$savings', 0]
          }
        },
        totalPoints: {
          $sum: '$pointsAwarded'
        }
      }
    }
  ]);

  return stats[0] || {
    totalTransactions: 0,
    totalSpent: 0,
    totalEarned: 0,
    totalSaved: 0,
    totalPoints: 0
  };
};

// Static method to create purchase transaction
transactionSchema.statics.createPurchase = function(buyerId, sellerId, itemId, amount, originalPrice) {
  return new this({
    buyerId,
    sellerId,
    itemId,
    amount,
    originalPrice,
    transactionType: 'purchase',
    status: 'pending'
  });
};

// Static method to create sale transaction
transactionSchema.statics.createSale = function(buyerId, sellerId, itemId, amount, originalPrice) {
  return new this({
    buyerId,
    sellerId,
    itemId,
    amount,
    originalPrice,
    transactionType: 'sale',
    status: 'pending'
  });
};

// Indexes for better performance
transactionSchema.index({ buyerId: 1, status: 1 });
transactionSchema.index({ sellerId: 1, status: 1 });
transactionSchema.index({ itemId: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
