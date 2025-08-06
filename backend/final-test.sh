#!/bin/bash

echo "Step 1: Login to get real JWT token..."
LOGIN_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' \
  http://localhost:5455/api/auth/login)

echo "Login response received"

# Extract token from response (assuming it's in .token field)
TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "None" ]; then
    echo "Failed to extract token from login response"
    echo "Login response: $LOGIN_RESPONSE" | head -5
    exit 1
fi

echo "Token extracted successfully: ${TOKEN:0:50}..."
echo ""

echo "Step 2: Test Users API with real token..."
USERS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5455/api/users)
echo "Users API response: $USERS_RESPONSE" | head -200

echo ""
echo "Step 3: Test Leave Pending API with real token..."
LEAVE_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5455/api/leave/pending)
echo "Leave API response: $LEAVE_RESPONSE" | head -200

echo ""
echo "Test completed!"