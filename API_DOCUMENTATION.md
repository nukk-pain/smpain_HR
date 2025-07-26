# HR System API Documentation

## Overview

This document provides comprehensive API documentation for the refactored HR management system. All APIs follow RESTful conventions with standardized request/response formats.

## Base URL
```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication

All API endpoints require session-based authentication unless otherwise specified.

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "string",
      "username": "string", 
      "name": "string",
      "role": "Admin|Manager|User",
      "department": "string",
      "permissions": ["permission1", "permission2"]
    }
  }
}
```

### Logout
```http
POST /auth/logout
```

## Standard Response Format

All API responses follow this standardized format:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

### Pagination Response
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": {
    "documents": [/* array of items */],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalDocuments": 50,
      "hasNextPage": true,
      "hasPrevPage": false,
      "limit": 10
    }
  }
}
```

## Users API

### Get Users
```http
GET /users?page=1&limit=10&role=User&department=IT&isActive=true
```

**Query Parameters:**
- `page` (number): Page number for pagination
- `limit` (number): Items per page (max 100)
- `role` (string): Filter by role (Admin, Manager, User)
- `department` (string): Filter by department
- `isActive` (boolean): Filter by active status

**Response:**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    {
      "_id": "userId",
      "username": "john_doe",
      "name": "John Doe",
      "role": "User",
      "department": "IT",
      "employeeId": "EMP001",
      "email": "john@company.com",
      "isActive": true,
      "leaveBalance": 15,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-26T00:00:00.000Z"
    }
  ]
}
```

### Get User by ID
```http
GET /users/:id
```

**Response:** Single user object with same structure as above.

### Create User
```http
POST /users
Content-Type: application/json

{
  "username": "new_user",
  "password": "securePassword123",
  "name": "New User",
  "role": "User",
  "department": "Sales",
  "employeeId": "EMP002",
  "email": "newuser@company.com",
  "phone": "010-1234-5678",
  "hireDate": "2025-01-26"
}
```

**Required Fields:** `username`, `password`, `name`, `role`

### Update User
```http
PUT /users/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "department": "Marketing",
  "email": "updated@company.com",
  "isActive": false
}
```

**Note:** `username` cannot be updated. Password updates require current password verification.

### Delete User
```http
DELETE /users/:id
```

## Leave Requests API

### Get Leave Requests
```http
GET /leave?user_id=userId&status=pending&month=2025-01&page=1&limit=10
```

**Query Parameters:**
- `user_id` (string): Filter by user ID (Admin/Manager only)
- `status` (string): Filter by status (pending, approved, rejected, cancelled)
- `startDate` (date): Filter from date (YYYY-MM-DD)
- `endDate` (date): Filter to date (YYYY-MM-DD)
- `month` (string): Filter by month (YYYY-MM)
- `page`, `limit`: Pagination

**Response:**
```json
{
  "success": true,
  "message": "Leave requests retrieved successfully",
  "data": [
    {
      "_id": "requestId",
      "userId": "userId",
      "startDate": "2025-02-01T00:00:00.000Z",
      "endDate": "2025-02-03T00:00:00.000Z",
      "startDateFormatted": "2025. 02. 01.",
      "endDateFormatted": "2025. 02. 03.",
      "reason": "Personal vacation",
      "daysCount": 3,
      "status": "pending",
      "statusInfo": {
        "label": "대기중",
        "color": "orange",
        "priority": 1
      },
      "isAdvanceUsage": false,
      "advanceDays": 0,
      "user": {
        "_id": "userId",
        "name": "John Doe",
        "department": "IT",
        "employeeId": "EMP001"
      },
      "approver": null,
      "createdAt": "2025-01-26T00:00:00.000Z"
    }
  ]
}
```

### Get Leave Request by ID
```http
GET /leave/:id
```

### Create Leave Request
```http
POST /leave
Content-Type: application/json

{
  "startDate": "2025-02-15",
  "endDate": "2025-02-17",
  "reason": "Family vacation",
  "daysCount": 3
}
```

**Validation Rules:**
- Minimum 3-day advance notice
- Maximum 15 consecutive days
- No conflicting requests
- Sufficient leave balance (allows up to -3 advance usage)

### Update Leave Request
```http
PUT /leave/:id
Content-Type: application/json

{
  "startDate": "2025-02-16",
  "endDate": "2025-02-18",
  "reason": "Updated vacation dates"
}
```

**Note:** Only pending requests can be updated, and only by the requesting user.

### Delete Leave Request
```http
DELETE /leave/:id
```

**Note:** Only pending requests can be deleted.

### Approve/Reject Leave Request
```http
POST /leave/:id/approve
Content-Type: application/json

{
  "approved": true,
  "note": "Approved for vacation time"
}
```

**For Rejection:**
```json
{
  "approved": false,
  "rejectionReason": "Insufficient coverage during requested period"
}
```

**Required Permissions:** `leave:approve` (Manager/Admin only)

### Get Pending Requests
```http
GET /leave/pending
```

**Returns:** All pending leave requests for manager/admin review.

### Get Leave Balance
```http
GET /leave/balance?user_id=userId
```

**Response:**
```json
{
  "success": true,
  "message": "Leave balance retrieved successfully",
  "data": {
    "userId": "userId",
    "userName": "John Doe",
    "currentBalance": 12,
    "totalEntitlement": 15,
    "usedDays": 3,
    "pendingDays": 2,
    "availableBalance": 10,
    "year": 2025
  }
}
```

## Departments API

### Get Departments
```http
GET /departments?isActive=true&page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "message": "Departments retrieved successfully",
  "data": [
    {
      "_id": "deptId",
      "name": "Information Technology",
      "code": "IT",
      "description": "IT Department handling system development",
      "managerId": "managerId",
      "manager": {
        "_id": "managerId",
        "name": "Manager Name"
      },
      "budget": 1000000,
      "location": "Building A, Floor 3",
      "isActive": true,
      "employeeCount": 15,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### Get Department by ID
```http
GET /departments/:id
```

### Create Department
```http
POST /departments
Content-Type: application/json

{
  "name": "Marketing",
  "code": "MKT",
  "description": "Marketing and Communications",
  "managerId": "managerId",
  "budget": 500000,
  "location": "Building B, Floor 2"
}
```

**Required Fields:** `name`, `code`

### Update Department
```http
PUT /departments/:id
Content-Type: application/json

{
  "description": "Updated description",
  "budget": 750000,
  "managerId": "newManagerId"
}
```

### Delete Department
```http
DELETE /departments/:id
```

**Note:** Cannot delete departments with assigned employees.

### Get Department Employees
```http
GET /departments/:id/employees?isActive=true&page=1&limit=10
```

## System APIs

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-26T12:00:00.000Z",
  "uptime": 3600,
  "memory": {
    "rss": 128,
    "heapUsed": 89,
    "heapTotal": 112,
    "external": 45
  },
  "cache": {
    "short": {
      "keys": 25,
      "hits": 150,
      "misses": 30,
      "hitRate": 0.83
    },
    "medium": {
      "keys": 12,
      "hits": 89,
      "misses": 15,
      "hitRate": 0.86
    },
    "long": {
      "keys": 8,
      "hits": 45,
      "misses": 5,
      "hitRate": 0.90
    }
  }
}
```

### Performance Stats
```http
GET /performance/stats
```

**Response:**
```json
{
  "totalRequests": 1250,
  "averageResponseTime": 145,
  "slowestRequests": [
    {
      "url": "/leave?status=pending",
      "duration": 892,
      "timestamp": "2025-01-26T12:00:00.000Z"
    }
  ],
  "errorRate": 2.5,
  "requestsByEndpoint": {
    "/users": 450,
    "/leave": 380,
    "/departments": 120
  },
  "memoryUsage": {
    "rss": 128,
    "heapUsed": 89,
    "heapTotal": 112,
    "external": 45
  },
  "cacheStats": { /* cache statistics */ }
}
```

## Error Codes

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Common Error Messages
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

## Rate Limiting

All API endpoints are rate limited to **100 requests per 15-minute window** per IP address.

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2025-01-26T12:15:00.000Z
```

**Rate Limit Exceeded Response:**
```json
{
  "success": false,
  "message": "Too many requests, please try again later",
  "retryAfter": 900
}
```

## Performance Headers

All API responses include performance headers:

```http
X-Response-Time: 145ms
X-Memory-Usage: 89MB
X-Cache: HIT
```

## Validation Rules

### User Fields
- `username`: 3-50 characters, alphanumeric and underscore only, unique
- `password`: 8-100 characters, must contain letter and number
- `email`: Valid email format, unique
- `employeeId`: Alphanumeric, unique if provided
- `role`: Must be one of: Admin, Manager, User
- `phone`: Korean phone number format (010-XXXX-XXXX)

### Leave Request Fields
- `startDate`, `endDate`: Must be future dates, YYYY-MM-DD format
- `reason`: 1-500 characters
- `daysCount`: Calculated automatically, maximum 15 consecutive days
- Minimum 3-day advance notice required
- No overlapping requests allowed

### Department Fields
- `name`: 1-100 characters, unique
- `code`: 2-10 characters, uppercase, unique
- `budget`: Positive number if provided
- `managerId`: Must be valid user ID with Manager or Admin role

## SDK Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

// Configure base client
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  withCredentials: true, // Important for session cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// Login
const login = async (username, password) => {
  const response = await api.post('/auth/login', { username, password });
  return response.data;
};

// Get users with pagination
const getUsers = async (page = 1, limit = 10, filters = {}) => {
  const params = { page, limit, ...filters };
  const response = await api.get('/users', { params });
  return response.data;
};

// Create leave request
const createLeaveRequest = async (leaveData) => {
  const response = await api.post('/leave', leaveData);
  return response.data;
};
```

### Error Handling
```javascript
// Centralized error handling
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    } else if (error.response?.status === 429) {
      // Rate limited - implement retry logic
      console.warn('Rate limited, retrying after delay...');
    }
    return Promise.reject(error);
  }
);
```

## Testing

### API Testing with curl
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  -c cookies.txt

# Get users (authenticated)
curl -X GET http://localhost:3000/api/users \
  -b cookies.txt

# Create leave request
curl -X POST http://localhost:3000/api/leave \
  -H "Content-Type: application/json" \
  -d '{"startDate":"2025-02-15","endDate":"2025-02-17","reason":"Vacation"}' \
  -b cookies.txt
```

### Postman Collection
Import the provided Postman collection for comprehensive API testing with pre-configured requests, authentication, and test scenarios.

## Changelog

### Version 2.0.0 (Current)
- Refactored with Repository pattern
- Standardized response formats
- Enhanced error handling
- Performance optimizations
- Comprehensive validation
- Rate limiting implementation
- MongoDB replica set support

### Version 1.x.x (Legacy)
- Basic CRUD operations
- Session authentication
- Simple validation