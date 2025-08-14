# User Guide

HR Management System - Payroll Excel Upload with Preview Feature

## Getting Started

Welcome to the HR Management System. This guide will help you understand how to use the Excel upload feature with the new preview functionality for payroll processing.

### System Requirements
- Modern web browser (Chrome, Firefox, Edge, Safari)
- Excel files (.xlsx format)
- Valid user credentials with appropriate permissions

### Access Levels
- **Admin**: Full access to all features including upload, preview, and confirmation
- **Supervisor**: Can upload and preview but requires admin approval for final confirmation
- **User**: View-only access to their own payroll data

## Excel Upload Process

The new payroll Excel upload process consists of three main steps:

### Step 1: Select and Upload File

1. Navigate to the Payroll section in the main menu
2. Click on "Upload Excel" button
3. Select your Excel file using the file browser
4. The system will validate the file format before proceeding

**Important**: The Excel file must follow the standard payroll template format. Download the template from the system if needed.

### Step 2: Preview and Validate Data

After uploading, you'll see a comprehensive preview of the data:

1. **Summary Dashboard**
   - Total records processed
   - Valid records count
   - Records with errors or warnings
   - Estimated processing time

2. **Data Table View**
   - All parsed records displayed in a grid
   - Color-coded status indicators:
     - Green: Valid and matched
     - Yellow: Warning (will be processed but needs attention)
     - Red: Error (will not be processed)
   
3. **Error and Warning Details**
   - Specific issues listed by row and field
   - Suggested fixes for common problems
   - Option to download error report

### Step 3: Confirm or Cancel

After reviewing the preview:

1. **To Confirm**: Click "Confirm and Process" button
   - Data will be permanently saved to the database
   - You'll receive a confirmation with processing details
   - A summary report will be generated

2. **To Cancel**: Click "Cancel" button
   - No data will be saved
   - You can fix issues and re-upload
   - Temporary preview data will be cleared

## Preview Feature

### Understanding the Preview

The preview feature allows you to:
- Validate data before committing to database
- Identify and fix errors before processing
- Review calculated values and deductions
- Ensure employee matching is correct

### Preview Data Elements

1. **Employee Information**
   - Employee ID and name matching
   - Department verification
   - Active status check

2. **Salary Components**
   - Base salary
   - Overtime payments
   - Incentives and bonuses
   - All deductions (tax, insurance, pension, etc.)
   - Net pay calculation

3. **Validation Status**
   - Matching status with existing employees
   - Duplicate record detection
   - Data format validation
   - Business rule compliance

### Preview Token Security

- Each preview generates a unique secure token
- Token expires after 30 minutes
- Token is required for confirmation
- Prevents duplicate submissions

## Common Tasks

### Uploading Monthly Payroll

1. Prepare your Excel file with current month's data
2. Log in with your admin credentials
3. Navigate to Payroll → Upload Excel
4. Select your file and click Upload
5. Review the preview carefully
6. Fix any errors if needed
7. Confirm to process the payroll

### Handling Upload Errors

When errors occur during preview:

1. **Employee Not Found**
   - Verify employee ID in the system
   - Check if employee is active
   - Ensure correct spelling of names

2. **Duplicate Records**
   - Check if payroll for this period already exists
   - Remove duplicate rows from Excel
   - Use the override option if updating

3. **Invalid Format**
   - Ensure numeric fields contain only numbers
   - Check date formats (YYYY-MM-DD)
   - Remove special characters from IDs

### Downloading Reports

After successful processing:
1. Click "Download Report" button
2. Choose format (PDF or Excel)
3. Report includes all processed records
4. Save for your records

## Troubleshooting

### Common Issues and Solutions

#### File Upload Fails
- **Issue**: "Invalid file format" error
- **Solution**: Ensure file is .xlsx format, not .xls or .csv

#### Preview Takes Too Long
- **Issue**: Preview loading exceeds 30 seconds
- **Solution**: 
  - Check file size (should be under 10MB)
  - Reduce number of records per upload
  - Check internet connection

#### Employee Matching Errors
- **Issue**: "Employee not found" warnings
- **Solution**:
  - Verify employee exists in system
  - Check for typos in employee ID
  - Ensure employee is marked as active

#### Token Expired Error
- **Issue**: "Preview token expired" when confirming
- **Solution**:
  - Re-upload the file (tokens expire after 30 minutes)
  - Complete the process without long delays
  - Don't use browser back button during process

#### Calculation Mismatches
- **Issue**: Net pay doesn't match expectations
- **Solution**:
  - Review deduction rates in system settings
  - Check overtime calculation rules
  - Verify incentive formulas

### Getting Help

If you encounter issues not covered in this guide:

1. Check the error message details
2. Take a screenshot of the error
3. Contact your system administrator
4. Provide:
   - Error message
   - Steps to reproduce
   - File name and upload time
   - Your username and role

## Best Practices

### Before Uploading
- Always backup your Excel file
- Verify data accuracy in Excel first
- Check for duplicate entries
- Ensure all employees are in the system

### During Preview
- Review all warnings carefully
- Check calculated totals
- Verify employee matches
- Note any unusual values

### After Processing
- Download and save the confirmation report
- Verify data in employee records
- Check payslip generation
- Archive the original Excel file

## Examples

### Sample Excel Format

Your Excel file should have the following columns:
```
| Employee ID | Name | Base Salary | Overtime | Incentives | Tax | Insurance | Pension | Other |
|------------|------|-------------|----------|------------|-----|-----------|---------|-------|
| EMP001     | John | 50000       | 5000     | 3000       | 5000| 2000      | 2500    | 500   |
```

### Sample Preview Response

After uploading, you'll see:
```
Summary:
- Total Records: 50
- Valid: 48
- Warnings: 2
- Errors: 0

Actions Available:
[Confirm and Process] [Cancel] [Download Error Report]
```

### Sample Error Message

```
Row 15: Employee ID 'EMP999' not found in system
Row 23: Duplicate payroll record for employee 'EMP005' for period 2024-01
Row 31: Invalid salary amount - negative value not allowed
```

## Security Notes

- All uploads are logged for audit purposes
- Sensitive data is encrypted during transmission
- Preview data is temporarily stored and auto-deleted
- Only authorized roles can perform uploads
- Each action is tied to your user account

## Version History

- v2.0 (Current): Preview feature added
- v1.5: Bulk upload support
- v1.0: Initial Excel upload feature

---

For technical support or additional questions, please contact the HR System Administrator.