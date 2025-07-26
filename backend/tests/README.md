# Test Suite Documentation

This directory contains comprehensive tests for the refactored HR management system backend.

## Test Structure

```
tests/
├── setup.js                    # Global test configuration
├── unit/                      # Unit tests for utilities
│   ├── dateUtils.test.js      # Date utility functions
│   └── leaveUtils.test.js     # Leave utility functions
├── repositories/              # Repository layer tests
│   ├── BaseRepository.test.js # Base repository CRUD operations
│   └── UserRepository.test.js # User-specific repository methods
└── integration/               # API integration tests
    ├── users-refactored.test.js      # Users API endpoints
    ├── leave-refactored.test.js      # Leave API endpoints
    └── departments-refactored.test.js # Departments API endpoints
```

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Specific Test Categories
```bash
# Unit tests only
npm run test:unit

# Repository tests only  
npm run test:repositories

# Integration tests only
npm run test:integration
```

## Test Categories

### Unit Tests
- **dateUtils.test.js**: Tests date formatting, calculations, Korean holidays, business day calculations
- **leaveUtils.test.js**: Tests leave calculations, validations, conflict checking, balance management

### Repository Tests
- **BaseRepository.test.js**: Tests CRUD operations, pagination, aggregation, error handling
- **UserRepository.test.js**: Tests user-specific methods like password validation, leave balance updates

### Integration Tests
- **users-refactored.test.js**: Full API testing including authentication, authorization, validation
- **leave-refactored.test.js**: Leave request lifecycle, approval workflows, balance calculations
- **departments-refactored.test.js**: Department management, employee relationships, permissions

## Test Features

### Database Testing
- Uses MongoDB Memory Server for isolated testing
- No external database dependencies
- Automatic cleanup between tests

### Authentication Testing
- Session-based authentication simulation
- Role-based access control validation
- Permission boundary testing

### Error Handling
- Validates proper error responses
- Tests edge cases and invalid inputs
- Ensures graceful degradation

### Data Integrity
- Tests field consistency across layers
- Validates business rule enforcement
- Checks referential integrity

## Test Data Management

Tests use consistent test data helpers defined in `setup.js`:
- `createTestUser()` - Standard user data
- `createTestAdmin()` - Admin user data  
- `createTestDepartment()` - Department data
- `createTestLeaveRequest()` - Leave request data

## Coverage Goals

The test suite aims for:
- **80%+ line coverage** on business logic
- **100% coverage** on utility functions
- **Complete API endpoint coverage** for refactored routes
- **Error path coverage** for all major failure scenarios

## Running Individual Tests

```bash
# Run specific test file
npx jest backend/tests/unit/dateUtils.test.js

# Run tests matching pattern
npx jest --testNamePattern="should create user"

# Run with verbose output
npx jest --verbose
```

## Continuous Integration

These tests are designed to run in CI/CD pipelines:
- No external dependencies
- Deterministic results
- Reasonable execution time (~30s for full suite)
- Clear failure reporting

## Debugging Tests

For debugging test failures:
```bash
# Run with debug output
npm test -- --verbose

# Run single test in watch mode
npx jest --watch backend/tests/unit/dateUtils.test.js

# Run with coverage to see untested code paths
npm run test:coverage
```

## Test Best Practices

1. **Isolation**: Each test is independent and doesn't rely on others
2. **Cleanup**: Database is cleared between tests
3. **Mocking**: External dependencies are mocked appropriately
4. **Assertions**: Tests include comprehensive assertions
5. **Edge Cases**: Both happy path and error scenarios are tested
6. **Documentation**: Tests serve as living documentation of expected behavior