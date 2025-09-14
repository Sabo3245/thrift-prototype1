const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Item = require('../models/Item');
const User = require('../models/User');
const { auth, optionalAuth, checkOwnership } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateItemCreation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('category')
    .isIn(['Clothes', 'Electronics', 'Books', 'Cosmetics', 'Miscellaneous'])
    .withMessage('Invalid category'),
  body('condition')
    .isIn(['New', 'Used', 'Unused'])
    .withMessage('Condition must be New, Used, or Unused'),
  body('price')
    .isNumeric()
    .custom(value => value >= 0 && value <= 1000000)
    .withMessage('Price must be between 0 and 10,00,000'),
  body('originalPrice')
    .isNumeric()
    .custom((value, { req }) => value >= req.body.price)
    .withMessage('Original price must be greater than or equal to selling price'),
  body('hostel')
    .isIn(['Boys', 'Girls'])
    .withMessage('Hostel must be either Boys or Girls'),
  body('images')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 images allowed'),
  body('clothingDetails.quality')
    .optional()
    .isIn(['Excellent', 'Good', 'Fair', ''])
    .withMessage('Invalid quality rating'),
  body('clothingDetails.age')
    .optional()
    .isIn(['< 6 months', '6-12 months', '1-2 years', '2+ years', ''])
    .withMessage('Invalid age selection')
];

const validateItemUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('price')
    .optional()
    .isNumeric()
    .custom(value => value >= 0 && value <= 1000000)
    .withMessage('Price must be between 0 and 10,00,000'),
  body('originalPrice')
    .optional()
    .isNumeric()
    .withMessage('Original price must be a valid number')
];

// @route   GET /api/items
// @desc    Get all active items with filtering and pagination
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('category').optional().isIn(['Clothes', 'Electronics', 'Books', 'Cosmetics', 'Miscellaneous']),
  query('condition').optional().isIn(['New', 'Used', 'Unused']),
  query('hostel').optional().isIn(['Boys', 'Girls']),
  query('minPrice').optional().isNumeric({ min: 0 }),
  query('maxPrice').optional().isNumeric({ min: 0 }),
  query('search').optional().trim().isLength({ min: 1, max: 100 })
], optionalAuth, async (req, res) => {
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
      category,
      condition,
      hostel,
      minPrice,
      maxPrice,
      search,
      sortBy = 'newest'
    } = req.query;

    // Build filter query
    let query = { isActive: true, isSold: false };

    if (category) query.category = category;
    if (condition) query.condition = condition;
    if (hostel) query.hostel = hostel;

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Build sort criteria
    let sortCriteria = {};
    switch (sortBy) {
      case 'price-low':
        sortCriteria = { price: 1 };
        break;
      case 'price-high':
        sortCriteria = { price: -1 };
        break;
      case 'savings':
        sortCriteria = { savings: -1 };
        break;
      case 'popular':
        sortCriteria = { hearts: -1, views: -1 };
        break;
      case 'newest':
      default:
        sortCriteria = { isBoosted: -1, createdAt: -1 };
    }

    const skip = (page - 1) * limit;

    // Execute query
    const [items, total] = await Promise.all([
      Item.find(query)
        .populate('sellerId', 'username profile.hostel createdAt')
        .sort(sortCriteria)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Item.countDocuments(query)
    ]);

    // Add heart status for authenticated users
    if (req.user) {
      items.forEach(item => {
        item.isHearted = item.heartedBy?.includes(req.user._id) || false;
      });
    }

    const totalPages = Math.ceil(total / limit);

    res.json({
      items,
      pagination: {
        current: Number(page),
        total: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        totalItems: total
      },
      filters: {
        category,
        condition,
        hostel,
        minPrice,
        maxPrice,
        search,
        sortBy
      }
    });

  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({ message: 'Server error while fetching items' });
  }
});

// @route   GET /api/items/:id
// @desc    Get single item by ID
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate('sellerId', 'username profile.hostel createdAt phone isVerified')
      .lean();

    if (!item || !item.isActive || item.isSold) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Increment view count (don't wait for completion)
    Item.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } })
      .exec()
      .catch(err => console.error('Error incrementing views:', err));

    // Add heart status for authenticated users
    if (req.user) {
      item.isHearted = item.heartedBy?.includes(req.user._id) || false;
    }

    res.json({ item });

  } catch (error) {
    console.error('Get item error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid item ID' });
    }
    res.status(500).json({ message: 'Server error while fetching item' });
  }
});

// @route   POST /api/items
// @desc    Create new item
// @access  Private
router.post('/', auth, validateItemCreation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const {
      title,
      description,
      category,
      condition,
      price,
      originalPrice,
      hostel,
      images = [],
      clothingDetails = {},
      tags = []
    } = req.body;

    const newItem = new Item({
      title,
      description,
      category,
      condition,
      price: Number(price),
      originalPrice: Number(originalPrice),
      hostel,
      images,
      sellerId: req.user._id,
      clothingDetails: category === 'Clothes' ? clothingDetails : {},
      tags
    });

    await newItem.save();
    await newItem.populate('sellerId', 'username profile.hostel');

    // Emit real-time update
    req.io?.emit('new_item', {
      item: newItem,
      category: newItem.category
    });

    res.status(201).json({
      message: 'Item created successfully',
      item: newItem
    });

  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ message: 'Server error while creating item' });
  }
});

// @route   PUT /api/items/:id
// @desc    Update item
// @access  Private (Owner only)
router.put('/:id', auth, validateItemUpdate, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const item = await Item.findById(req.params.id);
    if (!item || !item.isActive || item.isSold) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check ownership
    if (!item.sellerId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Access denied. You can only update your own items.' });
    }

    const allowedUpdates = [
      'title', 'description', 'price', 'originalPrice', 
      'images', 'clothingDetails', 'tags', 'condition'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('sellerId', 'username profile.hostel');

    res.json({
      message: 'Item updated successfully',
      item: updatedItem
    });

  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ message: 'Server error while updating item' });
  }
});

// @route   DELETE /api/items/:id
// @desc    Delete/deactivate item
// @access  Private (Owner only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item || !item.isActive) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check ownership
    if (!item.sellerId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Access denied. You can only delete your own items.' });
    }

    // Soft delete - set isActive to false
    item.isActive = false;
    await item.save();

    // Emit real-time update
    req.io?.emit('item_removed', {
      itemId: item._id,
      category: item.category
    });

    res.json({ message: 'Item removed successfully' });

  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ message: 'Server error while deleting item' });
  }
});

// @route   POST /api/items/:id/heart
// @desc    Heart/unheart item
// @access  Private
router.post('/:id/heart', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item || !item.isActive || item.isSold) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const userId = req.user._id;
    const isHearted = item.heartedBy.includes(userId);

    if (isHearted) {
      // Remove heart
      await item.removeHeart(userId);
      await User.findByIdAndUpdate(userId, {
        $pull: { heartedPosts: item._id }
      });
    } else {
      // Add heart
      await item.addHeart(userId);
      await User.findByIdAndUpdate(userId, {
        $addToSet: { heartedPosts: item._id }
      });
    }

    // Emit real-time update
    req.io?.emit('item_hearted', {
      itemId: item._id,
      hearts: item.hearts,
      action: isHearted ? 'removed' : 'added'
    });

    res.json({
      message: isHearted ? 'Item removed from favorites' : 'Item added to favorites',
      hearted: !isHearted,
      hearts: item.hearts
    });

  } catch (error) {
    console.error('Heart item error:', error);
    res.status(500).json({ message: 'Server error while updating favorites' });
  }
});

// @route   POST /api/items/:id/boost
// @desc    Boost item (costs 25 points)
// @access  Private (Owner only)
router.post('/:id/boost', auth, async (req, res) => {
  try {
    const BOOST_COST = 25;
    const BOOST_DURATION_DAYS = 7;

    const item = await Item.findById(req.params.id);
    if (!item || !item.isActive || item.isSold) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check ownership
    if (!item.sellerId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Access denied. You can only boost your own items.' });
    }

    // Check if already boosted and active
    if (item.isBoosted && item.boostExpiresAt > new Date()) {
      return res.status(400).json({ 
        message: 'Item is already boosted',
        expiresAt: item.boostExpiresAt
      });
    }

    // Check user points
    const user = await User.findById(req.user._id);
    if (user.profile.points < BOOST_COST) {
      return res.status(400).json({ 
        message: `Insufficient points. You need ${BOOST_COST} points to boost an item.`,
        currentPoints: user.profile.points,
        required: BOOST_COST
      });
    }

    // Deduct points and boost item
    await user.deductPoints(BOOST_COST);
    await item.boost(BOOST_DURATION_DAYS);

    // Emit real-time update
    req.io?.emit('item_boosted', {
      itemId: item._id,
      sellerId: user._id
    });

    res.json({
      message: 'Item boosted successfully',
      pointsRemaining: user.profile.points - BOOST_COST,
      boostExpiresAt: item.boostExpiresAt
    });

  } catch (error) {
    console.error('Boost item error:', error);
    res.status(500).json({ message: 'Server error while boosting item' });
  }
});

// @route   GET /api/items/user/:userId
// @desc    Get user's active items
// @access  Public
router.get('/user/:userId', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Item.find({ 
        sellerId: req.params.userId, 
        isActive: true,
        isSold: false 
      })
        .sort({ isBoosted: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Item.countDocuments({ 
        sellerId: req.params.userId, 
        isActive: true,
        isSold: false 
      })
    ]);

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
    console.error('Get user items error:', error);
    res.status(500).json({ message: 'Server error while fetching user items' });
  }
});

module.exports = router;
