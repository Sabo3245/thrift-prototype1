# Campus Thrift - Backend API

A modern, feature-rich backend API for the Campus Thrift marketplace application. Built with Node.js, Express, MongoDB, and Socket.io for real-time functionality.

## 🚀 Features

### Core Functionality
- **User Authentication & Authorization** - JWT-based auth with bcrypt password hashing
- **Item Management** - Full CRUD operations for marketplace items
- **Real-time Chat System** - Socket.io powered messaging between buyers/sellers
- **Transaction Management** - Complete transaction lifecycle with points system
- **File Upload Support** - Image upload with Cloudinary integration
- **Search & Filtering** - Advanced search with category, price, and location filters

### Advanced Features
- **Points System** - Reward users with points for transactions
- **Boost Posts** - Paid promotion system using points
- **Heart/Favorite System** - Save items to favorites
- **Money Saved Tracking** - Track savings from second-hand purchases
- **Real-time Notifications** - Live updates for messages, transactions, and item changes
- **Clothing Details Checklist** - Specialized fields for clothing condition assessment

### Real-time Features
- Live chat messaging
- Typing indicators
- Online/offline status
- Item view tracking
- Transaction notifications
- Price alerts
- Category subscriptions

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.io
- **Authentication**: JWT + bcrypt
- **File Upload**: Multer + Cloudinary
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate limiting

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Step 1: Clone and Install
```bash
# Clone the repository
git clone <your-repo-url>
cd campus-thrift-backend

# Install dependencies
npm install
```

### Step 2: Environment Configuration
```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your configuration
nano .env
```

### Step 3: Database Setup
```bash
# Start MongoDB (if running locally)
mongod

# Seed the database with sample data
npm run seed
```

### Step 4: Start the Server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3001` by default.

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/campus-thrift

# Server Configuration
NODE_ENV=development
PORT=3001

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Frontend Configuration
FRONTEND_URL=http://localhost:3000

# Cloudinary Configuration (Optional)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Required Configuration
- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `FRONTEND_URL`: Your frontend application URL for CORS

### Optional Configuration
- Cloudinary credentials for image upload
- Email/SMS service credentials for notifications

## 📚 API Documentation

### Base URL
```
http://localhost:3001/api
```

### Authentication Endpoints
```
POST /api/auth/register     - Register new user
POST /api/auth/login        - User login
GET  /api/auth/me          - Get current user profile
PUT  /api/auth/profile     - Update user profile
POST /api/auth/verify-phone - Verify phone number
POST /api/auth/logout      - User logout
```

### Item Endpoints
```
GET    /api/items           - Get all items (with filters)
GET    /api/items/:id       - Get specific item
POST   /api/items           - Create new item
PUT    /api/items/:id       - Update item (owner only)
DELETE /api/items/:id       - Delete item (owner only)
POST   /api/items/:id/heart - Heart/unheart item
POST   /api/items/:id/boost - Boost item (costs points)
GET    /api/items/user/:id  - Get user's items
```

### User Endpoints
```
GET /api/users/profile      - Get current user profile
GET /api/users/listings     - Get user's listings
GET /api/users/hearted      - Get hearted items
GET /api/users/transactions - Get transaction history
GET /api/users/savings      - Get savings summary
GET /api/users/points       - Get points information
GET /api/users/dashboard    - Get dashboard data
GET /api/users/:id/public   - Get public profile
```

### Chat Endpoints
```
GET    /api/chats           - Get all conversations
GET    /api/chats/:id       - Get specific conversation
POST   /api/chats           - Start new conversation
POST   /api/chats/:id/messages - Send message
PUT    /api/chats/:id/read  - Mark messages as read
DELETE /api/chats/:id       - Delete conversation
GET    /api/chats/unread/count - Get unread count
```

### Transaction Endpoints
```
POST /api/transactions           - Create transaction
GET  /api/transactions           - Get user transactions
GET  /api/transactions/:id       - Get specific transaction
PUT  /api/transactions/:id/complete - Complete transaction
PUT  /api/transactions/:id/cancel - Cancel transaction
POST /api/transactions/:id/rate  - Rate transaction
GET  /api/transactions/stats/summary - Get transaction stats
```

## 🔌 Socket.io Events

### Client to Server Events
```javascript
// Authentication
socket.emit('join_chat', chatId)
socket.emit('leave_chat', chatId)

// Messaging
socket.emit('send_message', { chatId, message, messageType })
socket.emit('typing_start', { chatId })
socket.emit('typing_stop', { chatId })

// Item interactions
socket.emit('view_item', { itemId })
socket.emit('item_updated', { itemId, updates })

// Subscriptions
socket.emit('subscribe_category', { category })
socket.emit('set_price_alert', { category, maxPrice })
socket.emit('join_hostel_room', { hostel })
```

### Server to Client Events
```javascript
// Messages
socket.on('new_message', (data))
socket.on('message_notification', (data))
socket.on('user_typing', (data))
socket.on('user_stopped_typing', (data))

// User status
socket.on('user_online', (data))
socket.on('user_offline', (data))
socket.on('active_users_count', (count))

// Transactions
socket.on('new_transaction', (data))
socket.on('transaction_completed', (data))
socket.on('transaction_cancelled', (data))

// Items
socket.on('new_item', (data))
socket.on('item_hearted', (data))
socket.on('item_boosted', (data))
socket.on('item_sold', (data))
socket.on('price_alert_triggered', (data))
```

## 🗃️ Database Schema

### Users Collection
```javascript
{
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  phone: String,
  isVerified: Boolean,
  profile: {
    hostel: String,
    comfortPreference: String,
    points: Number,
    totalTransactions: Number,
    moneySaved: Number
  },
  heartedPosts: [ObjectId],
  isActive: Boolean
}
```

### Items Collection
```javascript
{
  title: String,
  description: String,
  category: String,
  condition: String,
  price: Number,
  originalPrice: Number,
  images: [String],
  sellerId: ObjectId,
  hostel: String,
  isActive: Boolean,
  isBoosted: Boolean,
  boostExpiresAt: Date,
  hearts: Number,
  heartedBy: [ObjectId],
  clothingDetails: {
    quality: String,
    detailedCondition: String,
    age: String
  },
  views: Number
}
```

### Transactions Collection
```javascript
{
  buyerId: ObjectId,
  sellerId: ObjectId,
  itemId: ObjectId,
  amount: Number,
  originalPrice: Number,
  savings: Number,
  status: String,
  transactionType: String,
  pointsAwarded: Number,
  paymentMethod: String,
  completedAt: Date
}
```

### Chats Collection
```javascript
{
  participants: [ObjectId],
  itemId: ObjectId,
  messages: [{
    senderId: ObjectId,
    message: String,
    messageType: String,
    isRead: Boolean,
    timestamp: Date
  }],
  lastMessage: {
    content: String,
    senderId: ObjectId,
    timestamp: Date
  },
  unreadCount: Map
}
```

## 🧪 Sample Data

The application comes with pre-seeded sample data including:

- **4 Sample Users** with different profiles and points
- **8 Sample Items** across all categories
- **3 Sample Transactions** in various states
- **2 Sample Chat Conversations** with message history

### Sample Login Credentials
```
Username: student123     Email: student@gmail.com      Password: password123
Username: collegegirl    Email: girl@college.edu      Password: password123
Username: techguy        Email: tech@student.ac.in    Password: password123
Username: bookworm       Email: books@library.edu     Password: password123
```

## 🔧 Development Scripts

```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Seed database with sample data
npm run seed

# Run tests (if configured)
npm test

# Check for security vulnerabilities
npm audit
```

## 🔒 Security Features

- **JWT Authentication** with secure token generation
- **Password Hashing** using bcrypt with salt rounds
- **Rate Limiting** to prevent API abuse
- **CORS Protection** with configurable origins
- **Input Validation** using express-validator
- **Helmet Security** headers for enhanced protection
- **Data Sanitization** to prevent injection attacks

## 📊 Performance Features

- **Database Indexing** for optimized queries
- **Connection Pooling** for database efficiency
- **Compression Middleware** for response optimization
- **Pagination** for large dataset handling
- **Lean Queries** for reduced memory usage
- **Socket Connection Management** with cleanup

## 🚀 Deployment

### Local Development
1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure
4. Start MongoDB service
5. Seed database: `npm run seed`
6. Start server: `npm run dev`

### Production Deployment

#### Using PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start server.js --name "campus-thrift-api"

# Monitor the application
pm2 logs campus-thrift-api
pm2 monit
```

#### Using Docker
```bash
# Build Docker image
docker build -t campus-thrift-backend .

# Run container
docker run -p 3001:3001 --env-file .env campus-thrift-backend
```

#### Environment-specific Considerations
- Set `NODE_ENV=production`
- Use MongoDB Atlas for cloud database
- Configure Cloudinary for file uploads
- Set up proper logging and monitoring
- Enable HTTPS in production

## 🤝 API Response Format

### Success Response
```javascript
{
  "message": "Success message",
  "data": {
    // Response data
  },
  "pagination": { // If applicable
    "current": 1,
    "total": 10,
    "hasNext": true,
    "totalItems": 200
  }
}
```

### Error Response
```javascript
{
  "message": "Error message",
  "errors": [ // If validation errors
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Ensure MongoDB is running
   - Check connection string in `.env`
   - Verify network connectivity for Atlas

2. **JWT Token Issues**
   - Check JWT_SECRET is set
   - Verify token format in Authorization header
   - Ensure token hasn't expired

3. **Socket.io Connection Issues**
   - Verify CORS configuration
   - Check frontend URL matches FRONTEND_URL
   - Ensure proper authentication token

4. **File Upload Problems**
   - Configure Cloudinary credentials
   - Check file size limits
   - Verify allowed file types

### Debug Mode
Enable debug logging by setting:
```env
DEBUG=campus-thrift:*
NODE_ENV=development
```

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation above
- Review the API examples in the code

## 🔄 Version History

- **v1.0.0** - Initial release with core functionality
- **v1.1.0** - Added real-time chat and notifications
- **v1.2.0** - Implemented points system and boost features
- **v1.3.0** - Added clothing details checklist and enhanced search

---

Built with ❤️ for the Campus Thrift community
