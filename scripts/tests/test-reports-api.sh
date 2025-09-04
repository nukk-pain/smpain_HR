#!/bin/bash

# Test Reports API endpoints
echo "Testing Reports API endpoints..."

# Test 1: GET /api/reports/payroll/:year_month
echo -e "\n1. Testing payroll report endpoint..."
curl -s -X GET http://localhost:5455/api/reports/payroll/2024-12 \
  -H "Cookie: sessionId=test" | head -c 100

# Test 2: POST /api/reports/payslip/match-employees
echo -e "\n2. Testing match-employees endpoint..."
curl -s -X POST http://localhost:5455/api/reports/payslip/match-employees \
  -H "Content-Type: application/json" \
  -H "Cookie: sessionId=test" \
  -d '{"files": [], "employees": []}' | head -c 100

# Test 3: POST /api/reports/payslip/bulk-upload
echo -e "\n3. Testing bulk-upload endpoint..."
curl -s -X POST http://localhost:5455/api/reports/payslip/bulk-upload \
  -H "Cookie: sessionId=test" | head -c 100

# Test 4: GET /api/reports/payslip/download/:documentId
echo -e "\n4. Testing download endpoint..."
curl -s -X GET http://localhost:5455/api/reports/payslip/download/test-id \
  -H "Cookie: sessionId=test" | head -c 100

# Test removed endpoint (should return 404)
echo -e "\n5. Testing removed upload-history endpoint (should fail)..."
curl -s -X GET http://localhost:5455/api/reports/payslip/upload-history \
  -H "Cookie: sessionId=test" | head -c 100

echo -e "\n\nTests complete!"
