# 🧪 HR System Comprehensive Testing Guide - Detailed Steps

## 📋 Table of Contents
1. [Testing Prerequisites](#testing-prerequisites)
2. [Authentication System Testing](#authentication-system-testing)
3. [Department Management Testing](#department-management-testing)
4. [User Management Testing](#user-management-testing)
5. [Leave Management Testing](#leave-management-testing)
6. [Payroll Management Testing](#payroll-management-testing)
7. [Document Management Testing](#document-management-testing)
8. [Reports & Analytics Testing](#reports--analytics-testing)

---

## 🔧 Testing Prerequisites

### Step 1: Environment Setup
```bash
# 1.1 Open terminal and start MongoDB
mongod

# 1.2 Open new terminal, navigate to backend
cd /mnt/d/my_programs/HR/backend

# 1.3 Reset database to clean state
MONGODB_URI=mongodb://localhost:27017/SM_nomu npm run db:reset
# Expected: "Database reset complete. Admin user created."

# 1.4 Start backend server
npm run dev
# Expected: "Server is running on port 5455"

# 1.5 Open new terminal, navigate to frontend
cd /mnt/d/my_programs/HR/frontend

# 1.6 Start frontend server
npm run dev
# Expected: "VITE ready at http://localhost:3727"
```

### Step 2: Open Browser
1. Open Chrome/Firefox/Edge
2. Navigate to: `http://localhost:3727`
3. Open Developer Tools: Press `F12`
4. Keep Console tab open to monitor errors

---

## 🔐 Authentication System Testing

### Test 1.1: Login with Admin Credentials
**Steps:**
1. Navigate to `http://localhost:3727`
2. You should see login page
3. Enter credentials:
   - Username: `admin`
   - Password: `admin`
4. Click "Login" button

**Expected Results:**
- ✅ Redirected to dashboard
- ✅ Dashboard shows "Welcome, admin"
- ✅ Navigation menu visible with admin options

**Verification:**
- Open DevTools → Application → Local Storage
- Check for `hr_auth_token` key with JWT value

### Test 1.2: Login with Wrong Password
**Steps:**
1. Click logout icon in top-right corner
2. On login page, enter:
   - Username: `admin`
   - Password: `wrongpassword`
3. Click "Login" button

**Expected Results:**
- ❌ Login fails
- ❌ Error message: "Invalid username or password"
- ❌ Remain on login page

### Test 1.3: Check JWT Token in localStorage
**Steps:**
1. Login successfully as admin
2. Open DevTools (F12)
3. Go to Application tab → Local Storage → http://localhost:3727
4. Alternative: In Console, type:
   ```javascript
   localStorage.getItem('hr_auth_token')
   ```

**Expected Results:**
- ✅ Token exists starting with "eyJ..."
- ✅ Token is long string (200+ characters)

### Test 1.4: Verify Auto-redirect
**Steps:**
1. Logout from application
2. Try to directly access: `http://localhost:3727/users`

**Expected Results:**
- ✅ Automatically redirected to login page
- ✅ After login, redirected back to /users

### Test 1.5: Test Logout
**Steps:**
1. Login as admin
2. Click user icon in top-right corner
3. Click "Logout" option

**Expected Results:**
- ✅ Redirected to login page
- ✅ Token removed from localStorage
- ✅ Cannot access protected pages

### Test 1.6: Session Persistence
**Steps:**
1. Login as admin
2. Press F5 to refresh page
3. Close browser tab
4. Open new tab and navigate to `http://localhost:3727`

**Expected Results:**
- ✅ Still logged in after refresh
- ✅ Dashboard loads without login
- ✅ User session maintained

---

## 🏢 Department Management Testing

### Test 2.1: Create New Department
**Steps:**
1. Login as admin
2. Navigate to Settings → Departments (or click Departments in menu)
3. Click "Add Department" or "+" button
4. Enter department details:
   - Name: `Research & Development`
   - Description: `R&D Department`
   - Teams: `AI Team, Robotics Team`
5. Click "Save" or "Create"

**Expected Results:**
- ✅ Success message appears
- ✅ New department appears in list
- ✅ Department ID generated automatically

### Test 2.2: Edit Department
**Steps:**
1. In departments list, find "Research & Development"
2. Click Edit button (pencil icon)
3. Change name to: `R&D Innovation Lab`
4. Add new team: `Quantum Computing`
5. Click "Save" or "Update"

**Expected Results:**
- ✅ Department name updated in list
- ✅ Teams list shows new team
- ✅ Success notification

### Test 2.3: View Department List
**Steps:**
1. Navigate to Departments page
2. Check table/grid display
3. Try sorting by name (click column header)
4. Use search box to find "Innovation"

**Expected Results:**
- ✅ All departments displayed
- ✅ Pagination works if many departments
- ✅ Search filters results correctly
- ✅ Sorting changes order

### Test 2.4: Delete Department
**Steps:**
1. Create test department: `Temp Department`
2. Click Delete button (trash icon)
3. Confirm deletion in popup dialog

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ Department removed from list
- ✅ If department has users, shows warning

---

## 👥 User Management Testing

### Test 3.1: Create New User
**Steps:**
1. Login as admin
2. Navigate to Users page
3. Click "Add User" or "+" button
4. Fill in user form:
   ```
   Username: john.doe
   Password: Test@123
   Email: john.doe@company.com
   Full Name: John Doe
   Employee ID: EMP001
   Role: User
   Department: IT Department
   Team: Backend
   Join Date: 2024-01-15
   Phone: +1234567890
   ```
5. Click "Create User"

**Expected Results:**
- ✅ Success message: "User created successfully"
- ✅ User appears in users list
- ✅ Can search for "john.doe"

### Test 3.2: Edit User Information
**Steps:**
1. Find "john.doe" in users list
2. Click Edit button
3. Update fields:
   - Email: `john.doe.updated@company.com`
   - Role: `Supervisor`
   - Department: `HR Department`
4. Click "Save Changes"

**Expected Results:**
- ✅ User information updated
- ✅ Changes reflected in list
- ✅ User role changed to Supervisor

### Test 3.3: Change User Password
**Steps:**
1. Click on user "john.doe"
2. Click "Change Password" button
3. Enter new password: `NewPass@456`
4. Confirm password: `NewPass@456`
5. Click "Update Password"

**Expected Results:**
- ✅ Password updated successfully
- ✅ User can login with new password
- ✅ Old password no longer works

### Test 3.4: Deactivate/Activate User
**Steps:**
1. Find user "john.doe"
2. Click "Deactivate" button or toggle status
3. Confirm deactivation
4. Try to login as john.doe
5. As admin, reactivate the user

**Expected Results:**
- ✅ User status changes to "Inactive"
- ✅ Deactivated user cannot login
- ✅ User can be reactivated
- ✅ After reactivation, can login again

### Test 3.5: Delete User
**Steps:**
1. Create test user: `temp.user`
2. Select user from list
3. Click "Delete" button
4. Confirm deletion in dialog

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ User removed from system
- ✅ Cannot login with deleted user

### Test 3.6: Search and Filter Users
**Steps:**
1. Use search box: type "john"
2. Apply filters:
   - Role: Supervisor
   - Department: IT
   - Status: Active
3. Clear filters

**Expected Results:**
- ✅ Search shows matching users
- ✅ Filters narrow down results
- ✅ Clear filters shows all users

---

## 🏖️ Leave Management Testing

### Test 4.1: Submit Leave Request
**Steps:**
1. Login as regular user (create one if needed)
2. Navigate to Leave → Request Leave
3. Fill leave form:
   ```
   Leave Type: Annual Leave
   Start Date: [Next Monday]
   End Date: [Next Wednesday]
   Number of Days: 3
   Reason: Family vacation
   Contact During Leave: +1234567890
   ```
4. Check available balance before submitting
5. Click "Submit Request"

**Expected Results:**
- ✅ Success message appears
- ✅ Request shows in "My Requests" with "Pending" status
- ✅ Leave balance updated (reduced by 3)
- ✅ Email notification sent (if configured)

### Test 4.2: Edit Pending Request
**Steps:**
1. Go to "My Leave Requests"
2. Find pending request
3. Click "Edit" button
4. Change end date to extend by 1 day
5. Update reason
6. Click "Save Changes"

**Expected Results:**
- ✅ Request updated successfully
- ✅ Days count updated
- ✅ Still in pending status
- ✅ History shows modification

### Test 4.3: Cancel Leave Request
**Steps:**
1. Find a pending leave request
2. Click "Cancel" button
3. Provide cancellation reason
4. Confirm cancellation

**Expected Results:**
- ✅ Request status: "Cancelled"
- ✅ Leave balance restored
- ✅ Cannot edit cancelled request

### Test 4.4: Approve Leave (Supervisor)
**Steps:**
1. Login as supervisor
2. Navigate to Leave → Pending Approvals
3. Review pending request details
4. Add comments: "Approved for vacation"
5. Click "Approve"

**Expected Results:**
- ✅ Request status: "Approved"
- ✅ Employee notified
- ✅ Leave marked in calendar
- ✅ Balance finalized

### Test 4.5: View Leave Calendar
**Steps:**
1. Navigate to Leave → Calendar
2. Select current month
3. Switch views: Month/Week/List
4. Filter by department/team
5. Click on a leave entry for details

**Expected Results:**
- ✅ Calendar shows all approved leaves
- ✅ Different leave types in different colors
- ✅ Can navigate months
- ✅ Tooltips show leave details

### Test 4.6: Check Leave Balance
**Steps:**
1. Go to Leave → My Balance
2. Check different leave types
3. View accrual history
4. Check carry-forward balance

**Expected Results:**
- ✅ Shows current balance
- ✅ Shows used/remaining
- ✅ Shows next accrual date
- ✅ Historical transactions listed

---

## 💰 Payroll Management Testing

### Test 5.1: Upload Payroll Excel
**Steps:**
1. Login as admin
2. Navigate to Payroll → Upload
3. Download template Excel file
4. Fill template with test data:
   ```
   Employee ID: EMP001
   Name: John Doe
   Basic Salary: 50000
   House Allowance: 10000
   Transport: 5000
   Medical: 3000
   Deductions: 5000
   Tax: 8000
   Month: 2025-01
   ```
5. Save Excel file
6. Click "Upload" and select file
7. Review preview
8. Click "Confirm Upload"

**Expected Results:**
- ✅ File validates successfully
- ✅ Preview shows data correctly
- ✅ Upload completes
- ✅ Data appears in payroll list

### Test 5.2: Generate Payslip
**Steps:**
1. Navigate to Payroll → Monthly Payroll
2. Select month: January 2025
3. Find employee "John Doe"
4. Click "Generate Payslip"
5. Review payslip preview
6. Click "Download PDF"

**Expected Results:**
- ✅ Payslip generates with all details
- ✅ Calculations are correct
- ✅ PDF downloads successfully
- ✅ Company logo and info displayed

### Test 5.3: Calculate Incentives
**Steps:**
1. Go to Payroll → Incentive Calculator
2. Enter parameters:
   ```
   Base Amount: 50000
   Performance Score: 85%
   Attendance: 100%
   Special Bonus: 5000
   ```
3. Click "Calculate"
4. Review breakdown

**Expected Results:**
- ✅ Incentive calculated correctly
- ✅ Shows calculation formula
- ✅ Can save calculation
- ✅ Can apply to payroll

### Test 5.4: Export Payroll Report
**Steps:**
1. Navigate to Payroll → Reports
2. Select report type: "Monthly Summary"
3. Select month: January 2025
4. Choose format: Excel
5. Click "Generate Report"
6. Download file

**Expected Results:**
- ✅ Report generates successfully
- ✅ Excel file downloads
- ✅ Data is accurate and formatted
- ✅ Includes summary totals

---

## 📄 Document Management Testing

### Test 6.1: Upload Documents
**Steps:**
1. Navigate to Documents
2. Click "Upload Document"
3. Select file(s):
   - Policy document (PDF)
   - Employee handbook (DOCX)
   - Training material (PPT)
4. Add metadata:
   ```
   Category: HR Policies
   Tags: policy, employee, 2025
   Description: Updated HR policies
   Access: All Employees
   ```
5. Click "Upload"

**Expected Results:**
- ✅ Files upload successfully
- ✅ Progress bar shows upload
- ✅ Documents appear in list
- ✅ Metadata saved correctly

### Test 6.2: Search and Download Documents
**Steps:**
1. Use search box: "policy"
2. Filter by category: "HR Policies"
3. Click on document name
4. Click "Download" button
5. Check downloaded file

**Expected Results:**
- ✅ Search returns relevant documents
- ✅ Filters work correctly
- ✅ Preview available (if PDF)
- ✅ File downloads correctly

### Test 6.3: Delete Document
**Steps:**
1. Select test document
2. Click "Delete" button
3. Confirm deletion
4. Check if removed from list

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ Document deleted
- ✅ No longer in search results
- ✅ Audit log updated

---

## 📊 Reports & Analytics Testing

### Test 7.1: Generate Leave Report
**Steps:**
1. Navigate to Reports → Leave Reports
2. Set parameters:
   ```
   Report Type: Department Summary
   Date Range: Last 3 months
   Department: All
   Include: Pending, Approved, Rejected
   ```
3. Click "Generate Report"
4. Review report
5. Export to Excel

**Expected Results:**
- ✅ Report generates with charts
- ✅ Data is accurate
- ✅ Can drill down to details
- ✅ Excel export works

### Test 7.2: Dashboard Analytics
**Steps:**
1. Navigate to Dashboard
2. Check widgets:
   - Employee count
   - Leave statistics
   - Pending approvals
   - Birthday reminders
3. Change date range
4. Refresh data

**Expected Results:**
- ✅ All widgets load data
- ✅ Real-time updates work
- ✅ Charts are interactive
- ✅ Data is current

### Test 7.3: Custom Reports
**Steps:**
1. Go to Reports → Custom Report Builder
2. Select data source: "Employees"
3. Choose fields:
   - Name, Department, Join Date, Leave Balance
4. Add filters:
   - Department = IT
   - Status = Active
5. Generate report
6. Save report template

**Expected Results:**
- ✅ Report builder works
- ✅ Filters apply correctly
- ✅ Can save for reuse
- ✅ Export options available

---

## 🔍 Verification Checklist

After completing all tests, verify:

### System Health
- [ ] No JavaScript errors in console
- [ ] All API calls return 200 status
- [ ] Page load time < 3 seconds
- [ ] No broken images or links

### Data Integrity
- [ ] User data saves correctly
- [ ] Leave balances accurate
- [ ] Payroll calculations correct
- [ ] Documents accessible

### Security
- [ ] Cannot access without login
- [ ] Role permissions enforced
- [ ] Sensitive data protected
- [ ] Session timeout works

### User Experience
- [ ] All buttons clickable
- [ ] Forms validate properly
- [ ] Success/error messages clear
- [ ] Navigation intuitive

---

## 📝 Test Results Recording

For each test, record:
1. **Test ID**: (e.g., 1.1, 2.3)
2. **Date/Time**: When tested
3. **Tester**: Who performed test
4. **Result**: Pass/Fail
5. **Notes**: Any issues or observations
6. **Screenshots**: For failures

### Sample Test Log Entry
```
Test ID: 3.1 - Create New User
Date: 2025-01-26 14:30
Tester: QA Team
Result: PASS
Notes: User created successfully, email notification sent
Screenshot: N/A
```

---

## 🚨 Issue Reporting Template

When reporting issues:

```markdown
### Issue Title
[Feature] - Brief description

### Environment
- Browser: Chrome 120
- OS: Windows 11
- User Role: Admin
- URL: http://localhost:3727/users

### Steps to Reproduce
1. Step one
2. Step two
3. Step three

### Expected Result
What should happen

### Actual Result
What actually happened

### Screenshot/Video
[Attach here]

### Priority
Critical / High / Medium / Low
```

---

*Last Updated: 2025-01-26*
*Version: 2.0 - Detailed Steps Added*