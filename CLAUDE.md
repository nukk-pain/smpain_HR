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
- **Port**: 5445
- **Architecture**: Modularized with separated route handlers

#### Backend Structure (Recently Refactored)
```
backend/
├── server.js (257 lines - main server setup)
├── routes/
│   ├── auth.js (authentication endpoints)
│   ├── users.js (user management endpoints)
│   └── leave.js (leave management endpoints)
├── controllers/ (prepared for future use)
├── utils/ (prepared for future use)
└── middleware/
    └── errorHandler.js
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

### Base URL: `http://localhost:5445/api`

### Route Structure
- **`/auth`**: Authentication endpoints (login, logout, password change)
- **`/users`**: User management (CRUD, permissions, statistics)
- **`/leave`**: Leave management (CRUD, approvals, calendar, team status)
- **`/payroll`**: Payroll calculations and management
- **`/reports`**: Report generation and analytics
- **`/departments`**: Department and position management

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
- **1st Year**: 11 days annual leave
- **2nd+ Years**: 15 days + (years of service - 1), maximum 25 days
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
- Backend: `http://localhost:5445`
- Frontend: `http://localhost:3727`

### Production
- MongoDB: `mongodb://192.168.0.30:27017`

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