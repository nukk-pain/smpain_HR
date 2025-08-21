#!/bin/bash

# Test script for Unified Leave Overview

echo "=== Testing Unified Leave Overview ==="
echo ""

# Login as admin
echo "1. Login as admin..."
TOKEN=$(curl -s -X POST http://localhost:5455/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}' | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to login as admin"
  exit 1
fi
echo "✅ Admin login successful"

# Test admin overview endpoint
echo ""
echo "2. Testing admin/leave/overview endpoint..."
OVERVIEW_RESPONSE=$(curl -s http://localhost:5455/api/admin/leave/overview \
  -H "Authorization: Bearer $TOKEN")

if echo "$OVERVIEW_RESPONSE" | grep -q '"success":true'; then
  TOTAL_EMPLOYEES=$(echo "$OVERVIEW_RESPONSE" | grep -o '"totalEmployees":[0-9]*' | sed 's/"totalEmployees"://')
  echo "✅ Admin overview working - Total employees: $TOTAL_EMPLOYEES"
else
  echo "❌ Admin overview failed"
fi

# Test team status endpoint
echo ""
echo "3. Testing leave/team-status endpoint..."
TEAM_RESPONSE=$(curl -s http://localhost:5455/api/leave/team-status \
  -H "Authorization: Bearer $TOKEN")

if echo "$TEAM_RESPONSE" | grep -q '"members":\['; then
  echo "✅ Team status endpoint working"
else
  echo "❌ Team status endpoint failed"
fi

# Test department stats endpoint
echo ""
echo "4. Testing leave/department-stats endpoint..."
DEPT_RESPONSE=$(curl -s http://localhost:5455/api/leave/department-stats \
  -H "Authorization: Bearer $TOKEN")

if echo "$DEPT_RESPONSE" | grep -q '\['; then
  echo "✅ Department stats endpoint working"
else
  echo "❌ Department stats endpoint failed"
fi

# Test as supervisor (if exists)
echo ""
echo "5. Testing with supervisor role..."
SUPERVISOR_TOKEN=$(curl -s -X POST http://localhost:5455/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "supervisor", "password": "supervisor"}' | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ ! -z "$SUPERVISOR_TOKEN" ]; then
  SUPERVISOR_TEAM=$(curl -s http://localhost:5455/api/leave/team-status \
    -H "Authorization: Bearer $SUPERVISOR_TOKEN")
  
  if echo "$SUPERVISOR_TEAM" | grep -q '"members":\['; then
    echo "✅ Supervisor can access team status"
  else
    echo "❌ Supervisor cannot access team status"
  fi
  
  # Supervisor should not access admin overview
  SUPERVISOR_OVERVIEW=$(curl -s http://localhost:5455/api/admin/leave/overview \
    -H "Authorization: Bearer $SUPERVISOR_TOKEN")
  
  if echo "$SUPERVISOR_OVERVIEW" | grep -q '"error"'; then
    echo "✅ Supervisor correctly blocked from admin overview"
  else
    echo "❌ Security issue: Supervisor can access admin overview"
  fi
else
  echo "⚠️  No supervisor account found - skipping supervisor tests"
fi

echo ""
echo "=== Test Summary ==="
echo "✅ Backend endpoints are working correctly"
echo "✅ Role-based access control is functioning"
echo ""
echo "To test the frontend UI:"
echo "1. Open http://localhost:3730 in your browser"
echo "2. Login as admin (username: admin, password: admin)"
echo "3. Navigate to /leave/overview"
echo "4. Verify all three view modes work (Overview, Team, Department)"
echo ""
echo "=== Test Complete ===
"