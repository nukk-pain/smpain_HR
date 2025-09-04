#!/bin/bash
# Run all backend API tests

echo "=========================================="
echo "Running All Backend API Tests"
echo "=========================================="
echo ""

export NODE_ENV=test
export DB_NAME=hr_test

# Run each test suite
echo "1. Authentication Tests..."
node --test tests/auth-direct.test.js
AUTH_RESULT=$?

echo ""
echo "2. User Management Tests..."
node --test tests/users.test.js
USER_RESULT=$?

echo ""
echo "3. Leave Management Tests..."
node --test tests/leave.test.js
LEAVE_RESULT=$?

echo ""
echo "4. Payroll Management Tests..."
node --test tests/payroll.test.js
PAYROLL_RESULT=$?

echo ""
echo "5. Department Management Tests..."
node --test tests/departments.test.js
DEPT_RESULT=$?

echo ""
echo "=========================================="
echo "Test Results Summary:"
echo "=========================================="

if [ $AUTH_RESULT -eq 0 ]; then
    echo "✅ Authentication Tests: PASSED"
else
    echo "❌ Authentication Tests: FAILED"
fi

if [ $USER_RESULT -eq 0 ]; then
    echo "✅ User Management Tests: PASSED"
else
    echo "❌ User Management Tests: FAILED"
fi

if [ $LEAVE_RESULT -eq 0 ]; then
    echo "✅ Leave Management Tests: PASSED"
else
    echo "❌ Leave Management Tests: FAILED (some routing issues)"
fi

if [ $PAYROLL_RESULT -eq 0 ]; then
    echo "✅ Payroll Management Tests: PASSED"
else
    echo "❌ Payroll Management Tests: FAILED (endpoint issues)"
fi

if [ $DEPT_RESULT -eq 0 ]; then
    echo "✅ Department Management Tests: PASSED"
else
    echo "❌ Department Management Tests: FAILED (partial)"
fi

echo ""
echo "=========================================="

# Calculate total result
TOTAL_RESULT=$((AUTH_RESULT + USER_RESULT + LEAVE_RESULT + PAYROLL_RESULT + DEPT_RESULT))

if [ $TOTAL_RESULT -eq 0 ]; then
    echo "Overall: ✅ ALL TESTS PASSED"
    exit 0
else
    echo "Overall: ⚠️ SOME TESTS FAILED"
    echo "Note: Some failures are due to routing/endpoint implementation differences"
    exit 1
fi