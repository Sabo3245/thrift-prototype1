#!/bin/bash

# Campus Thrift Backend Setup Script
# This script automates the initial setup process

echo "🚀 Campus Thrift Backend Setup"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Node.js is installed
check_node() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_status "Node.js is installed: $NODE_VERSION"

        # Check if version is 14 or higher
        NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR_VERSION" -lt 14 ]; then
            print_error "Node.js version 14 or higher is required. Current version: $NODE_VERSION"
            exit 1
        fi
    else
        print_error "Node.js is not installed. Please install Node.js 14 or higher."
        exit 1
    fi
}

# Check if npm is installed
check_npm() {
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_status "npm is installed: $NPM_VERSION"
    else
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
}

# Check if MongoDB is installed
check_mongodb() {
    if command -v mongod &> /dev/null; then
        MONGO_VERSION=$(mongod --version | head -n1)
        print_status "MongoDB is installed: $MONGO_VERSION"
    else
        print_warning "MongoDB is not installed locally. You can use MongoDB Atlas instead."
        print_info "Visit https://cloud.mongodb.com to create a free cluster"
    fi
}

# Install dependencies
install_dependencies() {
    print_info "Installing Node.js dependencies..."
    if npm install; then
        print_status "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
}

# Setup environment file
setup_environment() {
    if [ ! -f .env ]; then
        print_info "Creating environment configuration file..."
        cp .env.example .env
        print_status "Created .env file from template"

        print_warning "Please edit the .env file with your configuration:"
        print_info "1. Set MONGODB_URI to your database connection string"
        print_info "2. Set JWT_SECRET to a secure random string"
        print_info "3. Configure Cloudinary credentials (optional)"
        print_info "4. Set FRONTEND_URL to your frontend application URL"

        echo ""
        read -p "Press Enter to continue after editing .env file..."
    else
        print_status ".env file already exists"
    fi
}

# Start MongoDB (if installed locally)
start_mongodb() {
    if command -v mongod &> /dev/null; then
        print_info "Starting MongoDB service..."

        # Check if MongoDB is already running
        if pgrep mongod > /dev/null; then
            print_status "MongoDB is already running"
        else
            # Try to start MongoDB
            if mongod --fork --logpath /var/log/mongodb.log --dbpath /data/db 2>/dev/null; then
                print_status "MongoDB started successfully"
            else
                print_warning "Could not start MongoDB automatically"
                print_info "Please start MongoDB manually: sudo systemctl start mongod"
                print_info "Or use MongoDB Atlas for cloud database"
            fi
        fi
    fi
}

# Seed database
seed_database() {
    print_info "Seeding database with sample data..."

    read -p "Do you want to seed the database with sample data? (y/n): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if node seed.js; then
            print_status "Database seeded successfully"
            echo ""
            print_info "Sample login credentials created:"
            echo "Username: student123     Email: student@gmail.com      Password: password123"
            echo "Username: collegegirl    Email: girl@college.edu      Password: password123"
            echo "Username: techguy        Email: tech@student.ac.in    Password: password123"
            echo "Username: bookworm       Email: books@library.edu     Password: password123"
        else
            print_error "Failed to seed database"
            print_warning "Make sure MongoDB is running and .env is configured correctly"
        fi
    else
        print_info "Skipping database seeding"
    fi
}

# Test server startup
test_server() {
    print_info "Testing server startup..."

    # Start server in background
    npm run dev &
    SERVER_PID=$!

    # Wait a few seconds
    sleep 5

    # Test if server is responding
    if curl -f http://localhost:3001/api/health &> /dev/null; then
        print_status "Server is running successfully!"
        print_info "API available at: http://localhost:3001/api"
        print_info "Health check: http://localhost:3001/api/health"
    else
        print_error "Server failed to start properly"
    fi

    # Stop the test server
    kill $SERVER_PID 2>/dev/null
}

# Main setup process
main() {
    echo "Starting setup process..."
    echo ""

    # Check prerequisites
    check_node
    check_npm
    check_mongodb

    echo ""

    # Setup process
    install_dependencies
    setup_environment
    start_mongodb

    echo ""

    # Optional steps
    seed_database

    echo ""

    # Test server
    read -p "Do you want to test the server startup? (y/n): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        test_server
    fi

    echo ""
    print_status "Setup completed!"
    echo ""
    print_info "Next steps:"
    echo "1. Make sure .env file is configured correctly"
    echo "2. Start the development server: npm run dev"
    echo "3. The API will be available at http://localhost:3001/api"
    echo "4. Use the sample credentials above to test the application"
    echo ""
    print_info "For production deployment, see the README.md file"

    # Offer to start the server
    echo ""
    read -p "Do you want to start the development server now? (y/n): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Starting development server..."
        npm run dev
    else
        print_info "You can start the server later with: npm run dev"
    fi
}

# Run main function
main

echo ""
print_status "Thank you for using Campus Thrift! 🎉"
