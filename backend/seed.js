const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Item = require('./models/Item');
const Transaction = require('./models/Transaction');
const Chat = require('./models/Chat');

const seedData = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Item.deleteMany({});
    await Transaction.deleteMany({});
    await Chat.deleteMany({});

    console.log('🧹 Cleared existing data');

    // Create sample users
    const sampleUsers = [
      {
        username: 'student123',
        email: 'student@gmail.com',
        password: await bcrypt.hash('password123', 12),
        phone: '+91-9876543210',
        isVerified: true,
        profile: {
          hostel: 'Boys',
          comfortPreference: 'Comfortable meeting anyone',
          points: 25,
          totalTransactions: 2,
          moneySaved: 1500
        }
      },
      {
        username: 'collegegirl',
        email: 'girl@college.edu',
        password: await bcrypt.hash('password123', 12),
        phone: '+91-9876543211',
        isVerified: true,
        profile: {
          hostel: 'Girls',
          comfortPreference: 'Prefer same hostel',
          points: 15,
          totalTransactions: 1,
          moneySaved: 700
        }
      },
      {
        username: 'techguy',
        email: 'tech@student.ac.in',
        password: await bcrypt.hash('password123', 12),
        phone: '+91-9876543212',
        isVerified: false,
        profile: {
          hostel: 'Boys',
          comfortPreference: 'Comfortable meeting anyone',
          points: 40,
          totalTransactions: 5,
          moneySaved: 3200
        }
      },
      {
        username: 'bookworm',
        email: 'books@library.edu',
        password: await bcrypt.hash('password123', 12),
        phone: '',
        isVerified: false,
        profile: {
          hostel: 'Girls',
          comfortPreference: 'Comfortable meeting anyone',
          points: 10,
          totalTransactions: 0,
          moneySaved: 0
        }
      }
    ];

    const createdUsers = await User.insertMany(sampleUsers);
    console.log(`✅ Created ${createdUsers.length} sample users`);

    // Create sample items
    const sampleItems = [
      {
        title: 'Vintage Denim Jacket',
        description: 'Perfect condition vintage denim jacket, size M. Bought from brand store, barely used. Great for college casual wear.',
        category: 'Clothes',
        condition: 'Used',
        price: 1200,
        originalPrice: 2500,
        images: ['https://images.unsplash.com/photo-1544966503-7cc5ac882d5e?w=500'],
        sellerId: createdUsers[0]._id,
        hostel: 'Boys',
        hearts: 3,
        heartedBy: [createdUsers[1]._id, createdUsers[2]._id, createdUsers[3]._id],
        views: 15,
        clothingDetails: {
          quality: 'Good',
          detailedCondition: 'Minimal wear, no stains or tears',
          age: '1-2 years'
        },
        tags: ['vintage', 'denim', 'casual'],
        isBoosted: false
      },
      {
        title: 'MacBook Pro 13" 2019',
        description: '2019 MacBook Pro in excellent condition. 512GB SSD, 16GB RAM. Perfect for coding and design work. Includes original charger and box.',
        category: 'Electronics',
        condition: 'Used',
        price: 85000,
        originalPrice: 120000,
        images: ['https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500'],
        sellerId: createdUsers[2]._id,
        hostel: 'Boys',
        hearts: 8,
        heartedBy: [createdUsers[0]._id, createdUsers[1]._id],
        views: 45,
        tags: ['laptop', 'macbook', 'programming'],
        isBoosted: true,
        boostExpiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
      },
      {
        title: 'Engineering Mathematics Textbook',
        description: 'Higher Engineering Mathematics by B.S. Grewal. Latest edition with minimal highlighting. Perfect for engineering students.',
        category: 'Books',
        condition: 'Used',
        price: 800,
        originalPrice: 1500,
        images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500'],
        sellerId: createdUsers[3]._id,
        hostel: 'Girls',
        hearts: 2,
        heartedBy: [createdUsers[0]._id],
        views: 12,
        tags: ['textbook', 'mathematics', 'engineering']
      },
      {
        title: 'Makeup Palette Set - Urban Decay',
        description: 'Brand new Urban Decay eyeshadow palette, never opened. Received as gift but not my style. Original packaging intact.',
        category: 'Cosmetics',
        condition: 'New',
        price: 2500,
        originalPrice: 3200,
        images: ['https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=500'],
        sellerId: createdUsers[1]._id,
        hostel: 'Girls',
        hearts: 5,
        heartedBy: [createdUsers[0]._id, createdUsers[3]._id],
        views: 22,
        tags: ['makeup', 'cosmetics', 'urban-decay', 'new']
      },
      {
        title: 'Gaming Headset - HyperX',
        description: 'HyperX Cloud II gaming headset with surround sound. Excellent for gaming and online classes. Comfortable for long use.',
        category: 'Electronics',
        condition: 'Used',
        price: 3500,
        originalPrice: 5000,
        images: ['https://images.unsplash.com/photo-1599669454699-248893623440?w=500'],
        sellerId: createdUsers[0]._id,
        hostel: 'Boys',
        hearts: 4,
        heartedBy: [createdUsers[2]._id],
        views: 18,
        tags: ['gaming', 'headset', 'hyperx']
      },
      {
        title: 'Skincare Bundle - The Ordinary',
        description: 'Complete skincare routine from The Ordinary. Includes cleanser, serum, and moisturizer. All products unopened.',
        category: 'Cosmetics',
        condition: 'New',
        price: 4200,
        originalPrice: 5500,
        images: ['https://images.unsplash.com/photo-1556228578-dd6e0609b5e2?w=500'],
        sellerId: createdUsers[1]._id,
        hostel: 'Girls',
        hearts: 3,
        heartedBy: [createdUsers[3]._id],
        views: 25,
        tags: ['skincare', 'the-ordinary', 'bundle', 'new']
      },
      {
        title: 'Wireless Bluetooth Speaker',
        description: 'Portable JBL Bluetooth speaker with excellent sound quality. Great for hostel parties and study sessions.',
        category: 'Electronics',
        condition: 'Used',
        price: 2800,
        originalPrice: 4000,
        images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500'],
        sellerId: createdUsers[2]._id,
        hostel: 'Boys',
        hearts: 6,
        heartedBy: [createdUsers[0]._id, createdUsers[1]._id],
        views: 30,
        tags: ['speaker', 'bluetooth', 'jbl', 'wireless']
      },
      {
        title: 'Designer Handbag - Michael Kors',
        description: 'Authentic Michael Kors handbag in excellent condition. Perfect for college and formal occasions. Comes with dust bag.',
        category: 'Miscellaneous',
        condition: 'Used',
        price: 8500,
        originalPrice: 12000,
        images: ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500'],
        sellerId: createdUsers[1]._id,
        hostel: 'Girls',
        hearts: 4,
        heartedBy: [createdUsers[3]._id],
        views: 20,
        tags: ['handbag', 'michael-kors', 'designer', 'formal']
      }
    ];

    const createdItems = await Item.insertMany(sampleItems);
    console.log(`✅ Created ${createdItems.length} sample items`);

    // Update user hearted posts
    await User.findByIdAndUpdate(createdUsers[0]._id, {
      heartedPosts: [createdItems[1]._id, createdItems[2]._id, createdItems[4]._id, createdItems[6]._id]
    });

    await User.findByIdAndUpdate(createdUsers[1]._id, {
      heartedPosts: [createdItems[0]._id, createdItems[6]._id]
    });

    await User.findByIdAndUpdate(createdUsers[2]._id, {
      heartedPosts: [createdItems[0]._id, createdItems[4]._id]
    });

    await User.findByIdAndUpdate(createdUsers[3]._id, {
      heartedPosts: [createdItems[0]._id, createdItems[3]._id, createdItems[5]._id, createdItems[7]._id]
    });

    // Create sample transactions
    const sampleTransactions = [
      {
        buyerId: createdUsers[1]._id,
        sellerId: createdUsers[0]._id,
        itemId: createdItems[0]._id, // Denim Jacket
        amount: 1200,
        originalPrice: 2500,
        savings: 1300,
        status: 'completed',
        transactionType: 'purchase',
        pointsAwarded: 5,
        paymentMethod: 'upi',
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        buyerId: createdUsers[0]._id,
        sellerId: createdUsers[3]._id,
        itemId: createdItems[2]._id, // Math Book
        amount: 800,
        originalPrice: 1500,
        savings: 700,
        status: 'completed',
        transactionType: 'purchase',
        pointsAwarded: 5,
        paymentMethod: 'cash',
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      },
      {
        buyerId: createdUsers[2]._id,
        sellerId: createdUsers[1]._id,
        itemId: createdItems[3]._id, // Makeup Palette
        amount: 2500,
        originalPrice: 3200,
        status: 'pending',
        transactionType: 'purchase',
        pointsAwarded: 5,
        paymentMethod: 'upi'
      }
    ];

    const createdTransactions = await Transaction.insertMany(sampleTransactions);
    console.log(`✅ Created ${createdTransactions.length} sample transactions`);

    // Create sample chats
    const sampleChats = [
      {
        participants: [createdUsers[0]._id, createdUsers[2]._id],
        itemId: createdItems[1]._id, // MacBook
        messages: [
          {
            senderId: createdUsers[0]._id,
            message: "Hi! Is the MacBook still available?",
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            isRead: true
          },
          {
            senderId: createdUsers[2]._id,
            message: "Yes, it is! Are you interested?",
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000), // 1h 55m ago
            isRead: true
          },
          {
            senderId: createdUsers[0]._id,
            message: "Can we meet tomorrow to check it out?",
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
            isRead: false
          }
        ],
        lastMessage: {
          content: "Can we meet tomorrow to check it out?",
          senderId: createdUsers[0]._id,
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000)
        },
        lastActivity: new Date(Date.now() - 1 * 60 * 60 * 1000),
        unreadCount: new Map([
          [createdUsers[0]._id.toString(), 0],
          [createdUsers[2]._id.toString(), 1]
        ])
      },
      {
        participants: [createdUsers[1]._id, createdUsers[0]._id],
        itemId: createdItems[4]._id, // Gaming Headset
        messages: [
          {
            senderId: createdUsers[1]._id,
            message: "Hey! Interested in the gaming headset.",
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
            isRead: true
          },
          {
            senderId: createdUsers[0]._id,
            message: "Great! It's in perfect condition. When can we meet?",
            timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000), // 23 hours ago
            isRead: true
          }
        ],
        lastMessage: {
          content: "Great! It's in perfect condition. When can we meet?",
          senderId: createdUsers[0]._id,
          timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000)
        },
        lastActivity: new Date(Date.now() - 23 * 60 * 60 * 1000),
        unreadCount: new Map([
          [createdUsers[0]._id.toString(), 0],
          [createdUsers[1]._id.toString(), 0]
        ])
      }
    ];

    const createdChats = await Chat.insertMany(sampleChats);
    console.log(`✅ Created ${createdChats.length} sample chats`);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Sample Accounts Created:');
    console.log('1. Username: student123, Email: student@gmail.com, Password: password123');
    console.log('2. Username: collegegirl, Email: girl@college.edu, Password: password123');
    console.log('3. Username: techguy, Email: tech@student.ac.in, Password: password123');
    console.log('4. Username: bookworm, Email: books@library.edu, Password: password123');
    console.log('\n💡 You can now login with any of these accounts to test the application!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📴 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the seed function
seedData();
