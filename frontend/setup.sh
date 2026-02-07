#!/bin/bash

# NexusCare Frontend Setup Script
# This script helps you get started quickly

set -e  # Exit on error

echo "🚀 NexusCare Frontend Setup"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "⚠️  Node.js version is $NODE_VERSION. Version 20+ is recommended."
fi

echo "✅ Node.js $(node -v) detected"
echo ""

PACKAGE_MANAGER="npm"

echo ""
echo "📥 Installing dependencies..."
echo "   This may take a few minutes..."
echo ""

npm install

echo ""
echo "✅ Dependencies installed successfully!"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local not found!"
    echo ""
    echo "Creating .env.local with default values..."
    cat > .env.local << EOF
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=NexusCare

# Environment
NEXT_PUBLIC_ENV=development

# Feature Flags (optional)
NEXT_PUBLIC_ENABLE_MSW=false
EOF
    echo "✅ .env.local created"
else
    echo "✅ .env.local exists"
fi

echo ""
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Make sure your Django backend is running:"
echo "   cd ../backend"
echo "   python manage.py runserver"
echo ""
echo "2. Start the development server:"
echo "   $PACKAGE_MANAGER dev"
echo ""
echo "3. Open your browser:"
echo "   http://localhost:3000"
echo ""
echo "4. Login with your Django credentials"
echo ""
echo "================================"
echo ""
echo "📚 Useful commands:"
echo "   $PACKAGE_MANAGER dev          # Start dev server"
echo "   $PACKAGE_MANAGER build        # Build for production"
echo "   $PACKAGE_MANAGER test         # Run unit tests"
echo "   $PACKAGE_MANAGER test:e2e     # Run E2E tests"
echo "   $PACKAGE_MANAGER lint         # Lint code"
echo "   $PACKAGE_MANAGER typecheck    # Check types"
echo ""
echo "📖 Documentation:"
echo "   README.md         # Full documentation"
echo "   ARCHITECTURE.md   # Architecture decisions"
echo "   FILE_TREE.md      # Complete file structure"
echo ""
echo "🎉 Happy coding!"
