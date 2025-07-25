# HR System API Documentation

## Base URL
- Development: `http://localhost:5455/api`
- Production: `https://[your-domain]/api`

## Authentication
All endpoints require authentication unless specified otherwise. Authentication is session-based using cookies.

### Auth Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/login` | User login | No |
| POST | `/auth/logout` | User logout | Yes |
| GET | `/auth/me` | Get current user | Yes |
| POST | `/auth/change-password` | Change password | Yes |

## User Management

### User CRUD Operations
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/users/` | Get all users | users:view |
| GET | `/users/:id` | Get specific user | users:view |
| POST | `/users/` | Create new user | users:manage |
| PUT | `/users/:id` | Update user | users:manage |
| PUT | `/users/profile/:id` | Update user profile (limited fields) | Own profile only |
| DELETE | `/users/:id` | Delete user | users:delete |
| POST | `/users/:id/activate` | Activate user account | users:manage |
| POST | `/users/:id/reset-password` | Reset user password | users:manage |

### User Permissions
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/users/:id/permissions` | Get user permissions | admin:permissions |
| PUT | `/users/:id/permissions` | Update user permissions | admin:permissions |

### User Statistics
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/users/stats/overview` | Get user statistics | users:view |

## Leave Management

### Leave Requests
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/leave/` | Get leave requests | Own or leave:view |
| GET | `/leave/:id` | Get specific leave request | Own or leave:view |
| POST | `/leave/` | Create leave request | Authenticated |
| PUT | `/leave/:id` | Update leave request | Own (pending only) |
| DELETE | `/leave/:id` | Delete leave request | Own (pending only) |

### Leave Approval
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/leave/:id/approve` | Approve/reject leave | leave:manage |
| GET | `/leave/pending` | Get pending requests | leave:manage |

### Leave Cancellation
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/leave/:id/cancel` | Request cancellation | Own (approved only) |
| GET | `/leave/cancellations/pending` | Get pending cancellations | leave:manage |
| GET | `/leave/cancellations/history` | Get cancellation history | Authenticated |

### Leave Balance
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/leave/balance/:userId?` | Get leave balance | Own or leave:view |

### Leave Calendar & Reports
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/leave/calendar/:month` | Get monthly calendar | leave:view |
| GET | `/leave/department-stats` | Department statistics | leave:view |
| GET | `/leave/employee/:id/log` | Employee leave log | leave:view |

## Department Management

### Department Operations
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/departments/` | Get all departments | departments:view |
| POST | `/departments/` | Create department | departments:manage |
| PUT | `/departments/:id` | Update department | departments:manage |
| DELETE | `/departments/:id` | Delete department | departments:manage |
| GET | `/departments/:name/employees` | Get department employees | departments:view |

## Position Management

### Position Operations
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/positions/` | Get all positions | Authenticated |
| GET | `/positions/:id` | Get specific position | Authenticated |
| POST | `/positions/` | Create position | departments:manage |
| PUT | `/positions/:id` | Update position | departments:manage |
| DELETE | `/positions/:id` | Delete position | departments:manage |
| GET | `/positions/department/:dept` | Get positions by department | Authenticated |

## Payroll Management

### Monthly Payroll
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/payroll/monthly/:year_month` | Get monthly payroll | payroll:view |
| POST | `/payroll/monthly` | Create/update payroll | payroll:manage |
| GET | `/payroll/employee/:userId` | Get employee payroll history | Own or payroll:view |
| GET | `/payroll/stats/:yearMonth` | Get payroll statistics | payroll:view |

### Sales Data
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/sales/:year_month` | Get sales data | payroll:view |
| POST | `/sales/` | Create sales record | payroll:manage |
| PUT | `/sales/:id` | Update sales record | payroll:manage |
| DELETE | `/sales/:id` | Delete sales record | payroll:manage |
| GET | `/sales/user/:userId` | Get user sales history | Own or payroll:view |
| GET | `/sales/stats/:yearMonth` | Get sales statistics | payroll:view |

### Bonus Management
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/bonus/:year_month` | Get bonuses for month | payroll:view |
| POST | `/bonus/` | Create bonus | payroll:manage |
| PUT | `/bonus/:id` | Update bonus | payroll:manage |
| DELETE | `/bonus/:id` | Delete bonus | payroll:manage |
| GET | `/bonus/user/:userId` | Get user bonus history | Own or payroll:view |

## Reports

### Report Generation
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/reports/payroll/:year_month` | Get payroll report | reports:view |
| GET | `/reports/payroll/:year_month/excel` | Download payroll Excel | reports:view |
| GET | `/reports/leave/:year_month` | Get leave report | reports:view |
| GET | `/reports/template/payroll` | Download payroll template | reports:view |

## Admin Functions

### System Administration
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/admin/stats/system` | System statistics | admin:* |
| GET | `/admin/leave/overview` | Leave system overview | leave:manage |
| POST | `/admin/leave/adjust` | Adjust employee leave | leave:manage |
| GET | `/admin/leave/employee/:id` | Employee leave details | leave:manage |
| GET | `/admin/leave/bulk-pending` | Bulk pending requests | leave:manage |
| POST | `/admin/leave/bulk-approve` | Bulk approve/reject | leave:manage |

### Policy Management
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/admin/policy` | Get leave policy | leave:view |
| PUT | `/admin/policy` | Update leave policy | admin:* |
| GET | `/admin/policy/history` | Policy change history | admin:* |

## System Endpoints

### Utility Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/permissions` | Get available permissions | admin:permissions |
| GET | `/organization-chart` | Get organization structure | Yes |

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Data Formats

### Dates
- All dates should be in ISO 8601 format: `YYYY-MM-DD`
- Year-month parameters: `YYYY-MM`

### Pagination
For endpoints that support pagination:
```
GET /endpoint?page=1&limit=20&sort=createdAt&order=desc
```

### Filtering
Many GET endpoints support filtering:
```
GET /users/?department=IT&isActive=true
GET /leave/?status=pending&leaveType=annual
```

## Permission System

The system uses role-based access control with the following permission categories:
- `leave:view`, `leave:manage` - Leave management
- `users:view`, `users:manage`, `users:delete` - User management
- `payroll:view`, `payroll:manage` - Payroll access
- `reports:view` - Report generation
- `departments:view`, `departments:manage` - Department management
- `admin:*` - Full admin access
- `admin:permissions` - Permission management

## Rate Limiting

Production endpoints implement rate limiting:
- Authentication endpoints: 5 requests per minute
- API endpoints: 100 requests per minute per user

## Debug Endpoints (Development Only)

These endpoints are only available when `NODE_ENV !== 'production'`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/debug/permissions` | Check current user permissions |
| POST | `/users/debug/fix-admin` | Fix admin permissions |
| POST | `/users/debug/login-admin` | Emergency admin login |
| POST | `/users/debug/fix-employee-ids` | Fix employee ID issues |

## Changelog

### Version 1.1.0 (Current)
- Added user activation and password reset endpoints
- Fixed API consistency issues
- Added production protection for debug endpoints
- Improved leave cancellation workflow
- Standardized API response formats

### Version 1.0.0
- Initial API implementation
- Basic CRUD operations for all entities
- Session-based authentication
- Role-based permissions