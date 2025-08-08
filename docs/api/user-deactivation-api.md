# User Deactivation API Documentation

## Overview

The User Deactivation API provides endpoints for managing user lifecycle states, allowing administrators to deactivate and reactivate user accounts while maintaining audit trails.

## Base URL

```
Production: https://hr-backend-429401177957.asia-northeast3.run.app/api
Development: http://localhost:5000/api
```

## Authentication

All endpoints require JWT authentication via the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

## Permissions

All user deactivation operations require **Admin** role with the following permission:
- `users:manage`

## Endpoints

### 1. Deactivate User

Deactivates a user account, preventing login while preserving data.

```http
PUT /users/:id/deactivate
```

#### Parameters

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| `id` | string | Path | Yes | User ID (MongoDB ObjectId) |
| `reason` | string | Body | No | Reason for deactivation |

#### Request Example

```http
PUT /api/users/674f4c2c1ad14a17586c5555/deactivate
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "reason": "End of employment contract"
}
```

#### Response

**Success (200)**
```json
{
  "success": true,
  "message": "User deactivated successfully",
  "data": {
    "_id": "674f4c2c1ad14a17586c5555",
    "username": "john.doe",
    "name": "John Doe",
    "employeeId": "EMP001",
    "role": "User",
    "department": "IT",
    "isActive": false,
    "deactivatedAt": "2025-08-08T10:30:00.000Z",
    "deactivatedBy": "674f4c2c1ad14a17586c5556",
    "deactivationReason": "End of employment contract",
    "updatedAt": "2025-08-08T10:30:00.000Z"
  }
}
```

**Error Responses**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Invalid user ID format` | Invalid ObjectId format |
| 400 | `User is already deactivated` | User is already inactive |
| 400 | `You cannot deactivate your own account` | Self-deactivation attempt |
| 401 | `Authentication required` | Missing or invalid JWT token |
| 403 | `Permission denied: users:manage` | Insufficient permissions |
| 404 | `User not found` | User does not exist |

#### Business Rules

- Only Admin users can deactivate accounts
- Users cannot deactivate their own accounts
- Already deactivated users cannot be deactivated again
- Deactivation reason is optional but recommended for audit purposes

### 2. Reactivate User

Reactivates a previously deactivated user account.

```http
PUT /users/:id/reactivate
```

#### Parameters

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| `id` | string | Path | Yes | User ID (MongoDB ObjectId) |

#### Request Example

```http
PUT /api/users/674f4c2c1ad14a17586c5555/reactivate
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response

**Success (200)**
```json
{
  "success": true,
  "message": "User reactivated successfully",
  "data": {
    "_id": "674f4c2c1ad14a17586c5555",
    "username": "john.doe",
    "name": "John Doe",
    "employeeId": "EMP001",
    "role": "User",
    "department": "IT",
    "isActive": true,
    "deactivatedAt": null,
    "deactivatedBy": null,
    "deactivationReason": null,
    "updatedAt": "2025-08-08T10:35:00.000Z"
  }
}
```

**Error Responses**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | `Invalid user ID format` | Invalid ObjectId format |
| 400 | `User is already active` | User is already active |
| 401 | `Authentication required` | Missing or invalid JWT token |
| 403 | `Permission denied: users:manage` | Insufficient permissions |
| 404 | `User not found` | User does not exist |

### 3. List Users with Status Filtering

Retrieve users with filtering options for active/inactive status.

```http
GET /users
```

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `status` | string | No | - | Filter by status: 'active', 'inactive', 'all' |
| `includeInactive` | boolean | No | false | Legacy parameter to include inactive users |

#### Request Examples

```http
# Get active users only (default)
GET /api/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Get inactive users only
GET /api/users?status=inactive
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Get all users (active and inactive)
GET /api/users?status=all
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Legacy parameter
GET /api/users?includeInactive=true
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response

**Success (200)**
```json
{
  "success": true,
  "data": [
    {
      "_id": "674f4c2c1ad14a17586c5555",
      "username": "john.doe",
      "name": "John Doe",
      "employeeId": "EMP001",
      "role": "User",
      "department": "IT",
      "isActive": false,
      "deactivatedAt": "2025-08-08T10:30:00.000Z",
      "deactivatedBy": "674f4c2c1ad14a17586c5556",
      "deactivationReason": "End of employment contract",
      "yearsOfService": 2,
      "annualLeave": 17
    }
  ],
  "meta": {
    "total": 1,
    "filter": {
      "includeInactive": false,
      "status": "inactive",
      "appliedFilter": { "isActive": false }
    }
  }
}
```

## Data Models

### User Object

```typescript
interface DeactivatableUser {
  _id: string;                    // MongoDB ObjectId
  username: string;               // Unique username
  name: string;                   // Full name
  employeeId: string;            // Unique employee identifier
  role: 'Admin' | 'Supervisor' | 'User';
  department: string;             // Department name
  email?: string;                // Email address (optional)
  phoneNumber?: string;          // Phone number (optional)
  hireDate?: string;             // ISO date string
  position?: string;             // Job position
  baseSalary?: number;           // Base salary
  leaveBalance?: number;         // Current leave balance
  isActive: boolean;             // Active status
  deactivatedAt?: string | null; // ISO date string or null
  deactivatedBy?: string | null; // User ID or null
  deactivationReason?: string | null; // Reason text or null
  createdAt: string;             // ISO date string
  updatedAt: string;             // ISO date string
  // Calculated fields
  yearsOfService?: number;       // Years since hire date
  annualLeave?: number;          // Calculated annual leave entitlement
}
```

### API Response Structure

```typescript
// Success Response
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: Record<string, any>;
}

// Error Response
interface ApiErrorResponse {
  success: false;
  error: string;
  details?: any;
}
```

## Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server error |

## Rate Limiting

API endpoints may be rate-limited to prevent abuse:
- **Limit**: 100 requests per minute per IP
- **Headers**: Rate limit information in response headers
- **Status**: 429 Too Many Requests when exceeded

## Security Considerations

### Input Validation

- All user IDs are validated as MongoDB ObjectIds
- Deactivation reasons are sanitized but stored as-is for audit purposes
- SQL injection and NoSQL injection protection implemented

### Authorization

- JWT tokens verified on every request
- User active status checked during authentication
- Permission levels enforced at middleware level

### Audit Trail

- All deactivation/reactivation operations logged
- Timestamps and performing user recorded
- Immutable audit trail for compliance

## Error Handling

### Common Error Patterns

```json
// Validation Error
{
  "success": false,
  "error": "Invalid user ID format"
}

// Permission Error
{
  "success": false,
  "error": "Permission denied: users:manage"
}

// Business Logic Error
{
  "success": false,
  "error": "User is already deactivated"
}
```

### Error Categories

1. **Client Errors (4xx)**
   - Invalid input data
   - Missing authentication
   - Insufficient permissions
   - Business rule violations

2. **Server Errors (5xx)**
   - Database connection issues
   - Internal processing errors
   - Third-party service failures

## Usage Examples

### Frontend JavaScript

```javascript
// Deactivate user
async function deactivateUser(userId, reason) {
  try {
    const response = await fetch(`/api/users/${userId}/deactivate`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('User deactivated:', result.data);
    } else {
      console.error('Deactivation failed:', result.error);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Reactivate user
async function reactivateUser(userId) {
  try {
    const response = await fetch(`/api/users/${userId}/reactivate`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('User reactivated:', result.data);
    } else {
      console.error('Reactivation failed:', result.error);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

// Get inactive users
async function getInactiveUsers() {
  try {
    const response = await fetch('/api/users?status=inactive', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Inactive users:', result.data);
    } else {
      console.error('Failed to get users:', result.error);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}
```

### curl Examples

```bash
# Deactivate user
curl -X PUT "https://hr-backend-429401177957.asia-northeast3.run.app/api/users/674f4c2c1ad14a17586c5555/deactivate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "End of employment contract"}'

# Reactivate user
curl -X PUT "https://hr-backend-429401177957.asia-northeast3.run.app/api/users/674f4c2c1ad14a17586c5555/reactivate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get inactive users
curl "https://hr-backend-429401177957.asia-northeast3.run.app/api/users?status=inactive" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Testing

### Test Coverage

- Unit tests for validation functions
- Integration tests for API endpoints
- Security tests for authorization and input validation
- Performance tests for bulk operations

### Test Environment

- **Base URL**: `http://localhost:5000/api` (development)
- **Authentication**: Use test JWT tokens with appropriate permissions
- **Database**: Test operations use isolated test database

## Changelog

### Version 1.0.0 (2025-08-08)
- Initial implementation of user deactivation API
- Added comprehensive validation and error handling
- Implemented audit trail functionality
- Added status filtering for user lists
- Created comprehensive test coverage

### Future Enhancements
- Bulk deactivation operations
- Scheduled reactivation
- Integration with external HR systems
- Advanced audit reporting