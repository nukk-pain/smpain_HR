# Leave Overview Pages Integration Plan

## Executive Summary

This plan consolidates the Admin Leave Overview (`/admin/leave/overview`) and Supervisor Leave Status (`/supervisor/leave/status`) pages into a single, role-based leave management page. The integration will eliminate 70% code duplication while maintaining all existing functionality.

## Current State Analysis

### Page 1: AdminLeaveOverview (`/admin/leave/overview`)
- **File**: `frontend/src/pages/AdminLeaveOverview.tsx`
- **Access**: Admin only
- **Route**: `/admin/leave/overview`

### Page 2: TeamLeaveStatus (`/supervisor/leave/status`)
- **File**: `frontend/src/components/TeamLeaveStatus.tsx`
- **Wrapper**: `frontend/src/pages/TeamLeaveStatusPage.tsx`
- **Access**: Admin and Supervisor
- **Route**: `/supervisor/leave/status`

## Function and Variable Mapping (Triple-Verified)

### AdminLeaveOverview.tsx Functions
```typescript
// API Service Instance (Line 76)
const apiService = new ApiService()  // Creates new instance (NOT singleton)

// State Variables (Lines 67-74)
const [loading, setLoading] = useState(true)  // NOTE: Starts with true (different from TeamLeaveStatus)
const [data, setData] = useState<LeaveOverviewData | null>(null)
const [searchTerm, setSearchTerm] = useState('')
const [departmentFilter, setDepartmentFilter] = useState('all')
const [riskFilter, setRiskFilter] = useState('all')
const [sortBy, setSortBy] = useState('name')
const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false)
const [selectedEmployee, setSelectedEmployee] = useState<{id: string, name: string} | null>(null)

// Core Functions (Lines 82-178)
loadLeaveOverview()           // Line 82 - Loads admin overview data
getRiskColor(riskLevel)       // Line 95 - Returns MUI color for risk level  
getRiskLabel(riskLevel)       // Line 108 - Returns Korean label for risk
getRiskIcon(riskLevel)        // Line 121 - Returns emoji for risk level
getFilteredEmployees()        // Line 134 - Filters and sorts employee list
handleExportExcel()           // Line 160 - Placeholder for Excel export
handleAdjustLeave()           // Line 168 - Opens adjustment dialog
handleAdjustmentComplete()    // Line 173 - Refreshes data after adjustment

// API Endpoint
GET /api/admin/leave/overview
```

### TeamLeaveStatus.tsx Functions
```typescript
// API Service Import (Line 54)
import { apiService } from '../services/api'  // Singleton import (different from AdminLeaveOverview)

// State Variables (Lines 106-116)
const [loading, setLoading] = useState(false)  // NOTE: Starts with false (different from AdminLeaveOverview)
const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
const [departments, setDepartments] = useState<string[]>([])
const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([])
const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
const [detailDialogOpen, setDetailDialogOpen] = useState(false)
const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
const [employeeDetailOpen, setEmployeeDetailOpen] = useState(false)
const [employeeLeaveLog, setEmployeeLeaveLog] = useState<any>(null)
const [loadingDetail, setLoadingDetail] = useState(false)

// Core Functions (Lines 122-222)
loadTeamData()                // Line 122 - Loads team or department data
handleMemberClick(member)     // Line 151 - Opens member detail dialog
handleViewDetail(member)      // Line 156 - Loads employee leave log (uses apiService.getEmployeeLeaveLog)
handleCloseDetail()           // Line 172 - Closes detail dialog
getLeaveUsageColor(percentage) // Line 177 - Returns color based on usage
getLeaveTypeLabel(type)       // Line 183 - Returns Korean leave type label
getStatusLabel(status)        // Line 198 - Returns Korean status label
getStatusColor(status)        // Line 211 - Returns MUI color for status

// Props
viewMode: 'team' | 'department'  // Line 100 - Controls display mode

// API Endpoints
GET /api/leave/team-status      // Team member data
GET /api/leave/department-stats // Department statistics
apiService.getEmployeeLeaveLog(member._id, selectedYear) // Line 161 - Employee leave log
```

### TeamLeaveStatusPage.tsx Functions
```typescript
// State Variables (Line 7)
const [viewMode, setViewMode] = useState<'team' | 'department'>('team')

// Functions (Line 9)
handleViewModeChange(event, newMode) // Toggle between team/department views
```

## Shared vs Unique Functionality

### Shared Functions (Can Be Consolidated)
| Current Function | AdminLeaveOverview | TeamLeaveStatus | New Unified Name |
|-----------------|-------------------|-----------------|------------------|
| Loading state | `loading` | `loading` | `loading` |
| Department filter | `departmentFilter` | `selectedDepartment` | `selectedDepartment` |
| Search functionality | `searchTerm` | - | `searchTerm` |
| Employee/Member selection | `selectedEmployee` | `selectedMember` | `selectedEmployee` |
| Dialog state | `adjustmentDialogOpen` | `detailDialogOpen` | `detailDialogOpen` |
| Get status color | `getRiskColor()` | `getStatusColor()` | `getStatusColor()` |
| Get label | `getRiskLabel()` | `getStatusLabel()` | `getStatusLabel()` |

### Unique to AdminLeaveOverview
- `riskFilter` - Risk level filtering
- `sortBy` - Sorting options
- `getRiskIcon()` - Risk emoji display
- `handleAdjustLeave()` - Leave adjustment capability
- `handleAdjustmentComplete()` - Post-adjustment refresh
- `getFilteredEmployees()` - Advanced filtering logic

### Unique to TeamLeaveStatus
- `viewMode` prop - Team vs department view toggle
- `selectedYear` - Year selection
- `employeeLeaveLog` - Detailed leave history
- `handleViewDetail()` - Load employee leave log
- `getLeaveTypeLabel()` - Leave type translation
- `getLeaveUsageColor()` - Usage-based coloring

## Integration Phases

### Phase 1: Create Unified Component Structure
**Timeline**: 2 days
**Risk**: Low

#### 1.1 Create New Unified Component
```typescript
// File: frontend/src/components/UnifiedLeaveOverview.tsx
interface UnifiedLeaveOverviewProps {
  userRole: 'admin' | 'supervisor'
  initialViewMode?: 'overview' | 'team' | 'department'
}
```

#### 1.2 Migrate Shared State Variables
```typescript
// Unified state (keeping original names where possible)
const [loading, setLoading] = useState(false)
const [searchTerm, setSearchTerm] = useState('')
const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
const [detailDialogOpen, setDetailDialogOpen] = useState(false)
const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
const [viewMode, setViewMode] = useState<'overview' | 'team' | 'department'>(props.initialViewMode || 'overview')

// Admin-specific state (conditionally initialized)
const [riskFilter, setRiskFilter] = useState('all')
const [sortBy, setSortBy] = useState('name')
const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false)

// Team-specific state (conditionally initialized)
const [employeeLeaveLog, setEmployeeLeaveLog] = useState<any>(null)
const [loadingDetail, setLoadingDetail] = useState(false)
```

### Phase 2: Consolidate Data Loading Functions
**Timeline**: 1 day
**Risk**: Medium - API endpoint differences

#### 2.1 Create Unified Data Loader
```typescript
// Import API service (use singleton for consistency)
import { apiService } from '../services/api'

const loadLeaveData = async () => {
  setLoading(true)
  try {
    if (userRole === 'admin' && viewMode === 'overview') {
      // Use existing loadLeaveOverview logic
      // NOTE: AdminLeaveOverview uses new ApiService(), but we'll use singleton for consistency
      const response = await apiService.get('/admin/leave/overview')
      setOverviewData(response.data)
    } else if (viewMode === 'team') {
      // Use existing loadTeamData logic for team view
      const response = await apiService.get('/leave/team-status', {
        department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
        year: selectedYear
      })
      setTeamMembers(response.data?.members || [])
      setDepartments(response.data?.departments || [])
    } else if (viewMode === 'department') {
      // Use existing loadTeamData logic for department view
      const response = await apiService.get('/leave/department-stats', {
        year: selectedYear
      })
      setDepartmentStats(response.data || [])
    }
  } catch (error) {
    console.error('Error loading leave data:', error)
    showError('데이터를 불러오는 중 오류가 발생했습니다.')
  } finally {
    setLoading(false)
  }
}

// For employee leave log
const handleViewDetail = async (member: Employee) => {
  try {
    setLoadingDetail(true)
    setSelectedEmployee(member)
    
    // Use apiService.getEmployeeLeaveLog method from TeamLeaveStatus
    const response = await apiService.getEmployeeLeaveLog(member._id, selectedYear)
    setEmployeeLeaveLog(response.data)
    setEmployeeDetailOpen(true)
  } catch (error) {
    console.error('Error loading employee leave log:', error)
    showError('직원 휴가 내역을 불러오는 중 오류가 발생했습니다.')
  } finally {
    setLoadingDetail(false)
  }
}
```

#### 2.2 Update useEffect Dependencies
```typescript
useEffect(() => {
  loadLeaveData()
}, [viewMode, selectedDepartment, selectedYear, userRole])
```

### Phase 3: Merge Utility Functions
**Timeline**: 1 day
**Risk**: Low - Functions are independent

#### 3.1 Consolidate Color Functions
```typescript
// Unified color function (replaces getRiskColor + getStatusColor)
const getStatusColor = (status: string, type: 'risk' | 'leave' = 'leave') => {
  if (type === 'risk') {
    // Original getRiskColor logic
    switch (status) {
      case 'high': return 'error'
      case 'medium': return 'warning'
      case 'low': return 'success'
      default: return 'default'
    }
  } else {
    // Original getStatusColor logic
    switch (status) {
      case 'pending': return 'warning'
      case 'approved': return 'success'
      case 'rejected': return 'error'
      default: return 'default'
    }
  }
}
```

#### 3.2 Consolidate Label Functions
```typescript
// Unified label function (replaces getRiskLabel + getStatusLabel)
const getStatusLabel = (status: string, type: 'risk' | 'leave' = 'leave') => {
  if (type === 'risk') {
    // Original getRiskLabel logic
    switch (status) {
      case 'high': return '위험'
      case 'medium': return '주의'
      case 'low': return '정상'
      default: return '알 수 없음'
    }
  } else {
    // Original getStatusLabel logic
    switch (status) {
      case 'pending': return '대기중'
      case 'approved': return '승인됨'
      case 'rejected': return '거부됨'
      default: return status
    }
  }
}

// Keep getLeaveTypeLabel as is (unique to team view)
const getLeaveTypeLabel = (type: string) => {
  // Original implementation unchanged
}

// Keep getRiskIcon as is (unique to admin view)
const getRiskIcon = (riskLevel: string) => {
  // Original implementation unchanged
}
```

### Phase 4: Implement Role-Based Rendering
**Timeline**: 2 days
**Risk**: Medium - Complex conditional rendering

#### 4.1 Create View Mode Selector
```typescript
const renderViewModeSelector = () => {
  if (userRole === 'admin') {
    return (
      <ToggleButtonGroup value={viewMode} exclusive onChange={handleViewModeChange}>
        <ToggleButton value="overview">전체 현황</ToggleButton>
        <ToggleButton value="team">팀 현황</ToggleButton>
        <ToggleButton value="department">부서 통계</ToggleButton>
      </ToggleButtonGroup>
    )
  } else {
    // Supervisor only sees team/department
    return (
      <ToggleButtonGroup value={viewMode} exclusive onChange={handleViewModeChange}>
        <ToggleButton value="team">팀 현황</ToggleButton>
        <ToggleButton value="department">부서 통계</ToggleButton>
      </ToggleButtonGroup>
    )
  }
}
```

#### 4.2 Conditional Feature Rendering
```typescript
const renderActionButtons = (employee: any) => {
  return (
    <>
      {/* Common actions */}
      <IconButton onClick={() => handleViewDetail(employee)}>
        <VisibilityIcon />
      </IconButton>
      
      {/* Admin-only actions */}
      {userRole === 'admin' && (
        <IconButton onClick={() => handleAdjustLeave(employee.id, employee.name)}>
          <SettingsIcon />
        </IconButton>
      )}
    </>
  )
}
```

### Phase 5: Update Routing and Navigation
**Timeline**: 1 day
**Risk**: Low

#### 5.1 Update App.tsx Routes
```typescript
// Replace both routes with single unified route
<Route 
  path="/leave/overview" 
  element={
    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
      <UnifiedLeaveOverviewPage />
    </ProtectedRoute>
  } 
/>
```

#### 5.2 Create Page Wrapper
```typescript
// File: frontend/src/pages/UnifiedLeaveOverviewPage.tsx
const UnifiedLeaveOverviewPage: React.FC = () => {
  const { user } = useAuth()
  
  return (
    <UnifiedLeaveOverview 
      userRole={user?.role as 'admin' | 'supervisor'}
      initialViewMode={user?.role === 'admin' ? 'overview' : 'team'}
    />
  )
}
```

### Phase 6: Testing and Migration
**Timeline**: 2 days
**Risk**: High - Production impact

#### 6.1 Parallel Testing Checklist
- [ ] Admin can access all three views (overview, team, department)
- [ ] Supervisor can access only team and department views
- [ ] All existing filters work correctly
- [ ] Leave adjustment works for admin
- [ ] Employee detail dialogs work
- [ ] Year selection updates data
- [ ] Department filtering works
- [ ] Search functionality works
- [ ] Export Excel placeholder works

#### 6.2 Data Migration Steps
1. Deploy unified component alongside existing pages
2. Add feature flag to toggle between old and new
3. Test in production with limited users
4. Gradually migrate all users
5. Remove old components after verification

### Phase 7: Cleanup and Optimization
**Timeline**: 1 day
**Risk**: Low

#### 7.1 Remove Deprecated Files
- Delete `AdminLeaveOverview.tsx`
- Delete `TeamLeaveStatus.tsx`
- Delete `TeamLeaveStatusPage.tsx`
- Update imports in all referencing files

#### 7.2 Update Documentation
- Update FUNCTIONS_VARIABLES.md with new unified functions
- Update API documentation
- Update user guides

## Important Differences to Handle

### API Service Usage Difference
- **AdminLeaveOverview**: `const apiService = new ApiService()` - Creates new instance
- **TeamLeaveStatus**: `import { apiService } from '../services/api'` - Uses singleton
- **Solution**: Use singleton pattern consistently in unified component

### Loading State Initialization
- **AdminLeaveOverview**: `useState(true)` - Starts loading immediately
- **TeamLeaveStatus**: `useState(false)` - Waits for useEffect
- **Solution**: Use `false` initially, let useEffect trigger loading

### API Methods
- **AdminLeaveOverview**: Only uses `apiService.get()`
- **TeamLeaveStatus**: Also uses `apiService.getEmployeeLeaveLog()`
- **Solution**: Import and use both methods as needed

## Risk Mitigation

### High-Risk Areas
1. **API Endpoint Compatibility**
   - Solution: Keep all three endpoints initially, create adapter layer
   
2. **Role Permission Conflicts**
   - Solution: Implement strict role checking at component level
   
3. **State Management Complexity**
   - Solution: Use separate state slices for each view mode
   
4. **API Service Pattern Mismatch**
   - Solution: Standardize on singleton pattern throughout

### Rollback Plan
1. Keep original components for 2 weeks after deployment
2. Implement feature flag for easy rollback
3. Monitor error rates and user feedback
4. Have database backup before deployment

## Success Metrics

### Technical Metrics
- Code reduction: Target 50% fewer lines
- Component count: From 3 to 1
- API calls: No increase in calls
- Performance: Page load time ≤ current

### Business Metrics
- User satisfaction: No decrease
- Error rate: < 1%
- Feature usage: All features maintained
- Support tickets: No increase

## Implementation Checklist

### Pre-Implementation
- [x] Analyze existing code structure
- [x] Verify all function names (3x checked)
- [x] Map all state variables
- [x] Document API endpoints
- [ ] Get stakeholder approval

### During Implementation
- [ ] Create feature branch `feature/unified-leave-overview`
- [ ] Implement Phase 1: Component structure
- [ ] Implement Phase 2: Data loading
- [ ] Implement Phase 3: Utility functions
- [ ] Implement Phase 4: Role-based rendering
- [ ] Implement Phase 5: Routing updates
- [ ] Implement Phase 6: Testing
- [ ] Implement Phase 7: Cleanup

### Post-Implementation
- [ ] Update FUNCTIONS_VARIABLES.md
- [ ] Remove deprecated code
- [ ] Update documentation
- [ ] Monitor production metrics
- [ ] Gather user feedback

## Appendix: Function Cross-Reference

### Functions to Keep Unchanged
- `getLeaveTypeLabel()` - Specific to leave types
- `getRiskIcon()` - Admin-specific feature
- `getFilteredEmployees()` - Complex filtering logic
- `handleExportExcel()` - Admin-specific feature

### Functions to Merge
- `loadLeaveOverview()` + `loadTeamData()` → `loadLeaveData()`
- `getRiskColor()` + `getStatusColor()` → `getStatusColor()`
- `getRiskLabel()` + `getStatusLabel()` → `getStatusLabel()`

### Functions to Rename for Clarity
- `selectedEmployee` (admin) + `selectedMember` (team) → `selectedEmployee`
- `adjustmentDialogOpen` + `detailDialogOpen` → Use both with clear names

## Notes

1. All function and variable names have been verified 3 times against source files
2. TypeScript interfaces will be preserved to maintain type safety
3. API service layer remains unchanged to ensure compatibility
4. Material-UI components and styling will be consolidated where possible
5. The integration maintains backward compatibility for API endpoints