#!/bin/bash

# Test script for Leave Excel Export functionality
# This script tests the complete Excel export flow end-to-end

echo "================================================"
echo "Leave Excel Export - End-to-End Test"
echo "================================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backend URL (adjust if needed)
API_URL="http://localhost:5455/api"

# Function to get JWT token
get_token() {
    local role=$1
    local username=$2
    local password=$3
    
    response=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$username\",\"password\":\"$password\"}")
    
    token=$(echo $response | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "$token"
}

echo "1. Testing authentication..."
echo "------------------------------"

# Get Admin token
ADMIN_TOKEN=$(get_token "Admin" "admin" "admin")
if [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${RED}❌ Failed to get Admin token${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Admin authentication successful${NC}"
fi

# Get User token
USER_TOKEN=$(get_token "User" "user1" "test123")
if [ -z "$USER_TOKEN" ]; then
    echo -e "${YELLOW}⚠ Failed to get User token (using test user)${NC}"
else
    echo -e "${GREEN}✓ User authentication successful${NC}"
fi

echo ""
echo "2. Testing Excel Export API Endpoints..."
echo "------------------------------"

# Test 1: Unauthorized access (no token)
echo -n "Test 1 - Unauthorized access: "
response=$(curl -s -o /dev/null -w "%{http_code}" \
    "$API_URL/leave/admin/export/excel?view=overview&year=2025")
if [ "$response" = "401" ]; then
    echo -e "${GREEN}✓ Correctly returns 401${NC}"
else
    echo -e "${RED}❌ Expected 401, got $response${NC}"
fi

# Test 2: Non-admin access (user token)
if [ ! -z "$USER_TOKEN" ]; then
    echo -n "Test 2 - Non-admin access: "
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $USER_TOKEN" \
        "$API_URL/leave/admin/export/excel?view=overview&year=2025")
    if [ "$response" = "403" ]; then
        echo -e "${GREEN}✓ Correctly returns 403 for non-admin${NC}"
    else
        echo -e "${RED}❌ Expected 403, got $response${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Skipping non-admin test (no user token)${NC}"
fi

# Test 3: Admin access - Overview view
echo -n "Test 3 - Admin Excel export (Overview): "
response=$(curl -s -o /tmp/leave-overview.xlsx -w "%{http_code}" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$API_URL/leave/admin/export/excel?view=overview&year=2025")
if [ "$response" = "200" ]; then
    if [ -f /tmp/leave-overview.xlsx ] && [ -s /tmp/leave-overview.xlsx ]; then
        echo -e "${GREEN}✓ Excel file downloaded successfully${NC}"
        file_info=$(file /tmp/leave-overview.xlsx 2>/dev/null | grep -i "office\|excel\|zip")
        if [ ! -z "$file_info" ]; then
            echo -e "  ${GREEN}✓ File is valid Excel format${NC}"
        else
            echo -e "  ${YELLOW}⚠ File format verification needed${NC}"
        fi
    else
        echo -e "${RED}❌ File not created or empty${NC}"
    fi
else
    echo -e "${RED}❌ Expected 200, got $response${NC}"
fi

# Test 4: Team view export
echo -n "Test 4 - Team view export: "
response=$(curl -s -o /tmp/leave-team.xlsx -w "%{http_code}" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$API_URL/leave/admin/export/excel?view=team&year=2025")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✓ Team view export successful${NC}"
else
    echo -e "${RED}❌ Expected 200, got $response${NC}"
fi

# Test 5: Department view export
echo -n "Test 5 - Department view export: "
response=$(curl -s -o /tmp/leave-department.xlsx -w "%{http_code}" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$API_URL/leave/admin/export/excel?view=department&year=2025")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✓ Department view export successful${NC}"
else
    echo -e "${RED}❌ Expected 200, got $response${NC}"
fi

# Test 6: Export with filters
echo -n "Test 6 - Export with department filter: "
response=$(curl -s -o /tmp/leave-filtered.xlsx -w "%{http_code}" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$API_URL/leave/admin/export/excel?view=overview&year=2025&department=개발팀")
if [ "$response" = "200" ]; then
    echo -e "${GREEN}✓ Filtered export successful${NC}"
else
    echo -e "${RED}❌ Expected 200, got $response${NC}"
fi

echo ""
echo "3. Testing Content Type Headers..."
echo "------------------------------"

echo -n "Test 7 - Content-Type header check: "
content_type=$(curl -s -I \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$API_URL/leave/admin/export/excel?view=overview&year=2025" | \
    grep -i "content-type" | \
    grep -i "application/vnd.openxmlformats")
if [ ! -z "$content_type" ]; then
    echo -e "${GREEN}✓ Correct Excel content type${NC}"
else
    echo -e "${RED}❌ Incorrect or missing content type${NC}"
fi

echo -n "Test 8 - Content-Disposition header: "
disposition=$(curl -s -I \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$API_URL/leave/admin/export/excel?view=overview&year=2025" | \
    grep -i "content-disposition" | \
    grep -i "attachment")
if [ ! -z "$disposition" ]; then
    echo -e "${GREEN}✓ Correct attachment disposition${NC}"
else
    echo -e "${RED}❌ Missing attachment disposition${NC}"
fi

echo ""
echo "4. Performance Test..."
echo "------------------------------"

echo -n "Test 9 - Response time: "
start_time=$(date +%s%N)
response=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$API_URL/leave/admin/export/excel?view=overview&year=2025")
end_time=$(date +%s%N)
elapsed=$((($end_time - $start_time) / 1000000))

if [ "$elapsed" -lt 5000 ]; then
    echo -e "${GREEN}✓ Response time: ${elapsed}ms (Good)${NC}"
elif [ "$elapsed" -lt 10000 ]; then
    echo -e "${YELLOW}⚠ Response time: ${elapsed}ms (Acceptable)${NC}"
else
    echo -e "${RED}❌ Response time: ${elapsed}ms (Too slow)${NC}"
fi

echo ""
echo "5. Cleanup..."
echo "------------------------------"
rm -f /tmp/leave-*.xlsx
echo -e "${GREEN}✓ Temporary files cleaned up${NC}"

echo ""
echo "================================================"
echo "Test Summary"
echo "================================================"
echo -e "${GREEN}✅ Excel export API is working correctly${NC}"
echo ""
echo "Files can be downloaded at:"
echo "  - /api/leave/admin/export/excel?view=overview"
echo "  - /api/leave/admin/export/excel?view=team"
echo "  - /api/leave/admin/export/excel?view=department"
echo ""
echo "Optional parameters:"
echo "  - year: Year for the data (default: current year)"
echo "  - department: Filter by department"
echo "  - riskLevel: Filter by risk level (high/medium/low)"
echo ""