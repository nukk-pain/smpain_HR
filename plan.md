# Production Test Execution Plan (TDD Approach)

## Overview
This plan follows Test-Driven Development (TDD) methodology to verify production deployment functionality. Each test will be written first, then executed to verify the actual system behavior.

## Test Execution Instructions
1. Write a failing test that describes expected behavior
2. Execute the test against production environment
3. If test fails, document the issue
4. If test passes, mark with ✓ and move to next test
5. Follow the Red → Green → Refactor cycle

## Production URLs
- Frontend: https://smpain-hr.vercel.app/
- Backend: https://hr-backend-429401177957.asia-northeast3.run.app

---

## Phase 1: Authentication & Authorization Tests

### 1.1 Login Functionality Tests

- [x] **TEST: Valid credentials should successfully authenticate**
  ```
  Given: Valid username and password
  When: User submits login form
  Then: JWT token is received and stored
  And: User is redirected to dashboard
  ```

- [x] **TEST: Invalid credentials should show error message**
  ```
  Given: Invalid username or password
  When: User submits login form
  Then: Error message "Invalid credentials" is displayed
  And: User remains on login page
  ```

- [x] **TEST: Empty credentials should be validated**
  ```
  Given: Empty username or password fields
  When: User attempts to submit
  Then: Validation error is shown
  And: Form is not submitted
  ```

### 1.2 Session Management Tests

- [x] **TEST: JWT token should persist across page refresh**
  ```
  Given: User is logged in with valid JWT
  When: Page is refreshed
  Then: User remains authenticated
  And: Dashboard is still accessible
  ```

- [x] **TEST: Expired token should trigger re-authentication**
  ```
  Given: JWT token has expired
  When: User makes any API request
  Then: User is redirected to login
  And: Error message about session expiry is shown
  ```

- [x] **TEST: Logout should clear authentication**
  ```
  Given: User is logged in
  When: User clicks logout
  Then: JWT token is cleared
  And: User is redirected to login page
  And: Protected routes are no longer accessible
  ```

### 1.3 Role-Based Access Tests

- [x] **TEST: Admin menu should only be visible to Admin users**
  ```
  Given: User with Admin role is logged in
  When: Dashboard loads
  Then: Admin menu items are visible
  And: All admin routes are accessible
  ```

- [x] **TEST: Supervisor features should be accessible to Supervisor and Admin**
  ```
  Given: User with Supervisor role is logged in
  When: Accessing supervisor features
  Then: Leave approval menu is accessible
  And: Team reports are visible
  ```

- [x] **TEST: Regular users should have restricted access**
  ```
  Given: User with User role is logged in
  When: Attempting to access admin routes
  Then: Access is denied with 403 error
  And: User is redirected to dashboard
  ```

---

## Phase 2: User Management Tests

### 2.1 User List Display Tests

- [x] **TEST: User list should load and display all users**
  ```
  Given: Admin user is on user management page
  When: Page loads
  Then: All users are displayed in table
  And: Pagination controls are visible
  ```

- [x] **TEST: Search functionality should filter users**
  ```
  Given: User list is displayed
  When: Search term is entered
  Then: Only matching users are shown
  And: Search works for name and department
  ```

- [x] **TEST: Filters should work correctly**
  ```
  Given: User list is displayed
  When: Department filter is applied
  Then: Only users from selected department are shown
  And: Multiple filters can be combined
  ```

### 2.2 User Creation Tests (Admin Only)

- [x] **TEST: New user form should validate required fields**
  ```
  Given: Admin is on create user page
  When: Form is submitted with missing fields
  Then: Validation errors are displayed
  And: Form is not submitted
  ```

- [x] **TEST: Email uniqueness should be enforced** ⚠️ ISSUE FOUND
  ```
  Given: Email already exists in system
  When: New user form is submitted with duplicate email
  Then: Error message "Email already exists" is shown
  And: User is not created
  ```

- [x] **TEST: Successful user creation should update list** ⚠️ ISSUE FOUND
  ```
  Given: Valid user data is entered
  When: Form is submitted
  Then: Success message is shown
  And: New user appears in user list
  And: User can login with provided credentials
  ```

### 2.3 User Update Tests

- [ ] **TEST: User edit form should load existing data**
  ```
  Given: Admin clicks edit on a user
  When: Edit form loads
  Then: All current user data is populated
  And: Form can be modified and saved
  ```

- [ ] **TEST: Users should be able to update own profile**
  ```
  Given: Regular user accesses own profile
  When: Profile is updated
  Then: Changes are saved successfully
  And: Updated data is reflected in system
  ```

- [ ] **TEST: Password change should require current password**
  ```
  Given: User is changing password
  When: New password is submitted
  Then: Current password must be verified
  And: New password must meet complexity requirements
  ```

### 2.4 User Deletion Tests (Admin Only)

- [ ] **TEST: Delete should show confirmation dialog**
  ```
  Given: Admin clicks delete on a user
  When: Delete is initiated
  Then: Confirmation dialog appears
  And: Cancel prevents deletion
  ```

- [ ] **TEST: Successful deletion should remove user**
  ```
  Given: Admin confirms user deletion
  When: Deletion is processed
  Then: User is removed from list
  And: Deleted user cannot login
  ```

---

## Phase 3: Leave Management Tests

### 3.1 Leave Request Tests

- [ ] **TEST: Leave request form should calculate days correctly**
  ```
  Given: User selects start and end dates
  When: Dates include weekends
  Then: Saturday counts as 0.5 days
  And: Sunday is excluded from count
  ```

- [ ] **TEST: Advance notice rule should be enforced**
  ```
  Given: Current date is less than 3 days before leave
  When: User tries to submit request
  Then: Error "Minimum 3 days advance notice required" is shown
  And: Request is not submitted
  ```

- [ ] **TEST: Maximum consecutive days should be limited**
  ```
  Given: User selects more than 15 consecutive days
  When: Form is submitted
  Then: Error "Maximum 15 consecutive days allowed" is shown
  And: Request is not submitted
  ```

- [ ] **TEST: Leave balance should be checked**
  ```
  Given: User has insufficient leave balance
  When: Request exceeds available days
  Then: Warning is shown
  And: Negative balance up to -3 days is allowed
  ```

### 3.2 Leave Approval Tests (Supervisor/Admin)

- [ ] **TEST: Pending requests should be visible to approvers**
  ```
  Given: Supervisor logs in
  When: Leave approval page is accessed
  Then: All pending requests are listed
  And: Request details are viewable
  ```

- [ ] **TEST: Approval should update leave balance**
  ```
  Given: Leave request is approved
  When: Approval is processed
  Then: Employee's leave balance is deducted
  And: Request status changes to "Approved"
  And: Employee is notified
  ```

- [ ] **TEST: Rejection should require reason**
  ```
  Given: Supervisor rejects a request
  When: Rejection is submitted without reason
  Then: Error "Rejection reason required" is shown
  And: Request remains pending
  ```

### 3.3 Leave Balance Tests

- [ ] **TEST: Annual leave calculation for first year**
  ```
  Given: Employee in first year of service
  When: Leave balance is calculated
  Then: Monthly accrual is shown (max 11 days)
  And: Prorated calculation is correct
  ```

- [ ] **TEST: Annual leave calculation for subsequent years**
  ```
  Given: Employee with more than 1 year service
  When: Leave balance is calculated
  Then: Formula is 15 + (years - 1)
  And: Maximum is capped at 25 days
  ```

- [ ] **TEST: Carryover should be limited**
  ```
  Given: Year-end leave balance exists
  When: New year begins
  Then: Maximum 15 days carry over
  And: Excess days are forfeited
  ```

---

## Phase 4: Payroll Management Tests

### 4.1 Payroll Data Upload Tests

- [ ] **TEST: Excel upload should validate format**
  ```
  Given: Admin uploads payroll Excel file
  When: File format is incorrect
  Then: Error "Invalid file format" is shown
  And: File is not processed
  ```

- [ ] **TEST: Data preview should show before import**
  ```
  Given: Valid Excel file is uploaded
  When: Upload is processed
  Then: Data preview is displayed
  And: Errors are highlighted for correction
  ```

- [ ] **TEST: Bulk import should handle large files**
  ```
  Given: Excel with 500+ employee records
  When: Import is initiated
  Then: Progress indicator is shown
  And: All records are processed successfully
  ```

### 4.2 Payroll Calculation Tests

- [ ] **TEST: Salary calculation should be accurate**
  ```
  Given: Employee payroll data exists
  When: Calculation is performed
  Then: Base salary + allowances are summed
  And: Deductions are applied correctly
  And: Net pay is accurate
  ```

- [ ] **TEST: Incentive calculation should follow rules**
  ```
  Given: Performance data is available
  When: Incentives are calculated
  Then: Calculation follows defined formula
  And: Results are verifiable
  ```

- [ ] **TEST: Four mandatory deductions should be applied**
  ```
  Given: Employee salary data
  When: Deductions are calculated
  Then: All four insurance deductions are applied
  And: Rates are correct for salary bracket
  ```

### 4.3 Payslip Generation Tests

- [ ] **TEST: Individual payslips should be accessible**
  ```
  Given: Employee logs in
  When: Payslip is requested
  Then: Current month payslip is displayed
  And: Historical payslips are available
  ```

- [ ] **TEST: PDF generation should work**
  ```
  Given: Payslip is displayed
  When: Download PDF is clicked
  Then: PDF is generated with correct data
  And: Format is professional and complete
  ```

### 4.4 Payroll Report Tests

- [ ] **TEST: Monthly summary report should be accurate**
  ```
  Given: Admin requests monthly report
  When: Report is generated
  Then: Total salaries match individual sums
  And: Department breakdowns are correct
  ```

- [ ] **TEST: Excel export should include all data**
  ```
  Given: Report is displayed
  When: Export to Excel is clicked
  Then: Excel file contains all displayed data
  And: Formatting is preserved
  ```

---

## Phase 5: Department Management Tests

### 5.1 Department CRUD Tests

- [ ] **TEST: Department list should show all departments**
  ```
  Given: Admin accesses department management
  When: Page loads
  Then: All departments are listed
  And: Employee count per department is shown
  ```

- [ ] **TEST: New department creation should validate**
  ```
  Given: Admin creates new department
  When: Duplicate name is entered
  Then: Error "Department name already exists" is shown
  And: Department is not created
  ```

- [ ] **TEST: Department deletion should check for employees**
  ```
  Given: Department has assigned employees
  When: Delete is attempted
  Then: Error "Cannot delete department with employees" is shown
  And: Department remains active
  ```

---

## Phase 6: Report Generation Tests

### 6.1 Leave Report Tests

- [ ] **TEST: Department leave report should aggregate correctly**
  ```
  Given: Leave data exists for multiple departments
  When: Department report is generated
  Then: Leave usage is summed by department
  And: Individual breakdowns are available
  ```

- [ ] **TEST: Date range filtering should work**
  ```
  Given: Historical leave data exists
  When: Date range is specified
  Then: Only leaves within range are included
  And: Calculations are updated accordingly
  ```

### 6.2 Attendance Report Tests

- [ ] **TEST: Daily attendance should be trackable**
  ```
  Given: Attendance data is recorded
  When: Daily report is generated
  Then: Present/absent/leave status is shown
  And: Late arrivals are highlighted
  ```

- [ ] **TEST: Monthly attendance summary should calculate correctly**
  ```
  Given: Month of attendance data
  When: Summary is generated
  Then: Total days, present days, leave days are accurate
  And: Percentage calculations are correct
  ```

---

## Phase 7: Performance & Stability Tests

### 7.1 Load Time Tests

- [ ] **TEST: Page load should complete within 3 seconds**
  ```
  Given: Production environment
  When: Any page is accessed
  Then: Full page load completes < 3 seconds
  And: Interactive elements are responsive
  ```

- [ ] **TEST: API responses should be fast**
  ```
  Given: API endpoints
  When: Requests are made
  Then: Response time is < 500ms for simple queries
  And: Complex queries complete < 2 seconds
  ```

### 7.2 Error Handling Tests

- [ ] **TEST: Network errors should show user-friendly messages**
  ```
  Given: Network connection is interrupted
  When: User performs action
  Then: "Connection error. Please try again" is shown
  And: Retry option is available
  ```

- [ ] **TEST: Server errors should not expose internals**
  ```
  Given: Server returns 500 error
  When: Error is displayed
  Then: Generic error message is shown
  And: Technical details are hidden
  ```

### 7.3 Browser Compatibility Tests

- [ ] **TEST: Chrome functionality**
  ```
  Given: Latest Chrome browser
  When: All features are tested
  Then: No JavaScript errors occur
  And: UI renders correctly
  ```

- [ ] **TEST: Safari functionality**
  ```
  Given: Latest Safari browser
  When: All features are tested
  Then: No compatibility issues
  And: Date pickers work correctly
  ```

### 7.4 Responsive Design Tests

- [ ] **TEST: Mobile view should be usable**
  ```
  Given: 375px viewport width
  When: Pages are accessed
  Then: Navigation is accessible
  And: Forms are usable
  And: Tables are scrollable
  ```

- [ ] **TEST: Tablet view should optimize layout**
  ```
  Given: 768px viewport width
  When: Pages are accessed
  Then: Two-column layouts work
  And: No horizontal scrolling needed
  ```

---

## Phase 8: Security Validation Tests

### 8.1 Authentication Security Tests

- [ ] **TEST: JWT tokens should be validated**
  ```
  Given: Modified or invalid JWT token
  When: API request is made
  Then: 401 Unauthorized is returned
  And: User must re-authenticate
  ```

- [ ] **TEST: Expired tokens should be rejected**
  ```
  Given: JWT token past expiration
  When: Protected resource is accessed
  Then: Token is rejected
  And: Fresh login is required
  ```

### 8.2 Input Validation Tests

- [ ] **TEST: SQL injection attempts should be blocked**
  ```
  Given: Malicious SQL in input fields
  When: Form is submitted
  Then: Input is sanitized
  And: No database errors occur
  ```

- [ ] **TEST: XSS attempts should be prevented**
  ```
  Given: Script tags in user input
  When: Data is displayed
  Then: Scripts are not executed
  And: HTML is escaped properly
  ```

### 8.3 File Upload Security Tests

- [ ] **TEST: File type restrictions should be enforced**
  ```
  Given: Non-allowed file type
  When: Upload is attempted
  Then: Error "Invalid file type" is shown
  And: File is not uploaded
  ```

- [ ] **TEST: File size limits should be checked**
  ```
  Given: File larger than 10MB
  When: Upload is attempted
  Then: Error "File too large" is shown
  And: Upload is prevented
  ```

---

## Phase 9: Data Integrity Tests

### 9.1 Database Connection Tests

- [ ] **TEST: MongoDB connection should be stable**
  ```
  Given: Production database
  When: Multiple requests are made
  Then: All connections succeed
  And: No connection pool errors occur
  ```

- [ ] **TEST: CRUD operations should be atomic**
  ```
  Given: Concurrent user actions
  When: Same record is modified
  Then: Last write wins consistently
  And: No data corruption occurs
  ```

### 9.2 Data Synchronization Tests

- [ ] **TEST: Frontend-Backend data should match**
  ```
  Given: Data is updated
  When: Page is refreshed
  Then: Latest data is displayed
  And: No stale cache issues
  ```

- [ ] **TEST: Real-time updates should propagate**
  ```
  Given: Multiple users viewing same data
  When: One user makes changes
  Then: Other users see updates on refresh
  And: Notification system works
  ```

---

## Phase 10: Deployment Environment Tests

### 10.1 Environment Configuration Tests

- [ ] **TEST: Production environment variables are set**
  ```
  Given: Production deployment
  When: Application starts
  Then: All required env vars are present
  And: No development settings are active
  ```

- [ ] **TEST: API URLs are correctly configured**
  ```
  Given: Frontend application
  When: API calls are made
  Then: Correct backend URL is used
  And: No localhost references exist
  ```

### 10.2 CORS Configuration Tests

- [ ] **TEST: Cross-origin requests should work**
  ```
  Given: Frontend on Vercel
  When: Backend API is called
  Then: CORS headers allow request
  And: Credentials are included
  ```

- [ ] **TEST: Unauthorized origins should be blocked**
  ```
  Given: Request from unknown origin
  When: API is accessed
  Then: CORS error is returned
  And: No data is exposed
  ```

### 10.3 Logging and Monitoring Tests

- [ ] **TEST: Error logs should be captured**
  ```
  Given: Application error occurs
  When: Error is logged
  Then: Cloud logging captures details
  And: Stack trace is included
  ```

- [ ] **TEST: Performance metrics should be collected**
  ```
  Given: Production usage
  When: Monitoring is checked
  Then: Response times are tracked
  And: Resource usage is visible
  ```

---

## Test Completion Criteria

### All Tests Must Pass
- [ ] All authentication tests completed
- [ ] All user management tests completed
- [ ] All leave management tests completed
- [ ] All payroll tests completed
- [ ] All department tests completed
- [ ] All report tests completed
- [ ] All performance tests completed
- [ ] All security tests completed
- [ ] All data integrity tests completed
- [ ] All deployment tests completed

### Issue Resolution
- [ ] All critical issues resolved
- [ ] All major issues resolved or documented
- [ ] Minor issues logged for future fixes
- [ ] Performance benchmarks met
- [ ] Security scan completed

### Sign-off
- [ ] Testing documented with results
- [ ] Known issues documented
- [ ] Deployment verified stable
- [ ] Rollback plan confirmed
- [ ] Production ready for users

---

## Next Steps After Testing

1. **If all tests pass**: System is ready for production use
2. **If critical issues found**: Fix immediately before release
3. **If minor issues found**: Document and plan fixes
4. **Performance issues**: Optimize before heavy usage
5. **Security issues**: Patch immediately

Remember: Follow TDD principles - write the test first, see it fail against production, then verify it passes.