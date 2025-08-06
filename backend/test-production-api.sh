#!/bin/bash

API_URL="https://hr-backend-429401177957.asia-northeast3.run.app"

echo "🚀 Testing Production API after deployment..."
echo "API URL: $API_URL"
echo ""

echo "Step 1: Login to get JWT token..."
LOGIN_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' \
  "$API_URL/api/auth/login")

echo "Login response received"

# Extract token from response
TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "None" ]; then
    echo "❌ Failed to extract token from login response"
    echo "Login response: $LOGIN_RESPONSE" | head -5
    exit 1
fi

echo "✅ Token extracted successfully: ${TOKEN:0:50}..."
echo ""

echo "Step 2: Test Users API with JWT token..."
USERS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/users")
if echo "$USERS_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Users API: SUCCESS"
    USER_COUNT=$(echo "$USERS_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('data', [])))" 2>/dev/null)
    echo "   Users found: $USER_COUNT"
else
    echo "❌ Users API: FAILED"
    echo "   Response: $USERS_RESPONSE" | head -100
fi

echo ""
echo "Step 3: Test Leave Pending API with JWT token..."
LEAVE_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/leave/pending")
if echo "$LEAVE_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Leave Pending API: SUCCESS"
    PENDING_COUNT=$(echo "$LEAVE_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('data', [])))" 2>/dev/null)
    echo "   Pending requests found: $PENDING_COUNT"
else
    echo "❌ Leave Pending API: FAILED"
    echo "   Response: $LEAVE_RESPONSE" | head -100
fi

echo ""
echo "Step 4: Test without token (should get 401)..."
NO_TOKEN_RESPONSE=$(curl -s "$API_URL/api/users")
if echo "$NO_TOKEN_RESPONSE" | grep -q -E "(401|Unauthorized|Authentication required)"; then
    echo "✅ No Token Test: SUCCESS (401 as expected)"
else
    echo "❌ No Token Test: FAILED (should return 401)"
    echo "   Response: $NO_TOKEN_RESPONSE"
fi

echo ""
echo "🎯 Production API Test Summary:"
echo "================================"
if echo "$USERS_RESPONSE" | grep -q '"success":true' && \
   echo "$LEAVE_RESPONSE" | grep -q '"success":true' && \
   echo "$NO_TOKEN_RESPONSE" | grep -q -E "(401|Unauthorized|Authentication required)"; then
    echo "🎉 ALL TESTS PASSED! Authentication fix is working in production!"
    echo ""
    echo "✅ Users API: Working"
    echo "✅ Leave Pending API: Working" 
    echo "✅ JWT Authentication: Working"
    echo "✅ Unauthorized Access Protection: Working"
else
    echo "⚠️ Some tests failed. Check the details above."
fi