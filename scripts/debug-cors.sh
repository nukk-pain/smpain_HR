#!/bin/bash

# CORS Debugging Script for HR System
# Run this on the Synology server to diagnose CORS issues

echo "=== CORS Debugging Script ==="
echo "Date: $(date)"
echo ""

# Check if backend is running
echo "1. Checking PM2 status..."
pm2 status
echo ""

# Test backend health directly
echo "2. Testing backend health endpoint (localhost)..."
curl -s http://localhost:5455/api/health | jq . || echo "Failed to connect to backend"
echo ""

# Test backend through reverse proxy
echo "3. Testing backend through reverse proxy..."
curl -s https://hrbackend.smpain.synology.me/api/health | jq . || echo "Failed to connect through proxy"
echo ""

# Test CORS headers
echo "4. Testing CORS headers for preflight request..."
curl -I -X OPTIONS https://hrbackend.smpain.synology.me/api/auth/login \
  -H "Origin: https://hr.smpain.synology.me" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" 2>/dev/null | grep -i "access-control"
echo ""

# Test CORS test endpoint
echo "5. Testing dedicated CORS endpoint..."
curl -I https://hrbackend.smpain.synology.me/api/cors-test \
  -H "Origin: https://hr.smpain.synology.me" 2>/dev/null | grep -i "access-control"
echo ""

# Check nginx error logs
echo "6. Recent nginx errors (if accessible)..."
if [ -f /var/log/nginx/error.log ]; then
    tail -n 20 /var/log/nginx/error.log | grep hrbackend
else
    echo "Nginx error log not accessible"
fi
echo ""

# Check PM2 logs
echo "7. Recent PM2 backend logs..."
pm2 logs hr-backend --lines 10 --nostream
echo ""

echo "=== Debugging complete ==="
echo ""
echo "If CORS headers are missing in tests 4 and 5, the issue is likely:"
echo "1. Backend not running (check test 1)"
echo "2. Reverse proxy misconfiguration (check test 3)"
echo "3. Nginx stripping headers (need to modify reverse proxy settings)"