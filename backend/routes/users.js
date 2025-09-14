const express = require('express');
const { query, validationResult } = require('express-validator');
const User = require('../models/User');
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get current user's complete profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'heartedPosts',
        match: { isActive: true, isSold: false },
        select: 'title price originalPrice images category condition hearts createdAt',
        populate: {
          path: 'sellerId',
          select: 'username'
        }
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user statistics
    const [activeListings, soldItems, transactionStats] = await Promise.all([
      Item.countDocuments({ 
        sellerId: user._id, 
        isActive: true, 
        isSold: false 
      }),
      Item.countDocuments({ 
        sellerId: user._id, 
        isSold: true 
      }),
      Transaction.getUserStats(user._id)
    ]);

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        isVerified: user.isVerified,
        profile: user.profile,
        heartedPosts: user.heartedPosts,
        statistics: {
          activeListings,
          soldItems,
          totalTransactions: transactionStats.totalTransactions,
          totalEarned: transactionStats.totalEarned,
          totalSpent: transactionStats.totalSpent,
          totalSaved: transactionStats.totalSaved,
          pointsEarned: transactionStats.totalPoints
        },
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
});

// @route   GET /api/users/listings
// @desc    Get current user's listings
// @access  Private
router.get('/listings', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('status').optional().isIn(['active', 'sold', 'inactive', 'all'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { page = 1, limit = 20, status = 'active' } = req.query;
    const skip = (page - 1) * limit;

    // Build query based on status
    let query = { sellerId: req.user._id };

    switch (status) {
      case 'active':
        query.isActive = true;
        query.isSold = false;
        break;
      case 'sold':
        query.isSold = true;
        break;
      case 'inactive':
        query.isActive = false;
        break;
      case 'all':
        // No additional filters
        break;
    }

    const [items, total] = await Promise.all([
      Item.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Item.countDocuments(query)
    ]);

    res.json({
      items,
      pagination: {
        current: Number(page),
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        totalItems: total
      },
      status
    });

  } catch (error) {
    console.error('Get user listings error:', error);
    res.status(500).json({ message: 'Server error while fetching listings' });
  }
});

// @route   GET /api/users/hearted
// @desc    Get current user's hearted/favorite items
// @access  Private
router.get('/hearted', auth, [
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

    const user = await User.findById(req.user._id).select('heartedPosts');

    if (!user.heartedPosts.length) {
      return res.json({
        items: [],
        pagination: {
          current: 1,
          total: 0,
          hasNext: false,
          totalItems: 0
        }
      });
    }

    const [items, total] = await Promise.all([
      Item.find({
        _id: { $in: user.heartedPosts },
        isActive: true,
        isSold: false
      })
        .populate('sellerId', 'username profile.hostel')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Item.countDocuments({
        _id: { $in: user.heartedPosts },
        isActive: true,
        isSold: false
      })
    ]);

    // Mark all as hearted
    items.forEach(item => {
      item.isHearted = true;
    });

    res.json({
      items,
      pagination: {
        current: Number(page),
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        totalItems: total
      }
    });

  } catch (error) {
    console.error('Get hearted items error:', error);
    res.status(500).json({ message: 'Server error while fetching favorite items' });
  }
});

// @route   GET /api/users/transactions
// @desc    Get current user's transaction history
// @access  Private
router.get('/transactions', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('type').optional().isIn(['all', 'purchases', 'sales']),
  query('status').optional().isIn(['all', 'pending', 'completed', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { page = 1, limit = 20, type = 'all', status = 'all' } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user._id;

    // Build query
    let query = {
      $or: [{ buyerId: userId }, { sellerId: userId }]
    };

    if (type === 'purchases') {
      query = { buyerId: userId };
    } else if (type === 'sales') {
      query = { sellerId: userId };
    }

    if (status !== 'all') {
      query.status = status;
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate('buyerId', 'username profile.hostel')
        .populate('sellerId', 'username profile.hostel')
        .populate('itemId', 'title images category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Transaction.countDocuments(query)
    ]);

    // Add transaction type for each transaction from user's perspective
    const processedTransactions = transactions.map(transaction => ({
      ...transaction,
      userRole: transaction.buyerId._id.equals(userId) ? 'buyer' : 'seller',
      otherParty: transaction.buyerId._id.equals(userId) 
        ? transaction.sellerId 
        : transaction.buyerId
    }));

    res.json({
      transactions: processedTransactions,
      pagination: {
        current: Number(page),
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        totalItems: total
      },
      filters: { type, status }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error while fetching transactions' });
  }
});

// @route   GET /api/users/savings
// @desc    Get current user's total savings and breakdown
// @access  Private
router.get('/savings', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get completed purchase transactions to calculate savings
    const purchaseTransactions = await Transaction.find({
      buyerId: userId,
      status: 'completed'
    }).populate('itemId', 'title category');

    // Calculate savings breakdown
    const savingsBreakdown = {
      totalSavings: 0,
      totalTransactions: purchaseTransactions.length,
      savingsByCategory: {},
      recentSavings: []
    };

    purchaseTransactions.forEach(transaction => {
      const savings = transaction.savings || 0;
      const category = transaction.itemId?.category || 'Unknown';

      savingsBreakdown.totalSavings += savings;

      // Group by category
      if (!savingsBreakdown.savingsByCategory[category]) {
        savingsBreakdown.savingsByCategory[category] = {
          total: 0,
          count: 0,
          percentage: 0
        };
      }

      savingsBreakdown.savingsByCategory[category].total += savings;
      savingsBreakdown.savingsByCategory[category].count += 1;
    });

    // Calculate percentages
    Object.keys(savingsBreakdown.savingsByCategory).forEach(category => {
      const categoryData = savingsBreakdown.savingsByCategory[category];
      categoryData.percentage = savingsBreakdown.totalSavings > 0 
        ? Math.round((categoryData.total / savingsBreakdown.totalSavings) * 100)
        : 0;
    });

    // Get recent savings (last 5 transactions)
    savingsBreakdown.recentSavings = purchaseTransactions
      .slice(0, 5)
      .map(transaction => ({
        itemTitle: transaction.itemId?.title || 'Unknown Item',
        savings: transaction.savings || 0,
        date: transaction.completedAt || transaction.createdAt,
        category: transaction.itemId?.category || 'Unknown'
      }));

    // Update user's profile with current total savings
    await User.findByIdAndUpdate(userId, {
      'profile.moneySaved': savingsBreakdown.totalSavings
    });

    res.json(savingsBreakdown);

  } catch (error) {
    console.error('Get savings error:', error);
    res.status(500).json({ message: 'Server error while calculating savings' });
  }
});

// @route   GET /api/users/points
// @desc    Get current user's points information
// @access  Private
router.get('/points', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Get recent point-earning transactions
    const recentTransactions = await Transaction.find({
      $or: [{ buyerId: user._id }, { sellerId: user._id }],
      status: 'completed'
    })
      .populate('itemId', 'title category')
      .sort({ completedAt: -1 })
      .limit(10)
      .lean();

    const pointsInfo = {
      currentPoints: user.profile.points,
      totalTransactions: user.profile.totalTransactions,
      pointsPerTransaction: 5,
      pointsToBoost: 25,
      canBoost: user.profile.points >= 25,
      recentEarnings: recentTransactions.map(transaction => ({
        itemTitle: transaction.itemId?.title || 'Unknown Item',
        points: transaction.pointsAwarded || 5,
        date: transaction.completedAt || transaction.createdAt,
        type: transaction.buyerId.equals(user._id) ? 'purchase' : 'sale'
      }))
    };

    res.json(pointsInfo);

  } catch (error) {
    console.error('Get points error:', error);
    res.status(500).json({ message: 'Server error while fetching points information' });
  }
});

// @route   GET /api/users/dashboard
// @desc    Get dashboard summary for current user
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const [
      user,
      activeListings,
      heartedCount,
      recentTransactions,
      transactionStats
    ] = await Promise.all([
      User.findById(userId).select('profile username email'),
      Item.countDocuments({ 
        sellerId: userId, 
        isActive: true, 
        isSold: false 
      }),
      User.findById(userId).select('heartedPosts').then(u => u.heartedPosts.length),
      Transaction.find({
        $or: [{ buyerId: userId }, { sellerId: userId }],
        status: 'completed'
      })
        .populate('itemId', 'title category images')
        .sort({ completedAt: -1 })
        .limit(5)
        .lean(),
      Transaction.getUserStats(userId)
    ]);

    const dashboardData = {
      user: {
        username: user.username,
        email: user.email,
        points: user.profile.points,
        totalTransactions: user.profile.totalTransactions,
        moneySaved: user.profile.moneySaved
      },
      quickStats: {
        activeListings,
        heartedItems: heartedCount,
        completedTransactions: transactionStats.totalTransactions,
        totalEarned: transactionStats.totalEarned,
        totalSaved: transactionStats.totalSaved
      },
      recentActivity: recentTransactions.map(transaction => ({
        id: transaction._id,
        item: transaction.itemId,
        type: transaction.buyerId.equals(userId) ? 'purchase' : 'sale',
        amount: transaction.amount,
        savings: transaction.savings,
        date: transaction.completedAt || transaction.createdAt
      }))
    };

    res.json(dashboardData);

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Server error while fetching dashboard data' });
  }
});

// @route   GET /api/users/:id/public
// @desc    Get public profile of any user
// @access  Public
router.get('/:id/public', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('username profile.hostel createdAt')
      .lean();

    if (!user || !user.isActive) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's active listings count and rating info
    const [activeListingsCount, completedSales] = await Promise.all([
      Item.countDocuments({ 
        sellerId: req.params.id, 
        isActive: true, 
        isSold: false 
      }),
      Transaction.countDocuments({
        sellerId: req.params.id,
        status: 'completed'
      })
    ]);

    res.json({
      user: {
        id: user._id,
        username: user.username,
        hostel: user.profile.hostel,
        memberSince: user.createdAt,
        activeListings: activeListingsCount,
        completedSales,
        // Note: Private information like email, phone, points not included
      }
    });

  } catch (error) {
    console.error('Get public profile error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    res.status(500).json({ message: 'Server error while fetching public profile' });
  }
});

module.exports = router;
