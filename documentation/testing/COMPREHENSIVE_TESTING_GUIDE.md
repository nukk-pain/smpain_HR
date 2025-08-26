# 🧪 HR System Comprehensive Testing Guide

## 📋 Table of Contents
1. [Testing Prerequisites](#testing-prerequisites)
2. [Test Data Setup](#test-data-setup)
3. [Testing Order & Dependencies](#testing-order--dependencies)
4. [Feature Testing Checklist](#feature-testing-checklist)
5. [Detailed Test Procedures](#detailed-test-procedures)

---

## 🔧 Testing Prerequisites

### Environment Setup
```bash
# 1. Start MongoDB (if not running)
mongod

# 2. Reset database to clean state
cd backend
MONGODB_URI=mongodb://localhost:27017/SM_nomu npm run db:reset

# 3. Start backend server
cd backend
npm run dev

# 4. Start frontend server
cd frontend
npm run dev
```

### Access URLs
- Frontend: http://localhost:3727
- Backend API: http://localhost:5455
- Default Admin: `admin` / `admin`

---

## 📊 Test Data Setup

### Initial Users to Create
| Username | Password | Role | Department | Team |
|----------|----------|------|------------|------|
| admin | admin | Admin | Management | - |
| john.manager | Test123! | Supervisor | IT | Backend |
| sarah.hr | Test123! | Supervisor | HR | Recruitment |
| mike.dev | Test123! | User | IT | Backend |
| emma.designer | Test123! | User | Marketing | Design |
| alex.sales | Test123! | User | Sales | B2B |

### Departments to Create
1. **IT Department** - Teams: Backend, Frontend, DevOps
2. **HR Department** - Teams: Recruitment, Training, Benefits
3. **Marketing** - Teams: Design, Content, Digital
4. **Sales** - Teams: B2B, B2C, Support
5. **Finance** - Teams: Accounting, Payroll, Budget

---

## 🎯 Testing Order & Dependencies

### Phase 1: Foundation Setup (Admin Required)
1. ✅ Authentication & Login
2. ✅ Department Creation
3. ✅ User Account Creation
4. ✅ Role Assignment & Permissions

### Phase 2: Core Features (Any User)
5. ✅ Profile Management
6. ✅ Leave Request Creation
7. ✅ Leave Balance Check
8. ✅ Team Calendar View

### Phase 3: Management Features (Supervisor/Admin)
9. ✅ Leave Approval Workflow
10. ✅ Team Management
11. ✅ User Status Management (Active/Inactive)
12. ✅ Permission Management

### Phase 4: Payroll & Reports (Admin)
13. ✅ Payroll Data Upload (Excel)
14. ✅ Payslip Generation
15. ✅ Incentive Calculation
16. ✅ Report Generation

### Phase 5: Advanced Features
17. ✅ Document Management
18. ✅ Leave Overview & Analytics
19. ✅ Excel Export/Import
20. ✅ System Settings

---

## ✅ Feature Testing Checklist

### 🔐 1. Authentication System
- [x] Login with admin credentials
- [x] Login with wrong password (should fail)
- [ ] Check JWT token in localStorage
- [ ] Verify auto-redirect when not logged in
- [x] Test logout functionality
- [ ] Test session persistence (refresh page)
- [ ] Test token expiration handling

### 🏢 2. Department Management
- [ ] Create new department
- [ ] Edit department name
- [ ] Add teams to department
- [ ] View department list
- [ ] Delete department (check dependencies)
- [ ] Assign users to departments

### 👥 3. User Management
- [ ] Create new user (all roles)
- [ ] Edit user information
- [ ] Change user password
- [ ] Activate/Deactivate user
- [ ] Change user role
- [ ] Delete user
- [ ] Bulk user import (Excel)
- [ ] Search and filter users
- [ ] View user details

### 🏖️ 4. Leave Management
- [ ] Submit leave request
- [ ] Edit pending request
- [ ] Cancel leave request
- [ ] View leave balance
- [ ] Check leave history
- [ ] Approve leave (supervisor)
- [ ] Reject leave with reason
- [ ] View team leave calendar
- [ ] Check leave statistics
- [ ] Export leave data

### 💰 5. Payroll Management
- [ ] Upload payroll Excel file
- [ ] View monthly payroll
- [ ] Generate individual payslip
- [ ] Calculate incentives
- [ ] Simulate incentive scenarios
- [ ] Edit payroll data
- [ ] Export payroll reports
- [ ] View payroll history
- [ ] Bulk payslip generation

### 📄 6. Document Management
- [ ] Upload documents
- [ ] Categorize documents
- [ ] Download documents
- [ ] Delete documents
- [ ] Search documents
- [ ] Set document permissions
- [ ] View document history

### 📊 7. Reports & Analytics
- [ ] Generate leave report
- [ ] Generate attendance report
- [ ] Generate payroll summary
- [ ] Export reports to Excel
- [ ] View department analytics
- [ ] Dashboard widgets
- [ ] Custom date range reports

### ⚙️ 8. System Settings
- [ ] Update company information
- [ ] Configure leave policies
- [ ] Set holiday calendar
- [ ] Configure email notifications
- [ ] Backup data
- [ ] System logs

---

## 📝 Detailed Test Procedures

### Test Case 1: Complete User Lifecycle
```
1. Login as admin
2. Create department "Test Dept"
3. Create user "test.user" with role "User"
4. Login as test.user
5. Update profile information
6. Submit leave request
7. Login as admin
8. Approve leave request
9. Deactivate test.user
10. Verify test.user cannot login
11. Reactivate test.user
12. Delete test.user
```

### Test Case 2: Leave Request Flow
```
1. Login as employee
2. Check current leave balance
3. Submit leave request:
   - Start Date: Next Monday
   - End Date: Next Wednesday
   - Type: Annual Leave
   - Reason: "Family vacation"
4. Verify request appears as "Pending"
5. Login as supervisor
6. View pending requests
7. Approve the request
8. Login as employee
9. Verify request shows "Approved"
10. Check updated leave balance
```

### Test Case 3: Payroll Processing
```
1. Login as admin
2. Navigate to Payroll Management
3. Download sample Excel template
4. Fill sample data:
   - Employee ID: EMP001
   - Basic Salary: 50000
   - Allowances: 10000
   - Deductions: 5000
5. Upload Excel file
6. Verify data imported correctly
7. Generate payslips
8. Download payslip PDF
9. Export payroll report
```

### Test Case 4: Role-Based Access Control
```
Admin Tests:
1. Access all menu items
2. Create/edit/delete users
3. Access all reports
4. System settings access

Supervisor Tests:
1. Access team management
2. Approve team leaves
3. View team reports
4. Cannot access system settings

User Tests:
1. Access own profile
2. Submit leave requests
3. View own payslips
4. Cannot access admin features
```

### Test Case 5: Data Validation Tests
```
1. Create user with duplicate username (should fail)
2. Submit leave with end date before start date (should fail)
3. Upload malformed Excel file (should show error)
4. Enter invalid email format (should show validation error)
5. Try SQL injection in search fields (should be sanitized)
6. Submit form with missing required fields (should show errors)
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Login Failed
```
Solution:
1. Check backend server is running (port 5455)
2. Verify MongoDB is running
3. Check browser console for CORS errors
4. Clear localStorage and try again
```

### Issue 2: Leave Balance Incorrect
```
Solution:
1. Check user join date
2. Verify leave policy settings
3. Check for pending leave calculations
4. Run leave balance recalculation
```

### Issue 3: Excel Upload Fails
```
Solution:
1. Check file format (must be .xlsx)
2. Verify column headers match template
3. Check for special characters in data
4. Ensure file size < 10MB
```

### Issue 4: Permission Denied
```
Solution:
1. Verify user role assignment
2. Check JWT token validity
3. Clear cache and re-login
4. Verify backend role permissions
```

---

## 📈 Performance Testing

### Load Testing Scenarios
1. **Concurrent Logins**: 50 users login simultaneously
2. **Bulk Operations**: Upload 1000 employee records
3. **Report Generation**: Generate report for 500 employees
4. **API Response Time**: All endpoints < 2 seconds
5. **File Upload**: 10MB Excel file processing

### Performance Benchmarks
- Login response: < 500ms
- Page load: < 2 seconds
- API calls: < 1 second
- Report generation: < 5 seconds
- Excel processing: < 10 seconds

---

## 🔄 Regression Testing

After any code changes, test these critical paths:

### Critical Path 1: Authentication
```
Login → Dashboard → Logout → Login
```

### Critical Path 2: Leave Management
```
Submit Request → Approval → Balance Update
```

### Critical Path 3: Payroll
```
Upload Data → Calculate → Generate Payslips
```

### Critical Path 4: User Management
```
Create User → Assign Role → Deactivate → Reactivate
```

---

## 📱 Cross-Browser Testing

Test on following browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

### Responsive Testing
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

---

## 🚀 API Testing with Postman/curl

### Basic API Test Commands

#### 1. Login
```bash
curl -X POST http://localhost:5455/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

#### 2. Get Users (with token)
```bash
curl -X GET http://localhost:5455/api/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 3. Create User
```bash
curl -X POST http://localhost:5455/api/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "new.user",
    "password": "Test123!",
    "email": "new.user@company.com",
    "role": "User",
    "department": "IT"
  }'
```

#### 4. Submit Leave Request
```bash
curl -X POST http://localhost:5455/api/leave/requests \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-09-01",
    "endDate": "2025-09-03",
    "leaveType": "Annual",
    "reason": "Personal vacation"
  }'
```

---

## 📊 Test Results Template

### Test Execution Summary
| Feature | Test Cases | Passed | Failed | Blocked | Pass Rate |
|---------|------------|--------|--------|---------|-----------|
| Authentication | 7 | - | - | - | - |
| User Management | 9 | - | - | - | - |
| Leave Management | 10 | - | - | - | - |
| Payroll | 9 | - | - | - | - |
| Documents | 6 | - | - | - | - |
| Reports | 7 | - | - | - | - |

### Defects Found
| ID | Feature | Severity | Description | Status |
|----|---------|----------|-------------|--------|
| 001 | - | - | - | - |
| 002 | - | - | - | - |

---

## 🎯 Testing Best Practices

1. **Always reset database** before comprehensive testing
2. **Test with different user roles** to verify permissions
3. **Document any bugs** with steps to reproduce
4. **Take screenshots** of errors or unexpected behavior
5. **Test edge cases** (empty data, special characters, limits)
6. **Verify both positive and negative** test scenarios
7. **Check browser console** for JavaScript errors
8. **Monitor network tab** for failed API calls
9. **Test after deployment** to production environment
10. **Keep test data consistent** for reproducible results

---

## 📝 Notes

- This guide covers functional testing. For automated testing, refer to test scripts in `/scripts` folder
- For production testing, use the deployed URLs instead of localhost
- Always backup data before testing delete operations
- Contact system administrator for test environment access

---

*Last Updated: 2025-08-25*
*Version: 1.0*