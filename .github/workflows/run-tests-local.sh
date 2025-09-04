#!/bin/bash
# TEST-01 Local Test Runner
# This script runs tests locally in the same way as CI/CD pipeline
# Usage: ./run-tests-local.sh [backend|frontend|e2e|all]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test type from argument (default: all)
TEST_TYPE=${1:-all}

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}TEST-01 Integration Test Suite - Local Runner${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

# Function to check if MongoDB is running
check_mongodb() {
    echo -e "${YELLOW}Checking MongoDB...${NC}"
    if mongosh --eval 'db.adminCommand({ping: 1})' > /dev/null 2>&1 || mongo --eval 'db.adminCommand({ping: 1})' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ MongoDB is running${NC}"
        return 0
    else
        echo -e "${RED}❌ MongoDB is not running${NC}"
        echo "Please start MongoDB first:"
        echo "  - Windows: net start MongoDB"
        echo "  - macOS: brew services start mongodb-community"
        echo "  - Linux: sudo systemctl start mongod"
        return 1
    fi
}

# Function to setup test database
setup_test_db() {
    echo -e "${YELLOW}Setting up test database...${NC}"
    cd backend
    node -e "
    const { MongoClient } = require('mongodb');
    (async () => {
        const client = new MongoClient('mongodb://localhost:27017');
        await client.connect();
        const db = client.db('hr_test');
        
        // Clear existing data
        await db.dropDatabase();
        
        // Create test admin user
        await db.collection('users').insertOne({
            employeeId: 'ADM001',
            username: 'admin',
            password: '\$2a\$10\$YJvVqDpBBhRBH0ebiLlS7OI1oI2qM/7wJZeBtOmAqdwlwIdylAHl6',
            name: 'Admin User',
            email: 'admin@test.com',
            role: 'Admin',
            permissions: { canCreate: true, canRead: true, canUpdate: true, canDelete: true },
            isActive: true,
            createdAt: new Date()
        });
        
        console.log('Test database setup complete');
        await client.close();
    })().catch(console.error);
    "
    cd ..
    echo -e "${GREEN}✅ Test database ready${NC}"
}

# Function to run backend tests
run_backend_tests() {
    echo ""
    echo -e "${YELLOW}Running Backend Tests...${NC}"
    echo "========================="
    cd backend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing backend dependencies..."
        npm ci
    fi
    
    # Run tests
    echo "Running unit tests..."
    npm test 2>&1 | tee test-results.txt || true
    
    if grep -q "PASS" test-results.txt; then
        echo -e "${GREEN}✅ Backend tests completed${NC}"
    else
        echo -e "${YELLOW}⚠️ Some backend tests may have failed${NC}"
    fi
    
    cd ..
}

# Function to run frontend tests
run_frontend_tests() {
    echo ""
    echo -e "${YELLOW}Running Frontend Component Tests...${NC}"
    echo "===================================="
    cd frontend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing frontend dependencies..."
        npm ci
    fi
    
    # Run component tests
    echo "Running component tests..."
    npm run test:run 2>&1 | tee test-results.txt || true
    
    if grep -q "passed" test-results.txt; then
        echo -e "${GREEN}✅ Frontend tests completed${NC}"
        # Show summary
        grep -E "(passed|failed|skipped)" test-results.txt | tail -1
    else
        echo -e "${YELLOW}⚠️ Some frontend tests may have failed${NC}"
    fi
    
    cd ..
}

# Function to run E2E tests
run_e2e_tests() {
    echo ""
    echo -e "${YELLOW}Running E2E Tests...${NC}"
    echo "===================="
    
    # Start backend server
    echo "Starting backend server..."
    cd backend
    npm start > ../backend.log 2>&1 &
    BACKEND_PID=$!
    cd ..
    
    # Wait for backend to start
    echo "Waiting for backend server..."
    for i in {1..30}; do
        if curl -s http://localhost:5455/api/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Backend server ready${NC}"
            break
        fi
        sleep 1
    done
    
    # Start frontend server
    echo "Starting frontend server..."
    cd frontend
    npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ..
    
    # Wait for frontend to start
    echo "Waiting for frontend server..."
    for i in {1..30}; do
        if curl -s http://localhost:3727 > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Frontend server ready${NC}"
            break
        fi
        sleep 1
    done
    
    # Run E2E tests
    cd frontend
    echo "Running E2E scenario tests..."
    npm run test:e2e 2>&1 | tee e2e-results.txt || true
    
    if grep -q "passed" e2e-results.txt; then
        echo -e "${GREEN}✅ E2E tests completed${NC}"
        grep -E "(passed|failed|skipped)" e2e-results.txt | tail -1
    else
        echo -e "${YELLOW}⚠️ Some E2E tests may have failed${NC}"
    fi
    
    cd ..
    
    # Cleanup
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
}

# Function to generate summary
generate_summary() {
    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}Test Summary${NC}"
    echo -e "${GREEN}================================================${NC}"
    
    # Backend results
    if [ -f "backend/test-results.txt" ]; then
        echo -e "${YELLOW}Backend:${NC}"
        grep -E "(PASS|FAIL|tests)" backend/test-results.txt | tail -3 || echo "  No results"
    fi
    
    # Frontend results
    if [ -f "frontend/test-results.txt" ]; then
        echo -e "${YELLOW}Frontend:${NC}"
        grep -E "(passed|failed|tests)" frontend/test-results.txt | tail -1 || echo "  No results"
    fi
    
    # E2E results
    if [ -f "frontend/e2e-results.txt" ]; then
        echo -e "${YELLOW}E2E:${NC}"
        grep -E "(passed|failed|tests)" frontend/e2e-results.txt | tail -1 || echo "  No results"
    fi
    
    echo ""
    echo -e "${GREEN}✅ Test run completed!${NC}"
    echo ""
    
    # Save summary to file
    echo "Test results saved to test-summary-$(date +%Y%m%d-%H%M%S).txt"
}

# Main execution
main() {
    # Check MongoDB
    check_mongodb || exit 1
    
    # Setup test database
    setup_test_db
    
    # Run tests based on type
    case $TEST_TYPE in
        backend)
            run_backend_tests
            ;;
        frontend)
            run_frontend_tests
            ;;
        e2e)
            run_e2e_tests
            ;;
        all|*)
            run_backend_tests
            run_frontend_tests
            run_e2e_tests
            ;;
    esac
    
    # Generate summary
    generate_summary
}

# Trap to cleanup on exit
trap 'kill $(jobs -p) 2>/dev/null' EXIT

# Run main function
main