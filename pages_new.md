# HR System Pages Overview

## Role-Based Access Control (RBAC)

The system has three user roles:
- **Admin**: Full system access
- **Manager**: Department/team management access
- **User**: Basic employee access

## Pages and Access Permissions

### 1. Public Pages (No Authentication Required)

| Page | Path | Description |
|------|------|-------------|
| Login | `/login` | User login page |

### 2. All Authenticated Users (User, Manager, Admin)

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/dashboard` | Main dashboard (content varies by role) |
| User Profile | `/profile` | Personal profile management |
| Leave Management | `/leave` | Personal leave requests and history |
| Leave Calendar | `/leave-calendar` | Calendar view of leaves |

### 3. Manager & Admin Only

| Page | Path | Description |
|------|------|-------------|
| Team Leave Status | `/team-leave-status` | Team leave overview |
| Employee Leave Management | `/employee-leave` | Manage employee leave requests |

### 4. Admin Only

| Page | Path | Description |
|------|------|-------------|
| Payroll Management | `/payroll` | Payroll processing and management |
| Leave Overview | `/admin/leave-overview` | System-wide leave overview |
| Leave Policy | `/admin/leave-policy` | Configure leave policies |
| User Management | `/users` | Create and manage user accounts |
| Department Management | `/departments` | Manage departments |
| Reports | `/reports` | Generate various reports |
| File Management | `/files` | File upload and management |

## Dashboard Content by Role

- **Admin**: Shows UnifiedDashboard component with system-wide statistics
- **Manager**: Shows UserDashboard component with manager-focused information
- **User**: Shows UserDashboard component with personal information

## Access Control Implementation

1. **Route Protection**: Uses `ProtectedRoute` component to enforce role-based access
2. **Authentication Check**: Redirects to `/login` if not authenticated
3. **Role Validation**: Redirects to `/dashboard` if user lacks required role
4. **Component-Level Checks**: Some components have additional role validation

## Notes

- All authenticated pages are wrapped in the Layout component
- Session-based authentication via backend API
- File locations: All page components are in `frontend/src/pages/`
- Route definitions: `frontend/src/App.tsx`