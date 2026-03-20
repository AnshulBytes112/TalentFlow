#!/bin/bash

echo "🚀 Setting up Job Portal Monorepo..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✅ npm version: $(npm -v)"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Copy backend environment file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "📝 Created backend .env file from .env.example"
    echo "⚠️  Please update the .env file with your actual configuration"
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

# Copy frontend environment file
if [ ! -f .env.local ]; then
    cp .env.example .env.local
    echo "📝 Created frontend .env.local file from .env.example"
    echo "⚠️  Please update the .env.local file with your actual configuration"
fi

# Go back to root
cd ..

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update backend/.env with your actual configuration"
echo "2. Update frontend/.env.local with your actual configuration"
echo "3. Make sure MongoDB is running on localhost:270270"
echo "4. Run 'npm run dev' to start both frontend and backend"
echo ""
echo "🌐 Access points:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:5000"
echo "- API Documentation: http://localhost:5000/api-docs"
echo ""
echo "📚 Useful commands:"
echo "- npm run dev          - Start both frontend and backend"
echo "- npm run dev:backend  - Start only backend"
echo "- npm run dev:frontend - Start only frontend"
echo "- npm run build        - Build both for production"
echo "- npm run start        - Start both in production mode"
