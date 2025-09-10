# Create Item model
item_model = """const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['Clothes', 'Electronics', 'Books', 'Cosmetics', 'Miscellaneous'],
      message: 'Category must be one of: Clothes, Electronics, Books, Cosmetics, Miscellaneous'
    }
  },
  condition: {
    type: String,
    required: [true, 'Condition is required'],
    enum: {
      values: ['New', 'Used', 'Unused'],
      message: 'Condition must be one of: New, Used, Unused'
    }
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    max: [1000000, 'Price cannot exceed 10,00,000']
  },
  originalPrice: {
    type: Number,
    required: [true, 'Original price is required'],
    min: [0, 'Original price cannot be negative'],
    validate: {
      validator: function(value) {
        return value >= this.price;
      },
      message: 'Original price must be greater than or equal to selling price'
    }
  },
  images: [{
    type: String,
    validate: {
      validator: function(v) {
        return /^https?:\\/\\//.test(v);
      },
      message: 'Image must be a valid URL'
    }
  }],
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Seller ID is required']
  },
  hostel: {
    type: String,
    required: [true, 'Hostel preference is required'],
    enum: {
      values: ['Boys', 'Girls'],
      message: 'Hostel must be either Boys or Girls'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isBoosted: {
    type: Boolean,
    default: false
  },
  boostExpiresAt: {
    type: Date,
    default: null
  },
  hearts: {
    type: Number,
    default: 0,
    min: 0
  },
  heartedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  clothingDetails: {
    quality: {
      type: String,
      enum: ['Excellent', 'Good', 'Fair', ''],
      default: ''
    },
    detailedCondition: {
      type: String,
      maxlength: [200, 'Detailed condition cannot exceed 200 characters'],
      default: ''
    },
    age: {
      type: String,
      enum: ['< 6 months', '6-12 months', '1-2 years', '2+ years', ''],
      default: ''
    }
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, 'Tag cannot exceed 20 characters']
  }],
  isReported: {
    type: Boolean,
    default: false
  },
  reportCount: {
    type: Number,
    default: 0,
    min: 0
  },
  soldAt: {
    type: Date,
    default: null
  },
  isSold: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for savings amount
itemSchema.virtual('savings').get(function() {
  return this.originalPrice - this.price;
});

// Virtual for savings percentage
itemSchema.virtual('savingsPercentage').get(function() {
  if (this.originalPrice === 0) return 0;
  return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
});

// Virtual for time since posted
itemSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return 'Just now';
});

// Virtual for boost status
itemSchema.virtual('isBoostActive').get(function() {
  return this.isBoosted && this.boostExpiresAt && this.boostExpiresAt > new Date();
});

// Pre-save middleware to check boost expiry
itemSchema.pre('save', function(next) {
  if (this.isBoosted && this.boostExpiresAt && this.boostExpiresAt < new Date()) {
    this.isBoosted = false;
  }
  next();
});

// Method to add heart
itemSchema.methods.addHeart = function(userId) {
  if (!this.heartedBy.includes(userId)) {
    this.heartedBy.push(userId);
    this.hearts += 1;
  }
  return this.save();
};

// Method to remove heart
itemSchema.methods.removeHeart = function(userId) {
  const index = this.heartedBy.indexOf(userId);
  if (index > -1) {
    this.heartedBy.splice(index, 1);
    this.hearts = Math.max(0, this.hearts - 1);
  }
  return this.save();
};

// Method to boost item
itemSchema.methods.boost = function(durationDays = 7) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + durationDays);
  
  this.isBoosted = true;
  this.boostExpiresAt = expiryDate;
  return this.save();
};

// Method to increment views
itemSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Static method to find active items
itemSchema.statics.findActive = function() {
  return this.find({ isActive: true, isSold: false });
};

// Static method to find boosted items
itemSchema.statics.findBoosted = function() {
  return this.find({ 
    isBoosted: true, 
    boostExpiresAt: { $gt: new Date() },
    isActive: true,
    isSold: false 
  });
};

// Indexes for better query performance
itemSchema.index({ sellerId: 1, isActive: 1 });
itemSchema.index({ category: 1, isActive: 1 });
itemSchema.index({ price: 1 });
itemSchema.index({ createdAt: -1 });
itemSchema.index({ isBoosted: -1, createdAt: -1 });
itemSchema.index({ title: 'text', description: 'text' });

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;
"""

with open('campus-thrift-backend/models/Item.js', 'w') as f:
    f.write(item_model)

print("✓ Created Item.js model")