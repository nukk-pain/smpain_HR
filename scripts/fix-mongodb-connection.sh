#!/bin/bash

# Fix MongoDB Connection for HR Backend
echo "=== Fixing MongoDB Connection Issue ==="
echo ""

# Stop the errored backend
echo "1. Stopping errored backend..."
pm2 stop hr-backend
pm2 delete hr-backend
echo ""

# Check current PM2 environment
echo "2. Checking PM2 saved config..."
pm2 show hr-backend 2>/dev/null || echo "No saved config found"
echo ""

# Update and restart with correct config
echo "3. Starting backend with correct MongoDB URL..."
cd /volume1/web/HR

# Start using ecosystem file
pm2 start ecosystem.config.js --only hr-backend
echo ""

# Verify environment variables
echo "4. Verifying environment variables..."
pm2 env hr-backend | grep -E "MONGODB_URL|NODE_ENV|PORT"
echo ""

# Check logs
echo "5. Checking startup logs..."
pm2 logs hr-backend --lines 20 --nostream
echo ""

echo "6. Testing backend health..."
sleep 3  # Give backend time to start
curl -s http://localhost:5455/api/health | jq . || echo "Backend still not responding"
echo ""

echo "=== Fix complete ==="
echo ""
echo "If the backend is still failing to connect to MongoDB:"
echo "1. Check if MongoDB replica set is running:"
echo "   docker ps | grep mongo"
echo ""
echo "2. Test MongoDB connection directly:"
echo "   mongo 'mongodb://hr_app_user:Hr2025Secure@localhost:27018,localhost:27019,localhost:27020/SM_nomu?replicaSet=hrapp&authSource=SM_nomu'"
echo ""
echo "3. If using Docker MongoDB, the connection string might need to use container names instead of localhost"