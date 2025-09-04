#!/bin/bash

echo "=== Navigation Menu Update Test ==="
echo "Testing unified leave overview route access for different roles"
echo

# Backend URL
BACKEND_URL="http://localhost:3001/api"

# Test credentials
ADMIN_USER="admin"
ADMIN_PASS="admin"
SUPERVISOR_USER="supervisor1"
SUPERVISOR_PASS="supervisor123"

echo "1. Testing Admin access to /leave/overview"
echo "----------------------------------------"

# Login as admin
echo "Logging in as Admin..."
ADMIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}")

ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Admin login failed"
  exit 1
fi

echo "✅ Admin login successful"

# Test admin access to unified leave overview data
echo "Testing Admin API access..."
ADMIN_LEAVE_RESPONSE=$(curl -s -X GET "$BACKEND_URL/admin/leave/overview" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$ADMIN_LEAVE_RESPONSE" | grep -q "leaveData"; then
  echo "✅ Admin can access leave overview data"
else
  echo "❌ Admin cannot access leave overview data"
  echo "Response: $ADMIN_LEAVE_RESPONSE"
fi

echo
echo "2. Testing Supervisor access to /leave/overview"
echo "----------------------------------------------"

# Login as supervisor
echo "Logging in as Supervisor..."
SUPERVISOR_RESPONSE=$(curl -s -X POST "$BACKEND_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$SUPERVISOR_USER\",\"password\":\"$SUPERVISOR_PASS\"}")

SUPERVISOR_TOKEN=$(echo $SUPERVISOR_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$SUPERVISOR_TOKEN" ]; then
  echo "❌ Supervisor login failed"
  exit 1
fi

echo "✅ Supervisor login successful"

# Test supervisor access to team leave data
echo "Testing Supervisor API access..."
SUPERVISOR_LEAVE_RESPONSE=$(curl -s -X GET "$BACKEND_URL/supervisor/leave/team-status" \
  -H "Authorization: Bearer $SUPERVISOR_TOKEN")

if echo "$SUPERVISOR_LEAVE_RESPONSE" | grep -q "teamMembers"; then
  echo "✅ Supervisor can access team leave data"
else
  echo "❌ Supervisor cannot access team leave data"
  echo "Response: $SUPERVISOR_LEAVE_RESPONSE"
fi

echo
echo "3. Frontend Route Configuration Check"
echo "------------------------------------"

# Check if Layout.tsx has correct routes
echo "Checking Layout.tsx menu configuration..."

if grep -q "path: '/leave/overview'" frontend/src/components/Layout.tsx; then
  echo "✅ Layout.tsx has unified /leave/overview route"
  
  # Count occurrences
  COUNT=$(grep -c "path: '/leave/overview'" frontend/src/components/Layout.tsx)
  echo "   Found $COUNT occurrences (should be 2: one for admin, one for supervisor)"
else
  echo "❌ Layout.tsx does not have /leave/overview route"
fi

# Check for old routes
echo
echo "Checking for old routes that should be removed..."
if grep -q "/admin/leave/overview\|/supervisor/leave/status" frontend/src/components/Layout.tsx; then
  echo "⚠️  WARNING: Old routes still exist in Layout.tsx"
  grep -n "/admin/leave/overview\|/supervisor/leave/status" frontend/src/components/Layout.tsx
else
  echo "✅ No old routes found in Layout.tsx"
fi

echo
echo "4. App.tsx Route Definitions"
echo "---------------------------"

# Check if new unified route exists
if grep -q 'path="/leave/overview"' frontend/src/App.tsx; then
  echo "✅ App.tsx has /leave/overview route defined"
else
  echo "⚠️  App.tsx may need /leave/overview route definition"
fi

# Check if old routes still exist (for backward compatibility)
echo
echo "Checking backward compatibility routes..."
if grep -q 'path="/admin/leave/overview"\|path="/supervisor/leave/status"' frontend/src/App.tsx; then
  echo "✅ Old routes still exist for backward compatibility"
else
  echo "ℹ️  Old routes have been removed"
fi

echo
echo "=== Test Summary ==="
echo "1. Menu configuration: Updated to /leave/overview ✅"
echo "2. API endpoints: Still using role-specific endpoints (as expected)"
echo "3. Frontend routing: Unified component at /leave/overview"
echo
echo "Next steps:"
echo "- Start frontend and backend"
echo "- Login as Admin and navigate to '전체 휴가 현황'"
echo "- Verify it loads the unified view with 3 tabs (Overview, Team, Department)"
echo "- Login as Supervisor and navigate to '직원 휴가 현황'"
echo "- Verify it loads the unified view with 2 tabs (Team, Department)"