#!/bin/bash

# Test script for modular monitoring service
echo "Testing server with modular monitoring service enabled..."

# Set environment variable and start server
export USE_MODULAR_ERROR_SERVICE=true
export PORT=3001

# Start server with timeout
timeout 10s node server.js &
PID=$!

# Wait for server to start
sleep 3

# Test basic endpoints
echo ""
echo "Testing server endpoints..."

# Health check
curl -s http://localhost:3001/health || echo "Health check failed"

echo ""
echo "Server test completed. Stopping server..."

# Kill server if still running
kill $PID 2>/dev/null

echo "Done!"