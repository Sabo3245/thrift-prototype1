# Create User model
user_model = """const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [20, 'Username cannot exceed 20 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  phone: {
    type: String,
    default: '',
    validate: {
      validator: function(v) {
        return !v || validator.isMobilePhone(v, 'en-IN');
      },
      message: 'Please enter a valid phone number'
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  profile: {
    hostel: {
      type: String,
      enum: ['Boys', 'Girls', ''],
      default: ''
    },
    comfortPreference: {
      type: String,
      enum: ['Comfortable meeting anyone', 'Prefer same hostel'],
      default: 'Comfortable meeting anyone'
    },
    points: {
      type: Number,
      default: 0,
      min: 0
    },
    totalTransactions: {
      type: Number,
      default: 0,
      min: 0
    },
    moneySaved: {
      type: Number,
      default: 0,
      min: 0
    },
    avatar: {
      type: String,
      default: ''
    }
  },
  heartedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Virtual for user's active listings
userSchema.virtual('activeListings', {
  ref: 'Item',
  localField: '_id',
  foreignField: 'sellerId',
  match: { isActive: true }
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to add points
userSchema.methods.addPoints = function(points) {
  this.profile.points += points;
  this.profile.totalTransactions += 1;
  return this.save();
};

// Method to deduct points
userSchema.methods.deductPoints = function(points) {
  if (this.profile.points < points) {
    throw new Error('Insufficient points');
  }
  this.profile.points -= points;
  return this.save();
};

// Static method to find user by email or username
userSchema.statics.findByEmailOrUsername = function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier }
    ]
  });
};

// Index for better query performance
userSchema.index({ email: 1, username: 1 });
userSchema.index({ 'profile.points': -1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
"""

with open('campus-thrift-backend/models/User.js', 'w') as f:
    f.write(user_model)

print("✓ Created User.js model")