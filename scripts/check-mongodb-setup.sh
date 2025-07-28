#!/bin/bash

# Check MongoDB Setup and Connection
echo "=== MongoDB Setup Checker ==="
echo ""

# Check if Docker containers are running
echo "1. Checking Docker MongoDB containers..."
docker ps | grep mongo || echo "No MongoDB Docker containers found"
echo ""

# Check all Docker containers (including stopped)
echo "2. All MongoDB containers (including stopped)..."
docker ps -a | grep mongo || echo "No MongoDB containers exist"
echo ""

# Check if MongoDB is running locally
echo "3. Checking local MongoDB instances..."
ps aux | grep mongod | grep -v grep || echo "No local MongoDB process found"
echo ""

# Check network connectivity to MongoDB ports
echo "4. Checking MongoDB ports..."
netstat -tln | grep -E "27017|27018|27019|27020" || echo "No MongoDB ports are listening"
echo ""

# Test different connection methods
echo "5. Testing MongoDB connections..."

echo "   a. Testing Docker hostname (mongo-hr-primary)..."
timeout 5 mongo mongodb://mongo-hr-primary:27017 --eval "db.version()" 2>/dev/null && echo "SUCCESS" || echo "FAILED"

echo "   b. Testing localhost single instance..."
timeout 5 mongo mongodb://localhost:27017 --eval "db.version()" 2>/dev/null && echo "SUCCESS" || echo "FAILED"

echo "   c. Testing replica set with auth..."
timeout 5 mongo "mongodb://hr_app_user:Hr2025Secure@localhost:27018,localhost:27019,localhost:27020/SM_nomu?replicaSet=hrapp&authSource=SM_nomu" --eval "db.version()" 2>/dev/null && echo "SUCCESS" || echo "FAILED"

echo ""
echo "=== Analysis ==="
echo ""
echo "Based on the results above:"
echo "- If Docker containers are not running, start them with: docker-compose up -d"
echo "- If using local MongoDB, ensure it's running on the correct ports"
echo "- The backend is looking for 'mongo-hr-primary' which suggests Docker setup"
echo ""
echo "To fix the immediate issue, you can either:"
echo "1. Start the MongoDB Docker containers"
echo "2. Update the backend to use the correct MongoDB connection string"