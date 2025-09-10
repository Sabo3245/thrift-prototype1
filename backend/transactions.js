const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Item = require('../models/Item');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/transactions
// @desc    Create a new transaction
// @access  Private
router.post('/', auth, [
  body('itemId')
    .isMongoId()
    .withMessage('Valid item ID is required'),
  body('sellerId')
    .isMongoId()
    .withMessage('Valid seller ID is required'),
  body('amount')
    .isNumeric()
    .custom(value => value > 0)
    .withMessage('Amount must be a positive number'),
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'upi', 'card', 'other'])
    .withMessage('Invalid payment method'),
  body('meetingLocation')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Meeting location cannot exceed 200 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const {
      itemId,
      sellerId,
      amount,
      paymentMethod = 'cash',
      meetingLocation,
      notes
    } = req.body;

    const buyerId = req.user._id;

    // Validate item exists and is available
    const item = await Item.findById(itemId)
      .populate('sellerId', 'username profile.hostel');

    if (!item || !item.isActive || item.isSold) {
      return res.status(400).json({ message: 'Item is not available for purchase' });
    }

    // Validate seller
    if (!item.sellerId._id.equals(sellerId)) {
      return res.status(400).json({ message: 'Invalid seller for this item' });
    }

    // Prevent self-purchase
    if (buyerId.equals(sellerId)) {
      return res.status(400).json({ message: 'You cannot purchase your own item' });
    }

    // Validate amount matches item price
    if (Number(amount) !== item.price) {
      return res.status(400).json({ 
        message: `Amount must match item price of ₹${item.price}` 
      });
    }

    // Check if transaction already exists for this item
    const existingTransaction = await Transaction.findOne({
      itemId,
      status: { $in: ['pending', 'completed'] }
    });

    if (existingTransaction) {
      return res.status(400).json({ 
        message: 'A transaction already exists for this item' 
      });
    }

    // Create transaction
    const transaction = new Transaction({
      buyerId,
      sellerId,
      itemId,
      amount: Number(amount),
      originalPrice: item.originalPrice,
      transactionType: 'purchase',
      paymentMethod,
      meetingLocation,
      notes,
      status: 'pending'
    });

    await transaction.save();

    // Populate transaction for response
    await transaction.populate([
      { path: 'buyerId', select: 'username profile.hostel phone' },
      { path: 'sellerId', select: 'username profile.hostel phone' },
      { path: 'itemId', select: 'title category price originalPrice images' }
    ]);

    // Emit real-time notification to seller
    req.io?.to(sellerId.toString()).emit('new_transaction', {
      transactionId: transaction._id,
      buyerName: req.user.username,
      itemTitle: item.title,
      amount: transaction.amount,
      type: 'incoming'
    });

    res.status(201).json({
      message: 'Transaction initiated successfully',
      transaction
    });

  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ message: 'Server error while creating transaction' });
  }
});

// @route   GET /api/transactions
// @desc    Get user's transactions with filtering
// @access  Private
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('status').optional().isIn(['all', 'pending', 'completed', 'cancelled']),
  query('type').optional().isIn(['all', 'purchases', 'sales']),
  query('sortBy').optional().isIn(['newest', 'oldest', 'amount-high', 'amount-low'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const {
      page = 1,
      limit = 20,
      status = 'all',
      type = 'all',
      sortBy = 'newest'
    } = req.query;

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

    // Build sort criteria
    let sortCriteria = {};
    switch (sortBy) {
      case 'oldest':
        sortCriteria = { createdAt: 1 };
        break;
      case 'amount-high':
        sortCriteria = { amount: -1 };
        break;
      case 'amount-low':
        sortCriteria = { amount: 1 };
        break;
      case 'newest':
      default:
        sortCriteria = { createdAt: -1 };
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate('buyerId', 'username profile.hostel')
        .populate('sellerId', 'username profile.hostel')
        .populate('itemId', 'title category price originalPrice images')
        .sort(sortCriteria)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Transaction.countDocuments(query)
    ]);

    // Add user role to each transaction
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
      filters: { status, type, sortBy }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error while fetching transactions' });
  }
});

// @route   GET /api/transactions/:id
// @desc    Get specific transaction
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('buyerId', 'username profile.hostel phone email')
      .populate('sellerId', 'username profile.hostel phone email')
      .populate('itemId', 'title category price originalPrice images description')
      .lean();

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const userId = req.user._id;

    // Check if user is involved in this transaction
    if (!transaction.buyerId._id.equals(userId) && !transaction.sellerId._id.equals(userId)) {
      return res.status(403).json({ message: 'Access denied to this transaction' });
    }

    // Add user role and other party info
    const userRole = transaction.buyerId._id.equals(userId) ? 'buyer' : 'seller';
    const otherParty = userRole === 'buyer' ? transaction.sellerId : transaction.buyerId;

    res.json({
      transaction: {
        ...transaction,
        userRole,
        otherParty
      }
    });

  } catch (error) {
    console.error('Get transaction error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid transaction ID' });
    }
    res.status(500).json({ message: 'Server error while fetching transaction' });
  }
});

// @route   PUT /api/transactions/:id/complete
// @desc    Mark transaction as completed
// @access  Private
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('buyerId', 'username profile')
      .populate('sellerId', 'username profile')
      .populate('itemId', 'title');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const userId = req.user._id;

    // Only buyer or seller can complete transaction
    if (!transaction.buyerId._id.equals(userId) && !transaction.sellerId._id.equals(userId)) {
      return res.status(403).json({ message: 'Access denied to this transaction' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ 
        message: `Transaction is already ${transaction.status}` 
      });
    }

    // Complete transaction (this will award points and mark item as sold)
    await transaction.complete();

    // Emit real-time notifications
    const otherPartyId = userId.equals(transaction.buyerId._id) 
      ? transaction.sellerId._id 
      : transaction.buyerId._id;

    req.io?.to(otherPartyId.toString()).emit('transaction_completed', {
      transactionId: transaction._id,
      itemTitle: transaction.itemId.title,
      pointsEarned: transaction.pointsAwarded
    });

    req.io?.emit('item_sold', {
      itemId: transaction.itemId._id
    });

    res.json({
      message: 'Transaction completed successfully',
      transaction: {
        ...transaction.toObject(),
        status: 'completed',
        pointsAwarded: transaction.pointsAwarded
      }
    });

  } catch (error) {
    console.error('Complete transaction error:', error);
    res.status(500).json({ message: 'Server error while completing transaction' });
  }
});

// @route   PUT /api/transactions/:id/cancel
// @desc    Cancel transaction
// @access  Private
router.put('/:id/cancel', auth, [
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Cancellation reason cannot exceed 200 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { reason = '' } = req.body;
    const transaction = await Transaction.findById(req.params.id)
      .populate('buyerId', 'username')
      .populate('sellerId', 'username')
      .populate('itemId', 'title');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const userId = req.user._id;

    // Only buyer or seller can cancel transaction
    if (!transaction.buyerId._id.equals(userId) && !transaction.sellerId._id.equals(userId)) {
      return res.status(403).json({ message: 'Access denied to this transaction' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ 
        message: `Cannot cancel transaction that is ${transaction.status}` 
      });
    }

    // Cancel transaction
    await transaction.cancel(reason);

    // Emit real-time notification
    const otherPartyId = userId.equals(transaction.buyerId._id) 
      ? transaction.sellerId._id 
      : transaction.buyerId._id;

    req.io?.to(otherPartyId.toString()).emit('transaction_cancelled', {
      transactionId: transaction._id,
      itemTitle: transaction.itemId.title,
      reason: reason || 'No reason provided'
    });

    res.json({
      message: 'Transaction cancelled successfully',
      transaction: {
        ...transaction.toObject(),
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: reason
      }
    });

  } catch (error) {
    console.error('Cancel transaction error:', error);
    res.status(500).json({ message: 'Server error while cancelling transaction' });
  }
});

// @route   POST /api/transactions/:id/rate
// @desc    Rate transaction (buyer rates seller and vice versa)
// @access  Private
router.post('/:id/rate', auth, [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('review')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Review cannot exceed 300 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { rating, review = '' } = req.body;
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const userId = req.user._id;

    // Only completed transactions can be rated
    if (transaction.status !== 'completed') {
      return res.status(400).json({ 
        message: 'Only completed transactions can be rated' 
      });
    }

    // Check if user is involved in transaction
    const isBuyer = transaction.buyerId.equals(userId);
    const isSeller = transaction.sellerId.equals(userId);

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ message: 'Access denied to this transaction' });
    }

    // Update rating
    if (isBuyer) {
      // Buyer rating seller
      if (transaction.rating.buyer.rating) {
        return res.status(400).json({ message: 'You have already rated this transaction' });
      }
      transaction.rating.buyer = { rating, review };
    } else {
      // Seller rating buyer
      if (transaction.rating.seller.rating) {
        return res.status(400).json({ message: 'You have already rated this transaction' });
      }
      transaction.rating.seller = { rating, review };
    }

    await transaction.save();

    res.json({
      message: 'Rating submitted successfully',
      rating: {
        rating,
        review,
        role: isBuyer ? 'buyer' : 'seller'
      }
    });

  } catch (error) {
    console.error('Rate transaction error:', error);
    res.status(500).json({ message: 'Server error while submitting rating' });
  }
});

// @route   GET /api/transactions/stats/summary
// @desc    Get transaction statistics summary for current user
// @access  Private
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const [userStats, recentTransactions] = await Promise.all([
      Transaction.getUserStats(userId),
      Transaction.find({
        $or: [{ buyerId: userId }, { sellerId: userId }],
        status: 'completed'
      })
        .populate('itemId', 'title category')
        .sort({ completedAt: -1 })
        .limit(5)
        .lean()
    ]);

    // Get monthly transaction data for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyStats = await Transaction.aggregate([
      {
        $match: {
          $or: [{ buyerId: userId }, { sellerId: userId }],
          status: 'completed',
          completedAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$completedAt' },
            month: { $month: '$completedAt' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalSavings: { $sum: '$savings' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.json({
      summary: userStats,
      recentTransactions: recentTransactions.map(t => ({
        id: t._id,
        itemTitle: t.itemId?.title,
        category: t.itemId?.category,
        amount: t.amount,
        savings: t.savings,
        type: t.buyerId.equals(userId) ? 'purchase' : 'sale',
        date: t.completedAt || t.createdAt
      })),
      monthlyStats: monthlyStats.map(stat => ({
        month: `${stat._id.year}-${String(stat._id.month).padStart(2, '0')}`,
        transactions: stat.count,
        totalAmount: stat.totalAmount,
        totalSavings: stat.totalSavings
      }))
    });

  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({ message: 'Server error while fetching transaction statistics' });
  }
});

module.exports = router;
