#!/bin/bash

###############################################################################
# AutoCam Startup Script
#
# This script starts all services needed to run AutoCam:
# 1. Redis (job queue)
# 2. Next.js frontend (port 3000)
# 3. AI Worker API (port 8001)
# 4. AI Worker Queue Processor
#
# Usage:
#   chmod +x start.sh
#   ./start.sh
###############################################################################

set -e  # Exit on error

echo "🚀 Starting AutoCam..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

###############################################################################
# Check Prerequisites
###############################################################################

echo -e "${BLUE}📋 Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python is not installed${NC}"
    echo "Please install Python 3.9+ from https://python.org/"
    exit 1
fi
echo -e "${GREEN}✓ Python $(python3 --version)${NC}"

# Check Redis
if ! command -v redis-server &> /dev/null; then
    echo -e "${YELLOW}⚠️  Redis is not installed${NC}"
    echo "Please install Redis from https://redis.io/"
    echo "Or run: brew install redis (macOS) or apt-get install redis (Ubuntu)"
    exit 1
fi
echo -e "${GREEN}✓ Redis installed${NC}"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL is not installed${NC}"
    echo "Please install PostgreSQL from https://postgresql.org/"
    exit 1
fi
echo -e "${GREEN}✓ PostgreSQL installed${NC}"

echo ""

###############################################################################
# Check Environment Variables
###############################################################################

echo -e "${BLUE}🔧 Checking environment variables...${NC}"

if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo "Copying .env.example to .env..."
    cp .env.example .env
    echo -e "${RED}❌ Please edit .env and fill in your configuration${NC}"
    exit 1
fi
echo -e "${GREEN}✓ .env file exists${NC}"

if [ ! -f ai-worker/.env ]; then
    echo -e "${YELLOW}⚠️  ai-worker/.env file not found${NC}"
    echo "Copying ai-worker/.env.example to ai-worker/.env..."
    cp ai-worker/.env.example ai-worker/.env
    echo -e "${RED}❌ Please edit ai-worker/.env and fill in your configuration${NC}"
    exit 1
fi
echo -e "${GREEN}✓ ai-worker/.env file exists${NC}"

echo ""

###############################################################################
# Install Dependencies
###############################################################################

echo -e "${BLUE}📦 Installing dependencies...${NC}"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
else
    echo -e "${GREEN}✓ Node.js dependencies already installed${NC}"
fi

# Check if Python dependencies are installed
if ! python3 -c "import fastapi" &> /dev/null; then
    echo "Installing Python dependencies..."
    cd ai-worker
    pip3 install -r requirements.txt
    cd ..
else
    echo -e "${GREEN}✓ Python dependencies already installed${NC}"
fi

echo ""

###############################################################################
# Setup Database
###############################################################################

echo -e "${BLUE}🗄️  Setting up database...${NC}"

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Check if database needs migration
echo "Checking database migrations..."
if ! npx prisma migrate status &> /dev/null; then
    echo "Running database migrations..."
    npx prisma migrate dev --name init
else
    echo -e "${GREEN}✓ Database is up to date${NC}"
fi

echo ""

###############################################################################
# Start Services
###############################################################################

echo -e "${BLUE}🎬 Starting services...${NC}"
echo ""

# Create logs directory
mkdir -p logs

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping all services...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Start Redis
echo -e "${GREEN}Starting Redis...${NC}"
redis-server --daemonize yes --logfile logs/redis.log
sleep 2

# Check if Redis is running
if redis-cli ping &> /dev/null; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${RED}❌ Failed to start Redis${NC}"
    exit 1
fi

# Start Next.js frontend
echo -e "${GREEN}Starting Next.js frontend (port 3000)...${NC}"
npm run dev > logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
sleep 5

# Start AI Worker API
echo -e "${GREEN}Starting AI Worker API (port 8001)...${NC}"
cd ai-worker
python3 main.py > ../logs/ai-worker-api.log 2>&1 &
AI_API_PID=$!
echo "AI Worker API PID: $AI_API_PID"
cd ..

# Wait for AI Worker API to start
sleep 3

# Start AI Worker Queue Processor
echo -e "${GREEN}Starting AI Worker Queue Processor...${NC}"
cd ai-worker
python3 worker.py > ../logs/ai-worker-queue.log 2>&1 &
AI_QUEUE_PID=$!
echo "AI Worker Queue PID: $AI_QUEUE_PID"
cd ..

echo ""
echo -e "${GREEN}✅ All services started successfully!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}📍 Service URLs:${NC}"
echo ""
echo -e "  Frontend:        ${GREEN}http://localhost:3000${NC}"
echo -e "  AI Worker API:   ${GREEN}http://localhost:8001${NC}"
echo -e "  Prisma Studio:   ${GREEN}npx prisma studio${NC} (run in new terminal)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}📝 Logs:${NC}"
echo ""
echo "  Frontend:        logs/frontend.log"
echo "  AI Worker API:   logs/ai-worker-api.log"
echo "  AI Worker Queue: logs/ai-worker-queue.log"
echo "  Redis:           logs/redis.log"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for all background jobs
wait

