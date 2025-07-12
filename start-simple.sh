#!/bin/bash

echo "🚀 Leave Management V3 - MongoDB Simple Start"
echo "============================================="

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    pkill -f "node server.js" 2>/dev/null
    pkill -f "vite" 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check if MongoDB is running
echo "🔍 Checking MongoDB..."
if ss -tuln 2>/dev/null | grep -q 27017; then
    echo "✅ MongoDB is running on port 27017"
elif netstat -an 2>/dev/null | grep -q 27017; then
    echo "✅ MongoDB is running on port 27017"
else
    echo "⚠️  MongoDB may not be running on port 27017"
    echo "   Please start MongoDB first:"
    echo "   Windows: net start MongoDB"
    echo "   Linux:   sudo systemctl start mongod"
    echo "   macOS:   brew services start mongodb/brew/mongodb-community"
    echo ""
fi

# Get current script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Install basic dependencies if missing
if [ ! -f "$SCRIPT_DIR/backend/node_modules/mongodb/package.json" ]; then
    echo "📦 Installing backend dependencies..."
    cd "$SCRIPT_DIR/backend" && npm install
fi

echo ""

echo "🔧 Starting backend server..."
cd "$SCRIPT_DIR/backend" && node server.js &

# Wait for backend to start
sleep 3

echo "🔧 Starting frontend server..."
# Change to frontend directory and start vite
cd "$SCRIPT_DIR/frontend" && npx vite &

echo ""
echo "✅ Servers started!"
echo "==================="
echo "🌐 Frontend: http://localhost:3000"
echo "🔗 Backend: http://localhost:5444/api"
echo "🔑 Login: admin / admin"
echo ""
echo "📊 Database: SM_nomu"
echo "🗄️  MongoDB: localhost:27017"
echo ""
echo "Press Ctrl+C to stop servers"
echo ""

# Wait for user to stop
wait