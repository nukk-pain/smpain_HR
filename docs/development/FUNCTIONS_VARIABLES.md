# Functions and Variables Reference

This document maintains a registry of all functions and variables in the HR system to prevent duplication and encourage reuse.

## Payroll Excel Upload Functions

### API Service Methods (`frontend/src/services/api.ts`)

#### New Preview-Based Upload Flow
- `previewPayrollExcel(file, year?, month?)` - Previews Excel file without saving to database
- `confirmPayrollExcel(previewToken, idempotencyKey?)` - Confirms and saves previewed data

### PayrollService Methods (`frontend/src/services/payrollService.ts`)

#### Excel Operations
- `previewExcel(file, year?, month?)` - Service layer wrapper for Excel preview
- `confirmExcelPreview(previewToken, idempotencyKey?)` - Service layer wrapper for confirmation
- `previewExcelWithTimeout(file, year?, month?, options?)` - Preview with configurable timeout
- `previewExcelWithRetry(file, year?, month?, options?)` - Preview with retry logic
- `confirmExcelPreviewWithRetry(previewToken, idempotencyKey?, options?)` - Confirmation with retry

#### Progress Tracking
- `createProgressConnection(uploadId, onProgress)` - Creates SSE connection for real-time progress

#### Error Handling Utilities
- `retryWithExponentialBackoff(fn, maxRetries, shouldRetry?)` - Generic retry with exponential backoff
- `isValidationError(error)` - Checks if error is client-side validation error
- `enhanceError(error)` - Transforms technical errors to user-friendly messages

### Components (`frontend/src/components/`)

#### New Excel Upload with Preview
- `PayrollExcelUploadWithPreview` - Main upload component with preview functionality
- `PreviewDataTable` - Data table with filtering, pagination, and status indicators

## User Deactivation & Management Functions

### Utilities (`backend/utils/userDeactivation.js`)

#### Core Data Functions
- `createDeactivationData(deactivatedBy, reason?)` - Creates standardized deactivation update object
- `createReactivationData()` - Creates standardized reactivation update object  
- `createTestUserData(baseData, isActive?, deactivatedBy?, reason?)` - Creates test user with deactivation fields

#### Validation Functions
- `validateDeactivation(user, requestingUserId)` - Validates if user can be deactivated
- `validateReactivation(user)` - Validates if user can be reactivated

#### Query Filter Functions
- `QueryFilters.activeOnly()` - Returns filter for active users only
- `QueryFilters.inactiveOnly()` - Returns filter for inactive users only  
- `QueryFilters.byStatus(status?, includeInactive?)` - Returns filter based on status parameter

### Repository Methods (`backend/repositories/UserRepository.js`)

#### User Management
- `createUser(userData)` - Creates new user with password hashing and defaults
- `updateUser(id, userData)` - Updates user with password hashing if provided
- `findByUsername(username)` - Finds user by username
- `findByEmployeeId(employeeId)` - Finds user by employee ID
- `findActiveUsers()` - Finds all active users
- `deactivateUser(userId, deactivatedBy, reason?)` - Deactivates user with metadata *(Updated)*
- `reactivateUser(userId)` - Reactivates user and clears metadata *(Updated)*

#### Leave Management
- `updateLeaveBalance(userId, newBalance)` - Updates user's leave balance
- `incrementLeaveBalance(userId, amount)` - Increments leave balance
- `decrementLeaveBalance(userId, amount)` - Decrements leave balance
- `findUsersWithLeaveBalance(minBalance?)` - Finds users with minimum leave balance

### API Routes (`backend/routes/users.js`)

#### User Lifecycle
- `PUT /api/users/:id/deactivate` - Deactivates user (Admin only)
- `PUT /api/users/:id/reactivate` - Reactivates user (Admin only)  
- `POST /api/users/:id/activate` - Legacy activation endpoint
- `GET /api/users` - Lists users with status filtering support

#### Route Handlers
- All deactivation routes use utility functions for consistency
- Status filtering uses `QueryFilters.byStatus()` utility

### Frontend Services (`frontend/src/services/api.ts`)

#### User Management API
- `deactivateUser(id, reason?)` - Calls deactivation API
- `reactivateUser(id)` - Calls reactivation API
- Both return standardized API response format

## Common Patterns & Variables

### Status Field Names
- `isActive` - Boolean indicating user active status
- `deactivatedAt` - Timestamp of deactivation
- `deactivatedBy` - User ID who performed deactivation
- `deactivationReason` - Text reason for deactivation

### Query Patterns
```javascript
// Active users only (default)
{ isActive: { $ne: false } }

// Inactive users only  
{ isActive: false }

// All users (no filter)
{}
```

### Response Format
```javascript
// Success response
{
  success: true,
  data: {...},
  message?: string,
  meta?: {...}
}

// Error response
{
  success: false,
  error: string,
  details?: any
}
```

### Test Utilities

#### Test Data Creation
- Use `createTestUserData()` for consistent test user creation
- Use `createDeactivationData()` for test deactivation operations
- All test functions create unique identifiers using timestamps

#### Test Patterns
```javascript
// Standard test user
const userData = createTestUserData({
  username: `test_user_${Date.now()}`,
  name: 'Test User',
  role: 'User'
}, true); // Active by default

// Deactivated test user  
const inactiveUserData = createTestUserData(baseData, false, adminId, 'Test reason');
```

## Type Definitions

### TypeScript Interfaces (`backend/types/`)

#### User Types (`user.d.ts`)
- `User` - Base user interface
- `DeactivatableUser` - User with deactivation fields
- `CreateUserData` - User creation payload
- `UpdateUserData` - User update payload
- `UserFilterParams` - Query parameters for filtering
- `UserListResponse` - API response for user lists
- `UserResponse` - API response for single user
- `JWTUserPayload` - JWT token payload structure

#### API Types (`api.d.ts`)  
- `ApiSuccessResponse<T>` - Standard success response
- `ApiErrorResponse` - Standard error response
- `ApiResponse<T>` - Union of success/error responses
- `PaginatedApiResponse<T>` - Paginated response format
- `ValidationErrorResponse` - Validation error format

#### Deactivation Types (`userDeactivation.d.ts`)
- `DeactivationData` - Deactivation update structure
- `ReactivationData` - Reactivation update structure  
- `ValidationResult` - Validation function result
- `UserDocument` - User document for deactivation ops

## Usage Guidelines

### Before Creating New Functions
1. Check this document first for existing functions
2. Look for similar patterns in the codebase
3. Consider if existing utilities can be extended

### Function Naming Conventions
- Use camelCase for JavaScript functions
- Use descriptive verbs: `create`, `validate`, `find`, `update`
- Include entity name: `createUserData`, `validateDeactivation`
- Use consistent prefixes for related functions

### Variable Naming Conventions  
- Database fields: snake_case for compatibility
- JavaScript variables: camelCase
- Constants: UPPER_SNAKE_CASE
- Boolean flags: use `is`, `has`, `can` prefixes

### Testing Conventions
- Test files should have descriptive names ending in `.test.js`
- Use utility functions for consistent test data
- Clean up test data in `afterAll` or `afterEach` hooks
- Use unique identifiers to prevent test conflicts

## Performance Considerations

### Database Queries
- Use indexed fields for filtering (isActive, employeeId, username)
- Leverage `QueryFilters` utilities for consistent query patterns
- Consider query optimization for large datasets

### Caching Strategies  
- User permissions can be cached per session
- Active user lists suitable for short-term caching
- Deactivation operations should clear relevant caches

## Security Considerations

### Access Control
- All user modification operations require Admin permissions
- Self-deactivation is prevented at validation level
- Input validation handled by utility functions

### Data Handling
- Passwords hashed using bcryptjs (10 rounds)
- Sensitive data excluded from API responses
- Audit trails maintained for deactivation operations

---

## Admin Routes Structure

### Route Files (`backend/routes/admin/`)

#### Main Router
- `admin.js` - Main router integration file that combines all admin sub-modules

#### Admin Sub-modules
- `leaveAdmin.js` - Leave management routes
  - `/leave/overview` - Leave overview and statistics
  - `/leave/adjust` - Adjust employee leave balances
  - `/leave/employee/:id` - Employee-specific leave details
  - `/leave/bulk-pending` - Pending leave requests list
  - `/leave/bulk-approve` - Bulk approve/reject leave requests

- `systemAdmin.js` - System and policy management routes
  - `/stats/system` - System statistics and metrics
  - `/policy` - Get and update leave policies
  - `/policy/history` - Policy change history
  - `/migrate-users-isactive` - User data migration utilities

- `capacityAdmin.js` - Capacity and temporary data management
  - `/debug/temp-uploads` - Debug temporary upload issues
  - `/dashboard/temp-data` - Temporary data dashboard
  - `/capacity/status` - System capacity status
  - `/capacity/cleanup` - Clean up temporary data
  - `/capacity/policy` - Capacity management policies

- `logsAdmin.js` - Logging and audit routes
  - `/logs/query` - Query system logs
  - `/logs/stats` - Log statistics and analytics
  - `/logs/export` - Export logs for analysis
  - `/logs/cleanup` - Clean up old log entries

#### Shared Middleware (`backend/routes/admin/shared/`)
- `adminMiddleware.js` - Common middleware and helper functions
  - `requireAdmin` - Ensure user has admin role
  - `requirePermission` - Check specific permissions
  - Common validation and error handling utilities

## Change Log

### 2025-08-13 - Admin Routes Refactoring
- Split monolithic admin.js (1,873 lines) into 5 modular files
- Created dedicated sub-modules for leave, system, capacity, and logs management
- Extracted shared middleware into separate file
- Improved code organization and maintainability
- Each module now handles specific domain concerns

### 2025-08-08 - User Deactivation Feature
- Added comprehensive deactivation/reactivation utilities
- Created type definitions for all operations
- Standardized API response formats
- Added security validation functions
- Created test utilities for consistent testing

### Future Additions
- Document new functions and variables as they're created
- Update existing entries when functions are modified
- Remove entries when functions are deprecated