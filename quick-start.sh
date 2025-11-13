#!/bin/bash

# Coding Question Validator - Quick Start Script
# This script helps you quickly set up and run the system

set -e  # Exit on error

echo "========================================"
echo "Coding Question Validator - Quick Start"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm found: $(npm --version)${NC}"

# Check MongoDB
if ! command -v mongosh &> /dev/null; then
    echo -e "${YELLOW}⚠️  mongosh not found. Make sure MongoDB is installed${NC}"
else
    echo -e "${GREEN}✅ MongoDB client found${NC}"
fi

# Check Redis
if ! command -v redis-cli &> /dev/null; then
    echo -e "${YELLOW}⚠️  redis-cli not found. Make sure Redis is installed${NC}"
else
    echo -e "${GREEN}✅ Redis client found${NC}"
fi

echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Building TypeScript..."
npm run build

echo ""
echo "Creating required directories..."
mkdir -p logs failed_questions

echo ""
echo "Checking for .env file..."
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env file with your settings:${NC}"
    echo "   - Set MONGODB_URI"
    echo "   - Set ANTHROPIC_API_KEY"
    echo ""
    read -p "Press Enter after editing .env file..."
else
    echo -e "${GREEN}✅ .env file found${NC}"
fi

echo ""
echo "Testing connections..."

# Test Redis
if command -v redis-cli &> /dev/null; then
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Redis is running${NC}"
    else
        echo -e "${RED}❌ Redis is not running. Please start Redis:${NC}"
        echo "   redis-server"
        exit 1
    fi
fi

# Test MongoDB
if command -v mongosh &> /dev/null; then
    if mongosh --quiet --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ MongoDB is running${NC}"
    else
        echo -e "${RED}❌ MongoDB is not running. Please start MongoDB${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Setup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Start the consumer (in a new terminal):"
echo -e "   ${YELLOW}npm run consumer${NC}"
echo ""
echo "2. Run the scanner:"
echo -e "   ${YELLOW}npm run scanner${NC}"
echo ""
echo "3. Monitor logs:"
echo -e "   ${YELLOW}tail -f logs/combined.log${NC}"
echo ""
echo "For more information, see README.md and SETUP_GUIDE.md"
echo ""
