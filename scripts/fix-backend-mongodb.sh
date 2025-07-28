#!/bin/bash

# Fix Backend MongoDB Connection
echo "=== Fixing Backend MongoDB Connection ==="
echo ""

# First, let's test the actual MongoDB connections
echo "1. Testing MongoDB connections with Docker..."

# Test direct connection to primary
echo "   Testing mongo-hr-primary via Docker network..."
docker exec mongo-hr-primary mongosh --eval "db.version()" 2>/dev/null && echo "Docker connection works" || echo "Docker connection failed"

# Test replica set connection
echo "   Testing replica set connection..."
docker exec mongo-hr-primary mongosh "mongodb://localhost:27017/?replicaSet=hrapp" --eval "rs.status().ok" 2>/dev/null && echo "Replica set works" || echo "Replica set failed"

echo ""
echo "2. Checking if we need to use Docker network or host network..."

# Option 1: Update backend to use localhost with mapped ports
echo "   The containers are mapped to host ports, so we should use localhost"
echo ""

echo "3. Stopping and removing the errored backend..."
pm2 stop hr-backend
pm2 delete hr-backend
echo ""

echo "4. Creating a production environment file..."
cat > /volume1/web/HR/backend/.env.production << 'EOF'
# HR System Environment Variables - Production
NODE_ENV=production
PORT=5455

# MongoDB Settings (Production - Docker Replica Set)
# Using localhost because Docker ports are mapped to host
MONGODB_URL=mongodb://localhost:27018,localhost:27019,localhost:27020/SM_nomu?replicaSet=hrapp
DB_NAME=SM_nomu

# Session Configuration
SESSION_SECRET=hr-synology-secret-2025

# Frontend URL
FRONTEND_URL=https://hr.smpain.synology.me
EOF

echo "Created .env.production file"
echo ""

echo "5. Starting backend with updated configuration..."
cd /volume1/web/HR

# Export environment to ensure it's used
export NODE_ENV=production
export MONGODB_URL="mongodb://localhost:27018,localhost:27019,localhost:27020/SM_nomu?replicaSet=hrapp"

# Start using ecosystem file
pm2 start ecosystem.config.js --only hr-backend
echo ""

echo "6. Waiting for backend to start..."
sleep 5

echo "7. Checking backend status..."
pm2 status hr-backend
echo ""

echo "8. Checking backend logs..."
pm2 logs hr-backend --lines 20 --nostream
echo ""

echo "9. Testing backend health..."
curl -s http://localhost:5455/api/health | jq . || echo "Backend still not responding"
echo ""

echo "10. Testing CORS endpoint..."
curl -I http://localhost:5455/api/cors-test -H "Origin: https://hr.smpain.synology.me" 2>/dev/null | grep -i access-control
echo ""

echo "=== Fix Status ==="
echo ""
echo "If the backend is still failing:"
echo "1. Check if authentication is needed for MongoDB"
echo "2. Try connecting without replica set: mongodb://localhost:27018/SM_nomu"
echo "3. Check Docker network settings"
echo ""
echo "To monitor: pm2 logs hr-backend --follow"