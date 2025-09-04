# Payroll System Manual Testing Guide

## AI-HEADER
- **Intent**: Manual testing procedures for payroll system features
- **Domain Meaning**: Quality assurance for compensation management system
- **Misleading Names**: None
- **Data Contracts**: Test data must use non-production employee records
- **PII**: Use test data only, never real employee information
- **Invariants**: All financial calculations must be verified
- **RAG Keywords**: testing, payroll, QA, manual test, verification

## Prerequisites
1. Backend server running on port 5000
2. Frontend running on port 3727
3. MongoDB with test data
4. Admin account (admin/admin)
5. Test user account

## Test Scenarios

### 1. Payroll CRUD Operations

#### 1.1 Create Payroll Record (Admin Only)
**Steps:**
1. Login as Admin
2. Navigate to Payroll > Payroll List
3. Click "Create New Payroll"
4. Fill in:
   - Employee: Select from dropdown
   - Year: 2024
   - Month: Current month
   - Base Salary: 3000000
   - Allowances: Add test values
   - Deductions: Add test values
5. Click Save

**Expected Results:**
- ✅ Payroll record created successfully
- ✅ Net salary auto-calculated correctly
- ✅ Record appears in list
- ✅ Status shows as "pending"

#### 1.2 View Payroll List
**Steps:**
1. Navigate to Payroll > Payroll List
2. Observe the grid display
3. Try filtering by year/month
4. Search for specific employee

**Expected Results:**
- ✅ Grid displays all payroll records (Admin) or only own records (User)
- ✅ Filters work correctly
- ✅ Search updates results in real-time
- ✅ Pagination works if many records

#### 1.3 Edit Payroll Record (Admin Only)
**Steps:**
1. Double-click a payroll record in the list
2. Click "Edit" button
3. Modify some values
4. Click "Save"

**Expected Results:**
- ✅ Form enters edit mode
- ✅ Changes are saved
- ✅ Calculations update automatically
- ✅ Success message displayed

#### 1.4 Delete Payroll Record (Admin Only)
**Steps:**
1. Select a payroll record
2. Click "Delete" button
3. Confirm deletion

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ Record is soft-deleted
- ✅ Status changes to "cancelled"

### 2. Excel Upload/Export

#### 2.1 Excel Bulk Upload (Admin Only)
**Steps:**
1. Navigate to Payroll > Excel Upload
2. Download template (optional)
3. Prepare Excel file with payroll data
4. Drag and drop file or click to browse
5. Wait for upload to complete

**Expected Results:**
- ✅ File validation passes for .xlsx/.xls files
- ✅ Progress bar shows upload status
- ✅ Success summary shows imported records
- ✅ Error details shown for failed records
- ✅ Records appear in payroll list

**Test Data Format:**
```
Row 1: Headers
Row 2: Employee data with base salary and allowances
Row 3: Incentive data for same employee (if using dual-row format)
```

#### 2.2 Excel Export
**Steps:**
1. Navigate to Payroll > Payroll List
2. Apply filters (optional)
3. Click "Export to Excel" button
4. Save downloaded file
5. Open in Excel

**Expected Results:**
- ✅ File downloads successfully
- ✅ Excel contains filtered data
- ✅ Formatting is preserved
- ✅ Calculations are correct
- ✅ Metadata sheet included

### 3. PDF Payslip Management

#### 3.1 Upload PDF Payslip (Admin Only)
**Steps:**
1. Navigate to a payroll record detail
2. Click "Upload Payslip" button
3. Select PDF file (max 5MB)
4. Click Upload

**Expected Results:**
- ✅ Only PDF files accepted
- ✅ File size validation works
- ✅ Upload progress shown
- ✅ Success message displayed
- ✅ PDF appears in payslip section

#### 3.2 Download PDF Payslip
**Steps:**
1. Navigate to payroll record with payslip
2. Click "Download Payslip" button
3. Save/Open PDF

**Expected Results:**
- ✅ PDF downloads with correct filename
- ✅ PDF opens correctly
- ✅ Audit log created (backend)

#### 3.3 Delete PDF Payslip (Admin Only)
**Steps:**
1. Navigate to payroll record with payslip
2. Click "Delete Payslip" button
3. Confirm deletion

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ PDF removed from UI
- ✅ File deleted from server

### 4. Permission Testing

#### 4.1 User Role Restrictions
**Steps:**
1. Login as regular User
2. Navigate to Payroll List
3. Try to access admin features

**Expected Results:**
- ✅ Only see own payroll records
- ✅ Cannot create/edit/delete records
- ✅ Cannot upload Excel
- ✅ Cannot upload/delete payslips
- ✅ Can download own payslips only

#### 4.2 Admin Full Access
**Steps:**
1. Login as Admin
2. Test all CRUD operations
3. Test all upload/download features

**Expected Results:**
- ✅ Can see all payroll records
- ✅ Can perform all CRUD operations
- ✅ Can upload/export Excel
- ✅ Can manage all payslips

### 5. Data Validation

#### 5.1 Required Fields
**Steps:**
1. Try to create payroll without required fields
2. Submit form

**Expected Results:**
- ✅ Validation errors displayed
- ✅ Form not submitted
- ✅ Clear error messages

#### 5.2 Calculation Accuracy
**Steps:**
1. Create payroll with specific values:
   - Base Salary: 3,000,000
   - Overtime: 500,000
   - Meal: 200,000
   - National Pension: 135,000
   - Health Insurance: 103,500

**Expected Results:**
- ✅ Total Allowances = 700,000
- ✅ Total Deductions = 238,500
- ✅ Net Salary = 3,461,500

### 6. Error Handling

#### 6.1 Network Errors
**Steps:**
1. Stop backend server
2. Try to load payroll list
3. Try to save a record

**Expected Results:**
- ✅ Error message displayed
- ✅ No data loss
- ✅ Graceful degradation

#### 6.2 Invalid File Upload
**Steps:**
1. Try uploading non-Excel file for Excel upload
2. Try uploading non-PDF for payslip
3. Try uploading oversized files

**Expected Results:**
- ✅ Clear error messages
- ✅ File rejected before upload
- ✅ No server errors

### 7. Performance Testing

#### 7.1 Large Dataset
**Steps:**
1. Load payroll list with 100+ records
2. Test filtering and search
3. Export to Excel

**Expected Results:**
- ✅ Page loads within 2 seconds
- ✅ Filtering responsive
- ✅ Export completes successfully

#### 7.2 Concurrent Users
**Steps:**
1. Open multiple browser tabs
2. Login as different users
3. Perform operations simultaneously

**Expected Results:**
- ✅ No data conflicts
- ✅ All operations complete
- ✅ Consistent data state

## Test Data Setup

### Sample Employee Data
```javascript
{
  employeeId: "EMP001",
  name: "Test Employee",
  department: "IT",
  position: "Developer"
}
```

### Sample Payroll Data
```javascript
{
  year: 2024,
  month: 12,
  baseSalary: 3000000,
  allowances: {
    overtime: 500000,
    meal: 200000,
    transportation: 150000
  },
  deductions: {
    nationalPension: 135000,
    healthInsurance: 103500,
    incomeTax: 250000
  }
}
```

## Regression Testing Checklist

After any code changes, verify:
- [ ] Login/logout works
- [ ] Navigation menu displays correctly
- [ ] Payroll list loads
- [ ] Create new payroll works
- [ ] Edit existing payroll works
- [ ] Excel upload processes correctly
- [ ] Excel export downloads
- [ ] PDF upload/download works
- [ ] Permissions enforced correctly
- [ ] Calculations accurate

## Known Issues & Workarounds

1. **Issue**: Excel upload may timeout for very large files
   **Workaround**: Split into smaller batches (< 500 records)

2. **Issue**: PDF preview not available
   **Workaround**: Download to view

## Test Result Recording

| Test Case | Pass/Fail | Notes | Tester | Date |
|-----------|-----------|-------|--------|------|
| 1.1 Create Payroll | | | | |
| 1.2 View List | | | | |
| 1.3 Edit Payroll | | | | |
| 1.4 Delete Payroll | | | | |
| 2.1 Excel Upload | | | | |
| 2.2 Excel Export | | | | |
| 3.1 PDF Upload | | | | |
| 3.2 PDF Download | | | | |
| 3.3 PDF Delete | | | | |
| 4.1 User Permissions | | | | |
| 4.2 Admin Permissions | | | | |
| 5.1 Field Validation | | | | |
| 5.2 Calculations | | | | |
| 6.1 Network Errors | | | | |
| 6.2 File Validation | | | | |
| 7.1 Performance | | | | |

## Automation Priority

For future automation, prioritize:
1. Calculation accuracy tests
2. Permission validation tests
3. Excel processing tests
4. API endpoint tests
5. UI interaction tests