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
| Leave Calendar | `/leave/calendar` | Calendar view of leaves |

### 3. Supervisor & Admin Only

| Page | Path | Description |
|------|------|-------------|
| Team Leave Status | `/supervisor/leave/status` | Team leave overview |
| Employee Leave Management | `/supervisor/leave/requests` | Manage employee leave requests |
| User Management | `/supervisor/users` | Manage team members and employees |
| Department Management | `/supervisor/departments` | Manage department information |
| Payroll Management | `/supervisor/payroll` | Process and manage payroll |
| Reports | `/supervisor/reports` | Generate team and department reports |
| File Management | `/supervisor/files` | Upload and manage files |

### 4. Admin Only

| Page | Path | Description |
|------|------|-------------|
| User Management | `/admin/users` | Create and manage all user accounts |
| Department Management | `/admin/departments` | Manage all departments |
| Payroll Management | `/admin/payroll` | System-wide payroll processing and management |
| Reports | `/admin/reports` | Generate system-wide reports |
| File Management | `/admin/files` | Upload and manage all files |
| Leave Overview | `/admin/leave/overview` | System-wide leave overview |
| Leave Policy | `/admin/leave/policy` | Configure leave policies |

## Legacy URL Support & Redirects

For backward compatibility, the following legacy URLs automatically redirect to the new structure:

### Simple Redirects
| Legacy URL | Redirects To | Description |
|------------|--------------|-------------|
| `/leave-calendar` | `/leave/calendar` | Calendar view redirect |
| `/employee-leave-status` | `/supervisor/leave/status` | Team status redirect |
| `/employee-leave` | `/supervisor/leave/requests` | Employee leave redirect |
| `/admin/leave-overview` | `/admin/leave/overview` | Admin overview redirect |
| `/admin/leave-policy` | `/admin/leave/policy` | Admin policy redirect |

### Role-Based Dynamic Redirects
| Legacy URL | Supervisor Redirect | Admin Redirect | Description |
|------------|-------------------|----------------|-------------|
| `/users` | `/supervisor/users` | `/admin/users` | Role-based user management |
| `/departments` | `/supervisor/departments` | `/admin/departments` | Role-based dept management |
| `/payroll` | `/supervisor/payroll` | `/admin/payroll` | Role-based payroll access |
| `/reports` | `/supervisor/reports` | `/admin/reports` | Role-based reports access |
| `/files` | `/supervisor/files` | `/admin/files` | Role-based file management |

**Note**: All redirects use `replace` navigation to prevent browser history pollution.

## URL Structure Principles

The new URL structure follows these patterns:

### 1. Hierarchical Organization
- **Public routes**: No prefix (e.g., `/dashboard`, `/profile`, `/leave`)
- **Supervisor routes**: `/supervisor/*` prefix for supervisor-level access
- **Admin routes**: `/admin/*` prefix for admin-only access

### 2. Nested Paths for Related Features
- Leave management: `/admin/leave/overview`, `/admin/leave/policy`
- Supervisor leave: `/supervisor/leave/status`, `/supervisor/leave/requests`

### 3. Clear Role Separation
- Same functionality accessible via different URLs based on role
- Admin users can access both `/supervisor/*` and `/admin/*` paths
- Supervisor users can only access `/supervisor/*` paths
- Regular users only access public routes

### 4. SEO and UX Benefits
- Intuitive URL structure for bookmarking and sharing
- Clear access level indication in URL
- Deep linking support for all routes
- Browser back/forward navigation works correctly

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