#!/bin/bash

# Fix MongoDB Authentication and Connection
echo "=== MongoDB Connection Diagnostics and Fix ==="
echo ""

# Check if we're using the replica set with authentication
echo "1. Checking MongoDB replica set configuration..."
docker exec mongo-hr-primary mongosh --eval "rs.status()" 2>&1 | grep -E "ok|set" || echo "Cannot get replica set status"
echo ""

echo "2. Testing connection with authentication..."
# Test with the credentials from ecosystem.config.js
docker exec mongo-hr-primary mongosh "mongodb://hr_app_user:Hr2025Secure@localhost:27017/SM_nomu?authSource=SM_nomu" --eval "db.getName()" 2>&1 | grep -v "Warning" || echo "Auth test failed"
echo ""

echo "3. Checking if user exists in MongoDB..."
docker exec mongo-hr-primary mongosh --eval "use SM_nomu; db.getUsers()" 2>/dev/null | grep hr_app_user || echo "User hr_app_user not found"
echo ""

echo "4. If user doesn't exist, creating it..."
docker exec mongo-hr-primary mongosh << 'EOJS' 2>/dev/null
use SM_nomu
db.createUser({
  user: "hr_app_user",
  pwd: "Hr2025Secure",
  roles: [
    { role: "readWrite", db: "SM_nomu" },
    { role: "dbAdmin", db: "SM_nomu" }
  ]
})
EOJS

echo ""
echo "5. Updating PM2 configuration..."
cd /volume1/web/HR

# Update ecosystem.config.js to use the correct connection string
# First backup the current one
cp ecosystem.config.js ecosystem.config.js.backup

# Stop and delete the current instance
pm2 stop hr-backend 2>/dev/null
pm2 delete hr-backend 2>/dev/null

echo ""
echo "6. Starting backend with fixed configuration..."
# Start with explicit environment override
MONGODB_URL="mongodb://hr_app_user:Hr2025Secure@localhost:27018,localhost:27019,localhost:27020/SM_nomu?replicaSet=hrapp&authSource=SM_nomu" \
NODE_ENV=production \
FRONTEND_URL="https://hr.smpain.synology.me" \
pm2 start ecosystem.config.js --only hr-backend

echo ""
echo "7. Waiting for startup..."
sleep 5

echo ""
echo "8. Final status check..."
pm2 status hr-backend
echo ""

echo "9. Recent logs..."
pm2 logs hr-backend --lines 15 --nostream
echo ""

echo "=== Quick Test Commands ==="
echo "Test health: curl http://localhost:5455/api/health"
echo "Test CORS: curl -I https://hrbackend.smpain.synology.me/api/cors-test -H 'Origin: https://hr.smpain.synology.me'"
echo "Monitor logs: pm2 logs hr-backend --follow"