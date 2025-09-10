# Create environment configuration
env_config = """# Database Configuration
MONGODB_URI=mongodb://localhost:27017/campus-thrift
# For production, use MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/campus-thrift

# Server Configuration
NODE_ENV=development
PORT=3001

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Frontend Configuration
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# File Upload Configuration (Cloudinary)
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Email Configuration (Optional - for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# SMS Configuration (Optional - for OTP)
SMS_API_KEY=your-sms-api-key
SMS_SENDER_ID=CAMPUS

# Admin Configuration
ADMIN_EMAIL=admin@campus-thrift.com
ADMIN_PASSWORD=admin123

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload Limits
MAX_FILE_SIZE=5242880
MAX_FILES_PER_UPLOAD=5

# Points System Configuration
POINTS_PER_TRANSACTION=5
BOOST_COST_POINTS=25
BOOST_DURATION_DAYS=7

# Transaction Configuration
TRANSACTION_TIMEOUT_HOURS=24
AUTO_COMPLETE_AFTER_DAYS=7
"""

with open('campus-thrift-backend/.env.example', 'w') as f:
    f.write(env_config)

print("✓ Created .env.example file")