#!/bin/bash

# Simple MongoDB Connection Test
echo "=== Simple MongoDB Connection Test ==="
echo ""

# Test different connection methods using mongosh from Docker
echo "1. Testing connection through Docker container..."
docker exec mongo-hr-primary mongosh --eval "db.version()" 2>&1 | grep -E "^[0-9]" && echo "✓ Basic connection works" || echo "✗ Basic connection failed"
echo ""

echo "2. Testing replica set status..."
docker exec mongo-hr-primary mongosh --eval "rs.status().ok" 2>&1 | grep "1" && echo "✓ Replica set is healthy" || echo "✗ Replica set has issues"
echo ""

echo "3. Testing authentication..."
docker exec mongo-hr-primary mongosh "mongodb://hr_app_user:Hr2025Secure@localhost:27017/SM_nomu?authSource=SM_nomu" --eval "db.getName()" 2>&1 | grep "SM_nomu" && echo "✓ Authentication works" || echo "✗ Authentication failed"
echo ""

echo "4. Creating/verifying user..."
docker exec mongo-hr-primary mongosh --eval "
use SM_nomu
db.createUser({
  user: 'hr_app_user',
  pwd: 'Hr2025Secure',
  roles: [
    { role: 'readWrite', db: 'SM_nomu' },
    { role: 'dbAdmin', db: 'SM_nomu' }
  ]
})
" 2>&1 | grep -E "already exists|successfully added" && echo "✓ User exists or created" || echo "✗ User creation issue"
echo ""

echo "5. Let's run the backend directly to see the error..."
cd /volume1/web/HR/backend

# First, check if npm packages are installed
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

# Try to start the backend with explicit environment
echo ""
echo "Starting backend with production environment..."
NODE_ENV=production node server.js 2>&1 | head -30
echo ""

echo "=== Diagnosis Complete ==="
echo ""
echo "Based on the output above:"
echo "- If authentication failed, the user needs to be created"
echo "- If the backend shows 'mongo-hr-primary' error, it's not reading the env file"
echo "- Check the actual error message from the direct run"