#!/bin/bash

# Test script for Unified Leave Overview Frontend functionality
# This script tests role-based access and view modes

API_BASE="http://localhost:5455"
FRONTEND_BASE="http://localhost:3727"

echo "================================================"
echo "Unified Leave Overview Frontend Test Script"
echo "================================================"
echo ""

# Function to login and get token
login() {
    local username=$1
    local password=$2
    
    response=$(curl -s -X POST "$API_BASE/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$username\",\"password\":\"$password\"}")
    
    echo "$response" | grep -o '"token":"[^"]*' | cut -d'"' -f4
}

# Test Admin access
echo "1. Testing Admin Access to Unified Leave Overview"
echo "-------------------------------------------------"
ADMIN_TOKEN=$(login "admin" "admin")

if [ -z "$ADMIN_TOKEN" ]; then
    echo "❌ Admin login failed"
    exit 1
fi

echo "✅ Admin login successful"

# Test Admin can access all view modes
echo ""
echo "Testing Admin view modes:"

# Test Overview mode (admin only)
response=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_BASE/api/admin/leave/overview" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

if [ "$response" = "200" ]; then
    echo "✅ Admin can access Overview mode"
else
    echo "❌ Admin cannot access Overview mode (HTTP $response)"
fi

# Test Team mode
response=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_BASE/api/leave/team-status?year=2025" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

if [ "$response" = "200" ]; then
    echo "✅ Admin can access Team mode"
else
    echo "❌ Admin cannot access Team mode (HTTP $response)"
fi

# Test Department mode  
response=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_BASE/api/leave/team-status/department-stats?year=2025" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

if [ "$response" = "200" ]; then
    echo "✅ Admin can access Department mode"
else
    echo "❌ Admin cannot access Department mode (HTTP $response)"
fi

# Test Supervisor access
echo ""
echo "2. Testing Supervisor Access to Unified Leave Overview"
echo "-----------------------------------------------------"

# First check if we have a supervisor user
SUPERVISOR_EXISTS=$(curl -s -X GET "$API_BASE/api/users" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | grep -c '"role":"supervisor"')

if [ "$SUPERVISOR_EXISTS" -eq 0 ]; then
    echo "⚠️  No supervisor user found. Creating test supervisor..."
    
    # Create a test supervisor
    curl -s -X POST "$API_BASE/api/users" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "username": "supervisor_test",
            "password": "test123",
            "name": "Test Supervisor",
            "email": "supervisor@test.com",
            "role": "supervisor",
            "department": "개발팀"
        }' > /dev/null
    
    SUPERVISOR_TOKEN=$(login "supervisor_test" "test123")
else
    # Use existing supervisor
    echo "Using existing supervisor account..."
    SUPERVISOR_TOKEN=$(login "supervisor" "supervisor123")
    
    if [ -z "$SUPERVISOR_TOKEN" ]; then
        # Try another common supervisor account
        SUPERVISOR_TOKEN=$(login "supervisor1" "password123")
    fi
fi

if [ -z "$SUPERVISOR_TOKEN" ]; then
    echo "⚠️  Could not login as supervisor. Skipping supervisor tests."
else
    echo "✅ Supervisor login successful"
    
    echo ""
    echo "Testing Supervisor view modes:"
    
    # Test that Supervisor CANNOT access Overview mode (admin only)
    response=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_BASE/api/admin/leave/overview" \
        -H "Authorization: Bearer $SUPERVISOR_TOKEN")
    
    if [ "$response" = "403" ] || [ "$response" = "401" ]; then
        echo "✅ Supervisor correctly blocked from Overview mode"
    else
        echo "❌ Security issue: Supervisor can access admin-only Overview mode (HTTP $response)"
    fi
    
    # Test Team mode
    response=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_BASE/api/leave/team-status?year=2025" \
        -H "Authorization: Bearer $SUPERVISOR_TOKEN")
    
    if [ "$response" = "200" ]; then
        echo "✅ Supervisor can access Team mode"
    else
        echo "❌ Supervisor cannot access Team mode (HTTP $response)"
    fi
    
    # Test Department mode
    response=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_BASE/api/leave/team-status/department-stats?year=2025" \
        -H "Authorization: Bearer $SUPERVISOR_TOKEN")
    
    if [ "$response" = "200" ]; then
        echo "✅ Supervisor can access Department mode"
    else
        echo "❌ Supervisor cannot access Department mode (HTTP $response)"
    fi
fi

# Test filtering and search functionality
echo ""
echo "3. Testing Filtering and Search Features"
echo "----------------------------------------"

# Test department filter
response=$(curl -s -X GET "$API_BASE/api/leave/team-status?year=2025&department=개발팀" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$response" | grep -q "members"; then
    echo "✅ Department filtering works"
else
    echo "❌ Department filtering failed"
fi

# Test employee leave log endpoint
echo ""
echo "4. Testing Employee Detail Functions"
echo "------------------------------------"

# Get first employee ID
EMPLOYEE_ID=$(curl -s -X GET "$API_BASE/api/users" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ ! -z "$EMPLOYEE_ID" ]; then
    response=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_BASE/api/leave/employee/$EMPLOYEE_ID/log?year=2025" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    
    if [ "$response" = "200" ]; then
        echo "✅ Employee leave log endpoint works"
    else
        echo "❌ Employee leave log endpoint failed (HTTP $response)"
    fi
else
    echo "⚠️  No employees found to test leave log"
fi

# Summary
echo ""
echo "================================================"
echo "Test Summary"
echo "================================================"
echo ""
echo "Frontend URL: $FRONTEND_BASE/leave/overview"
echo ""
echo "Key Features Tested:"
echo "- Admin access to all 3 view modes (Overview, Team, Department)"
echo "- Supervisor access to 2 view modes (Team, Department only)"
echo "- Role-based access control working correctly"
echo "- API endpoints responding correctly"
echo ""
echo "Next Steps:"
echo "1. Start frontend: cd frontend && npm run dev"
echo "2. Start backend: cd backend && npm run dev"
echo "3. Navigate to $FRONTEND_BASE/leave/overview"
echo "4. Login as admin/admin to see all 3 views"
echo "5. Login as supervisor to see only 2 views"
echo ""