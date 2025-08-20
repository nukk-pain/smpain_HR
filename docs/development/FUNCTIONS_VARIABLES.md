# Functions and Variables Reference

This document maintains a registry of all functions and variables in the HR system to prevent duplication and encourage reuse.

## Document Type Management Functions

### Configuration (`frontend/src/config/documentTypes.ts`)

#### Constants
- `DOCUMENT_TYPES` - Object containing document type constants (PAYSLIP, CERTIFICATE, CONTRACT, OTHER)
- `DOCUMENT_TYPE_LABELS` - Maps internal type codes to Korean labels

#### Functions
- `getDocumentTypeLabel(type: string): string` - Returns Korean label for document type, or original type if not found
  - Used in: AdminDocuments.tsx (line 423), can be used in MyDocuments.tsx
  - Purpose: Translates internal document type codes (e.g., 'payslip') to user-friendly Korean labels (e.g., '급여명세서')
  - Note: When adding new document types or changing labels, update this config file only

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

## PayrollGrid Column Customization Functions

### Component (`frontend/src/components/PayrollGrid.tsx`)

#### State Management
- `visibleColumns: Record<string, boolean>` - Stores column visibility state, persisted in localStorage
- `columnSettingsAnchor: HTMLElement | null` - Anchor element for column settings menu

#### Functions
- `handleColumnVisibilityChange(columnField: string, visible: boolean)` - Updates column visibility and saves to localStorage
  - Purpose: Toggles individual column visibility and persists user preference
  - Updates visibleColumns state and localStorage key 'payrollGridVisibleColumns'
  
- `handleColumnSettingsClick(event: React.MouseEvent<HTMLElement>)` - Opens column settings menu
  - Purpose: Shows the column customization dropdown menu
  
- `handleColumnSettingsClose()` - Closes column settings menu
  - Purpose: Hides the column customization dropdown menu

#### Column Filtering
- `allColumns` - Complete list of all available columns (useMemo)
- `columns` - Filtered list of visible columns based on visibleColumns state (useMemo)
  - Always includes 'actions' column regardless of visibility settings

#### UI Components
- Column Settings Button - Shows Settings icon, opens customization menu
- Column Settings Menu - Material-UI Menu with:
  - Checkbox list for each column
  - "모두 표시" (Show All) button
  - "필수만 표시" (Show Essential Only) button - keeps employeeName, base_salary, input_total, actual_payment

#### LocalStorage
- Key: `payrollGridVisibleColumns`
- Value: JSON object with column field names as keys and boolean visibility as values
- Default: All columns visible on first load

### Print Functions (`frontend/src/components/PayrollGrid.tsx`)

#### Functions
- `handlePrint()` - Handles printing functionality with expandable section management
  - Purpose: Prepares grid for printing and triggers browser print dialog
  - Saves current expand state before printing
  - Expands all allowances and deductions sections
  - Clears editing state to prevent input fields in print
  - Restores original state after printing
  - Uses setTimeout to ensure state updates before printing

#### Print CSS
- Print-specific styles defined in `<style data-print-styles>` tag
- Key features:
  - Hides buttons, checkboxes, and footer elements
  - Disables virtualization to show all rows
  - Forces expanded sections to be visible
  - Sets landscape A4 page format
  - Preserves background colors with print-color-adjust
  - Adjusts font sizes for readability

### PrintPreviewDialog Component (`frontend/src/components/PrintPreviewDialog.tsx`)

#### Props
- `open: boolean` - Dialog visibility state
- `onClose: () => void` - Close dialog handler
- `onPrint: (options: PrintOptions) => void` - Print handler with options
- `totalEmployees: number` - Total employee count
- `totalPayment: number` - Total payment amount
- `selectedCount: number` - Selected rows count
- `yearMonth: string` - Current year-month display

#### PrintOptions Interface
- `selectedOnly: boolean` - Print only selected rows
- `currentPageOnly: boolean` - Print only current page (for pagination)
- `includeHeader: boolean` - Include page header
- `includeFooter: boolean` - Include page footer
- `includeSummary: boolean` - Include summary statistics
- `watermark: string` - Watermark text (CONFIDENTIAL, DRAFT, INTERNAL, or empty)
- `orientation: 'portrait' | 'landscape'` - Page orientation
- `colorMode: 'color' | 'grayscale' | 'highContrast'` - Print color mode
- `fontSize: 'small' | 'normal' | 'large'` - Font size option
- `includeBackgrounds: boolean` - Include cell background colors

#### Functions
- `handlePrintClick()` - Opens print preview dialog
- `handlePrint(options: PrintOptions)` - Processes print with selected options
  - Applies CSS classes based on options
  - Filters data if selectedOnly is true
  - Manages expandable sections
  - Handles cleanup after printing

## Unified Leave Overview Functions

### Component (`frontend/src/components/UnifiedLeaveOverview.tsx`)

#### State Management
- `loadLeaveData()` - Role-based data loading for Admin/Supervisor
  - Admin: Can load overview, team, and department data
  - Supervisor: Can load team and department data only
  - Automatically called on viewMode, department, year, or role changes
  
- `getStatusColor(status)` - Returns MUI color for leave request status
  - pending→warning, approved→success, rejected→error, default→default
  
- `getStatusLabel(status)` - Returns Korean label for leave request status
  - pending→대기중, approved→승인됨, rejected→거부됨

#### View Mode Management
- `renderViewModeSelector()` - Renders toggle buttons based on user role
  - Admin: Shows 3 buttons (전체 현황, 팀 현황, 부서 통계)
  - Supervisor: Shows 2 buttons (팀 현황, 부서 통계)
  
- `renderContent()` - Renders appropriate content based on selected view mode
  - Routes to renderAdminOverview(), renderTeamView(), or renderDepartmentView()

#### Admin-specific Functions
- `renderAdminOverview()` - Renders admin dashboard with summary cards and employee table
- `getFilteredEmployees()` - Filters and sorts employee list based on search, department, and risk level
- `handleAdjustLeave(employeeId, employeeName)` - Opens leave adjustment dialog (admin only)
- `handleExportExcel()` - Placeholder for Excel export functionality
- `handleViewModeChange(event, newMode)` - Handles view mode toggle button changes

#### Team/Supervisor Functions
- `renderTeamView()` - Renders team member cards with leave status
- `renderDepartmentView()` - Renders department statistics table
- `handleMemberClick(member)` - Opens team member detail dialog
- `handleViewDetail(member)` - Loads and displays employee leave log
- `handleCloseDetail()` - Closes employee detail dialog and resets state
- `handleAdjustmentComplete()` - Callback after leave adjustment, refreshes data

#### Utility Functions
- `getLeaveTypeLabel(type)` - Translates leave type to Korean
  - annual→연차, half→반차, sick→병가, special→특별휴가, unpaid→무급휴가
- `getLeaveUsageColor(percentage)` - Returns color based on usage percentage
  - ≥80%→error, ≥50%→warning, <50%→success

#### Additional Render Functions
- `renderOverviewView()` - Renders admin overview with summary cards and employee table (Admin only)
  - Shows total employees, average usage rate, pending requests
  - Includes filtering, sorting, and Excel export options
- `renderTeamView()` - Renders team member cards with leave status
  - Shows member profile, leave balance, and current status
  - Supports department filtering and year selection
- `renderDepartmentView()` - Renders department statistics in card format
  - Shows total members, on leave count, average usage, and pending requests

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

## Leave Overview Components

### Unified Leave Overview (`frontend/src/components/UnifiedLeaveOverview.tsx`)

#### Component Props
- `userRole: 'admin' | 'supervisor'` - User's role for conditional features
- `initialViewMode?: 'overview' | 'team' | 'department'` - Default view mode

#### State Management Functions
- `loadLeaveData()` - Unified data loader for all view modes
- `getStatusColor(status, type)` - Unified color function for risk/leave status
- `getStatusLabel(status, type)` - Unified label function for risk/leave status
- `getFilteredEmployees()` - Advanced filtering and sorting for admin overview
- `getRiskIcon(riskLevel)` - Returns emoji for risk level (admin-specific)
- `getLeaveTypeLabel(type)` - Returns Korean label for leave types
- `getLeaveUsageColor(percentage)` - Returns color based on usage percentage

#### Handler Functions
- `handleViewModeChange(event, newMode)` - Switches between overview/team/department views
- `handleExportExcel()` - Excel export placeholder
- `handleAdjustLeave(employeeId, employeeName)` - Opens leave adjustment dialog (admin)
- `handleAdjustmentComplete()` - Refreshes data after adjustment
- `handleViewDetail(member)` - Loads employee leave log details
- `handleCloseDetail()` - Closes detail dialog
- `handleMemberClick(member)` - Opens team member detail dialog

#### Render Functions
- `renderViewModeSelector()` - Renders toggle buttons for view modes
- `renderOverviewView()` - Renders admin overview with statistics and table
- `renderTeamView()` - Renders team member cards with leave balances
- `renderDepartmentView()` - Renders department statistics cards

### Page Wrapper (`frontend/src/pages/UnifiedLeaveOverviewPage.tsx`)
- Wrapper component that determines user role and initial view mode
- Passes role and view mode to UnifiedLeaveOverview component

### Routes (`frontend/src/App.tsx`)
- `/leave/overview` - Main unified leave overview route
- `/admin/leave/overview` - Redirects to `/leave/overview`
- `/supervisor/leave/status` - Redirects to `/leave/overview`
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

## TypeScript 관련 유틸리티

### API Service 메서드
- `uploadWithProgress(url, formData, onProgress)` - 파일 업로드 진행률 추적 기능
  - 용도: 대용량 파일 업로드 시 진행 상황 표시
  - 위치: `services/api.ts`

### 타입 정의
- `ApiResponse<T>` - 모든 API 응답의 기본 타입
  - 주의: 항상 제네릭 타입 T를 명시해야 함
- `TeamLeaveStatusResponse` - 팀 휴가 현황 응답 타입
- `PayrollReportResponse` - 급여 보고서 응답 타입

### 타입 유틸리티
- `Omit<T, K>` - 기존 타입에서 특정 속성 제외
  - 예시: `PayrollRowData extends Omit<MonthlyPayment, 'id'>`

### 상수 패턴
- `as const` - 리터럴 타입으로 고정
  - 주의: Object.freeze()와 함께 사용하지 말 것
- Remove entries when functions are deprecated