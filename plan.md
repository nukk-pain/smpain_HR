# Plan: Team Leave Status Visibility Settings

## Overview
Implement a feature that allows admins to configure which teams a manager can view in the Team Leave Status page. This will be managed through the User Management page.

**Note**: Since Team Leave Status page is only accessible to Managers and Admins (as per pages_new.md), regular users cannot access this page at all. This feature only applies to managers who need to see teams outside their own department.

## Changes Required

### 1. Database Schema Update
- Add a new field to the `users` collection:
  ```javascript
  visibleTeams: [{
    departmentId: ObjectId,
    departmentName: String
  }]
  ```
- If empty array or undefined, managers cannot see others leave status including their own department
- Admins always see all teams regardless of this setting

### 2. Backend Changes

#### 2.1 User Model Update
- File: `backend/models/User.js`
- Add `visibleTeams` field to schema

#### 2.2 User Routes Update
- File: `backend/routes/users.js`
- Modify PUT `/api/users/:id` to accept and update `visibleTeams`
- Add validation to ensure only admins can modify this field

#### 2.3 Team Leave Status Route Update
- File: `backend/routes/leave/leaveCalendar.js` or create new route
- Modify `/api/leave/team-status` endpoint to:
  - Check user's role first (must be manager or admin)
  - For managers: return ONLY teams listed in their `visibleTeams` array (no default access to own department)
  - For admins: return all teams (ignore visibleTeams)

### 3. Frontend Changes

#### 3.1 Type Updates
- File: `frontend/src/types/index.ts`
- Add `visibleTeams` to User interface:
  ```typescript
  interface User {
    // ... existing fields
    visibleTeams?: {
      departmentId: string;
      departmentName: string;
    }[];
  }
  ```

#### 3.2 User Management Page Update
- File: `frontend/src/components/UserManagement.tsx`
- Add a new section in user edit dialog for "Team Visibility Settings"
- Create multi-select component to choose departments
- Only show this section for admin users
- Include options:
  - "No access" (default - empty visibleTeams array)
  - Select specific departments to grant access
  - Note: Managers need explicit permission to see any team's leave status

#### 3.3 Team Leave Status Page Update
- File: `frontend/src/pages/TeamLeaveStatus.tsx`
- Update to use the new permissions from backend
- Show appropriate team filters based on user's visibleTeams

### 4. Implementation Steps

1. **Step 1: Database & Model**
   - Update User model with visibleTeams field
   - Create migration script if needed

2. **Step 2: Backend API**
   - Update user update endpoint
   - Create/modify team status endpoint with permission checks

3. **Step 3: Frontend Types**
   - Update TypeScript interfaces

4. **Step 4: User Management UI**
   - Add team visibility settings to user edit form
   - Implement department multi-select

5. **Step 5: Team Leave Status**
   - Update page to respect new permissions
   - Test with different user roles

### 5. Testing Scenarios

1. **Admin Tests**
   - Can set team visibility for any user (focus on managers)
   - Can view all teams regardless of settings

2. **Manager Tests**
   - Cannot modify team visibility settings
   - Can ONLY see teams explicitly assigned in visibleTeams
   - Without visibleTeams set: cannot see any team's leave status (including own department)

3. **User Tests**
   - Cannot access Team Leave Status page at all (route protected)
   - Can only see their own leave information on personal leave page

### 6. Security Considerations

- Ensure only admins can modify visibleTeams field
- Validate departmentIds exist in database
- Prevent users from accessing team data they shouldn't see
- Add audit logging for visibility changes

### 7. UI/UX Considerations

- Clear labeling in User Management page
- Help text explaining the feature
- Visual indication of which teams are visible
- Bulk edit option for multiple users