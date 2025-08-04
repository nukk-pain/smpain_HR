# HR System Pages Overview

## Role-Based Access Control (RBAC)

The system has three user roles:
- **Admin**: Full system access
- **Supervisor**: Department/team management access (formerly Manager)
- **User**: Basic employee access

## Pages and Access Permissions

### 1. Public Pages (No Authentication Required)

| Page | Path | Description |
|------|------|-------------|
| Login | `/login` | User login page |

### 2. All Authenticated Users (User, Supervisor, Admin)

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/dashboard` | Main dashboard (content varies by role) |
| User Profile | `/profile` | Personal profile management |
| Leave Management | `/leave` | Personal leave requests and history |
| Leave Calendar | `/leave-calendar` | Calendar view of leaves |

### 3. Supervisor & Admin Only

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
- **Supervisor**: Shows UserDashboard component with supervisor-focused information
- **User**: Shows UserDashboard component with personal information

## Access Control Implementation

1. **Route Protection**: Uses `ProtectedRoute` component to enforce role-based access
2. **JWT Authentication Check**: Redirects to `/login` if no valid JWT token
3. **Token Validation**: Verifies JWT token with backend before allowing access
4. **Role Validation**: Redirects to `/dashboard` if user lacks required role
5. **Component-Level Checks**: Some components have additional role validation
6. **Automatic Logout**: Redirects to login if JWT token expires or is invalid

## Notes

- All authenticated pages are wrapped in the Layout component
- **JWT token-based authentication** via backend API (migrated from sessions Aug 2025)
- **JWT tokens stored in localStorage** - no cookies needed
- **Authorization headers** required for all API calls: `Authorization: Bearer <token>`
- **Automatic token refresh** available (Phase 4 feature)
- **Cross-domain compatible** - works with Vercel frontend + Cloud Run backend
- File locations: All page components are in `frontend/src/pages/`
- Route definitions: `frontend/src/App.tsx`