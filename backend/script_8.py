# Create authentication routes
auth_routes = """const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, sensitiveOperationLimit } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-20 characters and contain only letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('hostel')
    .optional()
    .isIn(['Boys', 'Girls'])
    .withMessage('Hostel must be either Boys or Girls')
];

const validateLogin = [
  body('identifier')
    .notEmpty()
    .withMessage('Username or email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET || 'fallback-secret-key', 
    { expiresIn: '7d' }
  );
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', validateRegistration, sensitiveOperationLimit(3), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { username, email, password, hostel, comfortPreference } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: username }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.email === email.toLowerCase() ? 
          'User with this email already exists' : 
          'Username already taken' 
      });
    }

    // Create new user
    const user = new User({
      username,
      email: email.toLowerCase(),
      password,
      profile: {
        hostel: hostel || '',
        comfortPreference: comfortPreference || 'Comfortable meeting anyone'
      }
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profile: user.profile
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateLogin, sensitiveOperationLimit(5), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { identifier, password } = req.body;

    // Find user by email or username
    const user = await User.findByEmailOrUsername(identifier).select('+password');

    if (!user || !user.isActive) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profile: user.profile,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('heartedPosts', 'title price images category')
      .populate('activeListings');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        isVerified: user.isVerified,
        profile: user.profile,
        heartedPosts: user.heartedPosts,
        activeListings: user.activeListings,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-20 characters and contain only letters, numbers, and underscores'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .optional()
    .isMobilePhone('en-IN')
    .withMessage('Please provide a valid Indian mobile number'),
  body('profile.hostel')
    .optional()
    .isIn(['Boys', 'Girls', ''])
    .withMessage('Hostel must be either Boys or Girls'),
  body('profile.comfortPreference')
    .optional()
    .isIn(['Comfortable meeting anyone', 'Prefer same hostel'])
    .withMessage('Invalid comfort preference')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { username, email, phone, profile } = req.body;
    const userId = req.user._id;

    // Check if username/email already exists (for other users)
    if (username || email) {
      const existingUser = await User.findOne({
        _id: { $ne: userId },
        $or: [
          ...(username ? [{ username }] : []),
          ...(email ? [{ email: email.toLowerCase() }] : [])
        ]
      });

      if (existingUser) {
        return res.status(400).json({ 
          message: 'Username or email already taken by another user' 
        });
      }
    }

    // Update user
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email.toLowerCase();
    if (phone !== undefined) updateData.phone = phone;
    if (profile) updateData.profile = { ...req.user.profile.toObject(), ...profile };

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone,
        profile: updatedUser.profile
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error during profile update' });
  }
});

// @route   POST /api/auth/verify-phone
// @desc    Verify phone number (mock implementation)
// @access  Private
router.post('/verify-phone', auth, [
  body('phone')
    .isMobilePhone('en-IN')
    .withMessage('Please provide a valid Indian mobile number'),
  body('otp')
    .optional()
    .isLength({ min: 4, max: 6 })
    .isNumeric()
    .withMessage('OTP must be 4-6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { phone, otp } = req.body;

    // Mock OTP verification (in production, integrate with SMS service)
    if (otp) {
      // Verify OTP (mock - accept any 4-digit number)
      if (otp.length >= 4) {
        await User.findByIdAndUpdate(req.user._id, {
          phone,
          isVerified: true
        });

        res.json({ 
          message: 'Phone verified successfully',
          verified: true 
        });
      } else {
        res.status(400).json({ message: 'Invalid OTP' });
      }
    } else {
      // Send OTP (mock)
      res.json({ 
        message: 'OTP sent to your phone number',
        mockOtp: '1234' // Remove in production
      });
    }

  } catch (error) {
    console.error('Phone verification error:', error);
    res.status(500).json({ message: 'Server error during verification' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', auth, (req, res) => {
  res.json({ message: 'Logout successful. Please remove token from client.' });
});

module.exports = router;
"""

with open('campus-thrift-backend/routes/auth.js', 'w') as f:
    f.write(auth_routes)

print("✓ Created auth.js routes")