# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an HR management system with payroll functionality, built with Node.js Express backend and React TypeScript frontend. The system handles employee leave tracking, payroll calculations with incentives, and user management with role-based access control.

## Quick Start Commands

### Development
```bash
# Start both servers (Linux/WSL/macOS)
./start-simple.sh

# Windows
start.bat

# Manual start
cd backend && node server.js
cd frontend && npx vite
```

### Frontend Commands
```bash
cd frontend
npm run dev         # Start development server
npm run build       # Build for production (TypeScript + Vite)
npm run preview     # Preview production build
```

### Backend Commands
```bash
cd backend
npm start           # Start production server
npm run dev         # Start with nodemon for development
```

## Architecture

### Backend (`backend/`)
- **Framework**: Node.js with Express
- **Database**: MongoDB (development: localhost:27017, production: 192.168.0.30:27017)
- **Database Name**: `SM_nomu`
- **Authentication**: Session-based with bcryptjs
- **Port**: 5455
- **Architecture**: Modularized with separated route handlers

#### Backend Structure (Recently Refactored)
```
backend/
├── server.js (257 lines - main server setup)
├── routes/
│   ├── auth.js (authentication endpoints)
│   ├── users.js (user management endpoints)
│   ├── leave.js (leave management endpoints)
│   ├── payroll.js (payroll system endpoints)
│   ├── departments.js (department management endpoints)
│   ├── bonus.js (bonus and award management)
│   ├── sales.js (sales data endpoints)
│   ├── upload.js (file upload handling)
│   ├── reports.js (analytics and reporting)
│   └── admin.js (admin-specific endpoints)
├── controllers/ (prepared for future use)
├── utils/ (prepared for future use)
└── middleware/
    ├── errorHandler.js (error handling, auth, security)
    ├── security.js (security headers)
    └── validation.js (input validation)
```

### Frontend (`frontend/`)
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **Data Grid**: AG Grid Community
- **State Management**: React Context for auth and notifications
- **Port**: 3727 (dev server)

## Core Features & Implementation Status

### ✅ **Implemented Features (Phase 1 & 2 Complete)**
1. **User Management**: Role-based access (admin/manager/user) with granular permissions
2. **Leave Management**: Complete CRUD operations with approval workflow
3. **Payroll System**: Base salary, incentives, bonuses, and awards with AG Grid editing
4. **Leave Calendar**: Monthly calendar view with team visibility
5. **Team Leave Status**: Team statistics and department-level analytics
6. **Permission System**: Fine-grained permissions for different user roles
7. **Dashboard**: Role-based dashboards (admin gets unified dashboard, others get personal dashboard)

### 🔄 **Phase 2 Features (In Progress)**
- **Statistics & Reporting**: Advanced leave analytics and reporting
- **Notification System**: In-app notifications for leave status changes

### Frontend Component Architecture

#### Core Components
- **AuthProvider**: Session management and authentication state
- **NotificationProvider**: Toast notifications and messaging
- **Layout**: Main navigation and layout with permission-based menu filtering
- **LeaveCalendar**: Monthly calendar view with leave visualization
- **TeamLeaveStatus**: Team leave analytics and department statistics
- **UnifiedDashboard**: Admin/manager dashboard with comprehensive stats
- **UserDashboard**: Personal dashboard for regular users

#### Page Components
- **LeaveManagement**: Leave request form, approval interface, and history
- **LeaveCalendarPage**: Calendar view wrapper
- **TeamLeaveStatusPage**: Team status with toggle between team/department views
- **UserManagementPage**: User CRUD operations
- **PayrollManagement**: Payroll calculations and AG Grid integration

### Database Collections
- **`users`**: User accounts with roles and permissions
- **`leaveRequests`**: Leave requests with approval workflow
- **`monthly_payments`**: Payroll data
- **`bonuses`**: Bonus and award records
- **`sales_data`**: Sales data for incentive calculations
- **`departments`**: Department information
- **`positions`**: Position/role definitions

## Permission System

### Role-Based Access Control
- **Admin**: Full system access including user management and system configuration
- **Manager**: Employee management and leave approval (no payroll access by default)
- **User**: Personal leave management and viewing own data

### Permission Categories
- `users:view`, `users:manage`: User management permissions
- `leave:view`, `leave:manage`: Leave management permissions
- `payroll:view`, `payroll:manage`: Payroll system permissions
- `reports:view`: Report generation permissions
- `files:view`, `files:manage`: File management permissions
- `departments:view`, `departments:manage`: Department management permissions
- `admin:permissions`: Permission management (admin only)

## API Architecture

### Base URL: `http://localhost:5455/api`

### Route Structure
- **`/auth`**: Authentication endpoints (login, logout, password change)
- **`/users`**: User management (CRUD, permissions, statistics)
- **`/leave`**: Leave management (CRUD, approvals, calendar, team status)
- **`/payroll`**: Payroll calculations and management
- **`/reports`**: Report generation and analytics
- **`/departments`**: Department and position management
- **`/bonus`**: Bonus and award management
- **`/sales`**: Sales data management
- **`/upload`**: File upload handling
- **`/admin`**: Admin-specific operations

### Key API Endpoints
```
# Authentication
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/change-password

# Leave Management
POST /api/leave                     # Create leave request
GET /api/leave                      # Get leave requests
PUT /api/leave/:id                  # Update leave request
DELETE /api/leave/:id               # Delete leave request
POST /api/leave/:id/approve         # Approve/reject leave
GET /api/leave/balance              # Get leave balance
GET /api/leave/calendar/:month      # Monthly calendar data
GET /api/leave/team-calendar/:month # Team calendar data
GET /api/leave/team-status          # Team leave statistics
POST /api/leave/carry-over/:year    # Process year-end carry-over (admin only)

# User Management
GET /api/users                      # Get all users
POST /api/users                     # Create user
PUT /api/users/:id                  # Update user
DELETE /api/users/:id               # Delete user
GET /api/users/:id/permissions      # Get user permissions
PUT /api/users/:id/permissions      # Update user permissions
```

## Business Rules

### Leave Calculation Rules
- **0 Year (First Year)**: 1 day per month since hire date, maximum 11 days
- **1st+ Years**: 15 days + (years of service - 1), maximum 25 days
- **Carry-over Policy**: Maximum 15 days unused leave can be carried over to next year
- **Saturday Leave**: Counts as 0.5 days
- **Sunday Leave**: Counts as 0 days (not allowed)

### Approval Workflow
1. **User** submits leave request
2. **Manager** reviews and approves/rejects (if has `leave:manage` permission)
3. **Admin** has final approval authority

### Special Rules
- Employee ID auto-generation: EMP001, EMP002, etc.
- Admin users excluded from leave statistics
- Permission-based UI filtering (payroll hidden from managers without payroll permissions)

## Environment Configuration

### Development
- MongoDB: `mongodb://localhost:27017`
- Backend: `http://localhost:5455`
- Frontend: `http://localhost:3727`

### Production (Synology Docker)
- MongoDB: `mongodb://localhost:27018` (Docker container: `mongo-hr`)
- MongoDB User: `hr_app_user`
- MongoDB Password: `Hr2025Secure`
- Connection String: `mongodb://hr_app_user:Hr2025Secure@localhost:27018/SM_nomu?authSource=SM_nomu`

## Default Credentials
- Username: `admin`
- Password: `admin`

## Key Implementation Details

### Authentication Flow
- Session-based authentication with bcryptjs password hashing
- Role-based access control with granular permissions
- AuthProvider component manages authentication state across the application

### Date Handling
- Uses `date-fns` for date formatting and calculations
- Business day calculations exclude weekends with Saturday as 0.5 days
- ISO date format (YYYY-MM-DD) for consistency

### UI/UX Patterns
- Material-UI components with consistent theming
- AG Grid for complex data editing (payroll)
- Toast notifications for user feedback
- Permission-based navigation menu filtering
- Responsive design for mobile compatibility

### Database Design
- MongoDB with proper indexing on `userId`, `status`, `startDate`
- ObjectId references for user relationships
- Embedded user information (name, department) for performance

## Development Notes

### Code Organization
- Backend recently refactored from 5,155 lines to modular 257-line server with separated route handlers
- Frontend uses TypeScript with strict type checking
- Centralized API service layer for consistent HTTP handling
- Reusable components with proper prop interfaces

### Error Handling
- Comprehensive error handling with user-friendly messages
- API validation with proper HTTP status codes
- Frontend error boundaries and graceful degradation

### Performance Considerations
- Database queries optimized with proper indexing
- Pagination for large datasets
- Efficient calendar data loading with month-based queries
- Memoization for expensive calculations

## Testing

### Current Testing Approach
- **Test Documentation**: `TEST_GUIDE.md` provides comprehensive manual testing procedures
- **No Automated Tests**: Currently relies on manual testing for validation
- **Test Categories**:
  - Backend API endpoint validation
  - Frontend UI component testing
  - Integration workflow testing
  - Role-based access control testing
  - Database validation and error handling

### Manual Testing Commands
```bash
# No automated test commands available
# Refer to TEST_GUIDE.md for manual testing procedures
```

## Build and Deployment

### Production Configuration
- **PM2 Process Manager**: Uses `ecosystem.config.js` for process management
- **Environment**: Synology NAS deployment target
- **Port**: 5455 (updated from previous 5445)
- **Memory Limits**: Backend 500MB, Frontend 200MB

### Build Commands
```bash
# Frontend production build
cd frontend && npm run build

# TypeScript validation
cd frontend && npm run build-check
```

### File Upload Support
- **Supported Formats**: .xlsx, .xls, .csv
- **Size Limit**: 10MB
- **Processing Library**: ExcelJS for payroll data import
- **Upload Endpoint**: `/api/upload` route handles file processing

## MongoDB Deployment Troubleshooting

### Common Connection Issues

#### Authentication Failed Error
If you encounter "Authentication failed" errors during deployment:

1. **Check MongoDB Container Status**:
   ```bash
   docker ps | grep mongo-hr
   ```

2. **Verify/Recreate MongoDB User**:
   ```bash
   docker exec -it mongo-hr mongosh SM_nomu
   ```
   ```javascript
   // In MongoDB shell
   db.dropUser("hr_app_user")
   db.createUser({
     user: "hr_app_user",
     pwd: "Hr2025Secure",
     roles: [{ role: "readWrite", db: "SM_nomu" }]
   })
   ```

3. **Test Connection Manually**:
   ```bash
   docker run -it --rm --network host mongo:latest mongosh --host localhost --port 27018 -u hr_app_user -p 'Hr2025Secure' --authenticationDatabase SM_nomu
   ```

4. **Verify ecosystem.config.js Configuration**:
   - Ensure connection string includes database name and authSource
   - Format: `mongodb://hr_app_user:Hr2025Secure@localhost:27018/SM_nomu?authSource=SM_nomu`

5. **Restart PM2 Process**:
   ```bash
   pm2 delete hr-backend
   pm2 start ecosystem.config.js --only hr-backend
   ```

### Production MongoDB Setup (Synology Docker)

#### Docker Container Configuration
- **Container Name**: `mongo-hr`
- **Port Mapping**: `27018:27017`
- **Database**: `SM_nomu`

#### Required Environment Variables in ecosystem.config.js
```javascript
env: {
  NODE_ENV: 'production',
  MONGODB_URL: 'mongodb://hr_app_user:Hr2025Secure@localhost:27018/SM_nomu?authSource=SM_nomu',
  MONGODB_USER: 'hr_app_user',
  MONGODB_PASSWORD: 'Hr2025Secure',
  DB_NAME: 'SM_nomu'
}
```

#### User Creation Script
```javascript
// Execute in MongoDB container
use SM_nomu
db.createUser({
  user: "hr_app_user",
  pwd: "Hr2025Secure",
  roles: [
    { role: "readWrite", db: "SM_nomu" }
  ]
})
```