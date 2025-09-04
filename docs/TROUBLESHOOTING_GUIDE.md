# Troubleshooting Guide

HR Management System - Problem Resolution and Error Handling

## Quick Reference

| Problem | Quick Solution |
|---------|---------------|
| Login fails | Check username/password, clear browser cache |
| Upload times out | Reduce file size, check internet connection |
| Preview not loading | Refresh page, check file format |
| Token expired | Re-upload file within 30 minutes |
| Employee not found | Verify employee ID in system |
| Duplicate payroll | Check if period already processed |

## Common Errors

### Error Code Reference

| Error Code | Description | Solution |
|------------|-------------|----------|
| AUTH_001 | Invalid credentials | Verify username and password |
| AUTH_002 | Token expired | Login again to get new token |
| AUTH_003 | Insufficient permissions | Contact admin for role upgrade |
| UPLOAD_001 | Invalid file format | Use .xlsx format only |
| UPLOAD_002 | File too large | Limit to 10MB per file |
| UPLOAD_003 | Processing timeout | Split into smaller files |
| DB_001 | Connection failed | Check database status |
| DB_002 | Duplicate entry | Remove duplicate records |
| VALIDATION_001 | Missing required fields | Fill all mandatory fields |
| VALIDATION_002 | Invalid data format | Check data types and formats |

## Upload Issues

### Excel File Upload Problems

#### Problem: File Format Not Accepted
**Error:** "Invalid file format. Please upload an Excel file (.xlsx)"

**Cause:** 
- File is in wrong format (.xls, .csv, .txt)
- File extension is incorrect
- File is corrupted

**Solution:**
1. Save file as .xlsx format in Excel
2. Use "Save As" → Excel Workbook (.xlsx)
3. Don't use CSV or old Excel formats
4. Re-download template if needed

---

#### Problem: Upload Fails Immediately
**Error:** "Upload failed. Please try again."

**Cause:**
- Network connection issues
- Server temporarily unavailable
- Browser compatibility issues

**Solution:**
1. Check internet connection
2. Try a different browser (Chrome recommended)
3. Clear browser cache and cookies
4. Disable browser extensions
5. Wait 5 minutes and retry

---

#### Problem: File Too Large Error
**Error:** "File size exceeds maximum limit of 10MB"

**Cause:**
- Excel file contains too many records
- File has embedded images or objects
- Hidden sheets with data

**Solution:**
1. Split data into multiple files (max 1000 rows each)
2. Remove embedded images and objects
3. Delete hidden sheets
4. Clear formatting from unused cells
5. Save as new file to reduce size

### Preview Issues

#### Problem: Preview Takes Too Long
**Error:** "Preview generation timeout"

**Cause:**
- Large file processing
- Server under heavy load
- Complex calculations required

**Solution:**
1. Reduce number of records
2. Upload during off-peak hours
3. Simplify data (remove unnecessary columns)
4. Contact admin if persists

---

#### Problem: Preview Token Expired
**Error:** "Preview token has expired. Please upload again."

**Cause:**
- Took longer than 30 minutes to confirm
- Browser session timeout
- Page was refreshed

**Solution:**
1. Complete preview and confirmation within 30 minutes
2. Don't refresh page during process
3. Re-upload file if token expires
4. Save work frequently

---

#### Problem: Employee Matching Failures
**Error:** "Employee ID not found: EMP123"

**Cause:**
- Employee doesn't exist in system
- Employee ID typo
- Employee is deactivated

**Solution:**
1. Verify employee ID in user management
2. Check for typos and extra spaces
3. Ensure employee is active
4. Add missing employees before upload
5. Use exact ID format from system

## Authentication Problems

### Login Issues

#### Problem: Cannot Login
**Error:** "Invalid username or password"

**Cause:**
- Incorrect credentials
- Account locked
- Password expired

**Solution:**
1. Verify username (case-sensitive)
2. Check password (case-sensitive)
3. Clear browser cache
4. Try incognito/private mode
5. Contact admin if account locked

---

#### Problem: Session Keeps Expiring
**Error:** "Session expired. Please login again."

**Cause:**
- JWT token expired (24 hours)
- Browser security settings
- Multiple login attempts

**Solution:**
1. Login again to refresh token
2. Check browser allows cookies
3. Don't login from multiple devices
4. Enable "Remember Me" if available

---

#### Problem: Unauthorized Access
**Error:** "You don't have permission to access this resource"

**Cause:**
- Insufficient role permissions
- Feature restricted to admins
- Account permissions changed

**Solution:**
1. Verify your role (User/Supervisor/Admin)
2. Request permission from admin
3. Login with appropriate account
4. Check if feature is role-specific

## Performance Issues

### Slow System Response

#### Problem: Pages Load Slowly
**Symptoms:** Long loading times, timeouts

**Cause:**
- Network latency
- Server overload
- Large data queries
- Browser cache full

**Solution:**
1. Clear browser cache and cookies
2. Check internet speed
3. Close unnecessary browser tabs
4. Try during off-peak hours
5. Reduce data date ranges

---

#### Problem: Reports Take Too Long
**Symptoms:** Report generation timeout

**Cause:**
- Large date range selected
- Too many employees
- Complex calculations

**Solution:**
1. Reduce date range (month by month)
2. Filter by department
3. Export in smaller batches
4. Use pagination when viewing

---

#### Problem: Data Tables Not Loading
**Symptoms:** Empty tables, infinite loading

**Cause:**
- JavaScript errors
- Network timeout
- Data corruption

**Solution:**
1. Refresh page (F5)
2. Clear browser cache
3. Check browser console for errors
4. Disable ad blockers
5. Update browser to latest version

## Database Errors

### Connection Issues

#### Problem: Database Connection Failed
**Error:** "Unable to connect to database"

**Cause:**
- MongoDB service down
- Network issues
- Connection string invalid

**Solution:**
1. Contact system administrator
2. Check MongoDB service status
3. Verify network connectivity
4. Wait and retry after 5 minutes

---

#### Problem: Duplicate Record Errors
**Error:** "Duplicate payroll record for period"

**Cause:**
- Payroll already processed
- Duplicate upload attempt
- Database constraint violation

**Solution:**
1. Check if period already processed
2. Use update instead of create
3. Delete existing record first (admin only)
4. Verify correct pay period

---

#### Problem: Data Not Saving
**Error:** "Failed to save data"

**Cause:**
- Validation errors
- Database full
- Transaction failed

**Solution:**
1. Check all required fields
2. Verify data formats
3. Contact admin for database status
4. Retry save operation
5. Check for validation messages

## API Errors

### Common API Issues

#### Problem: 404 Not Found
**Error:** "API endpoint not found"

**Cause:**
- Incorrect URL
- API version mismatch
- Route not deployed

**Solution:**
1. Verify API endpoint URL
2. Check API documentation
3. Ensure using correct base URL
4. Contact development team

---

#### Problem: 500 Internal Server Error
**Error:** "Internal server error occurred"

**Cause:**
- Server exception
- Database error
- Code bug

**Solution:**
1. Retry the operation
2. Check if reproducible
3. Note exact steps to reproduce
4. Report to administrator
5. Check server logs (admin only)

---

#### Problem: Rate Limit Exceeded
**Error:** "Too many requests. Please wait."

**Cause:**
- Exceeded 5 requests in 5 minutes
- Automated scripts running
- Multiple upload attempts

**Solution:**
1. Wait 5 minutes before retry
2. Don't use automated tools
3. Avoid rapid clicking
4. Complete one upload at a time

## Browser-Specific Issues

### Chrome
- Enable JavaScript
- Allow cookies for site
- Disable aggressive ad blockers
- Update to version 90+

### Firefox
- Clear cache regularly
- Disable tracking protection for site
- Update to version 88+

### Edge
- Use Chromium-based version
- Clear browsing data
- Update to latest version

### Safari
- Enable cross-site tracking
- Clear website data
- Update to version 14+

## Common Solutions

### Clear Browser Cache
1. Press Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)
2. Select "Cached images and files"
3. Choose time range "All time"
4. Click "Clear data"
5. Restart browser

### Check Console Errors
1. Press F12 to open Developer Tools
2. Click "Console" tab
3. Look for red error messages
4. Take screenshot for support

### Verify File Format
1. Open file in Excel
2. Click File → Save As
3. Choose "Excel Workbook (.xlsx)"
4. Don't use .xls or .csv formats

### Test Network Connection
1. Visit other websites
2. Run speed test
3. Check VPN if using
4. Try mobile hotspot
5. Contact IT support

## Error Reporting

### Information to Provide

When reporting an issue, include:

1. **Error Details**
   - Exact error message
   - Error code if shown
   - Time of occurrence

2. **Steps to Reproduce**
   - What you were doing
   - Sequence of actions
   - Data being processed

3. **Environment**
   - Browser and version
   - Operating system
   - Network (office/home/VPN)

4. **Screenshots**
   - Error message
   - Browser console
   - Network tab (if relevant)

### How to Get Help

1. **Immediate Support**
   - Check this troubleshooting guide
   - Ask colleagues if they face same issue
   - Try quick fixes first

2. **Contact Administrator**
   - Email: admin@hr-system.local
   - Include error details
   - Attach screenshots

3. **Emergency Support**
   - For critical issues only
   - Contact IT helpdesk
   - Provide incident priority

## Preventive Measures

### Best Practices to Avoid Issues

1. **Regular Maintenance**
   - Clear browser cache weekly
   - Update browser monthly
   - Check for system announcements

2. **Data Preparation**
   - Validate data before upload
   - Use correct templates
   - Keep backups of files

3. **System Usage**
   - Don't rush through processes
   - Read error messages carefully
   - Complete one task at a time

4. **Security**
   - Don't share login credentials
   - Logout when done
   - Report suspicious activity

## Frequently Encountered Scenarios

### Scenario: Monthly Payroll Upload Fails

**Steps to resolve:**
1. Verify file format is .xlsx
2. Check file size < 10MB
3. Ensure all employee IDs exist
4. Confirm no duplicate records
5. Preview before confirming
6. Complete within 30 minutes

### Scenario: Cannot Access Admin Features

**Steps to resolve:**
1. Confirm you have Admin role
2. Logout and login again
3. Clear browser cache
4. Check with another admin
5. Verify permissions haven't changed

### Scenario: Reports Show Wrong Data

**Steps to resolve:**
1. Check filter settings
2. Verify date range
3. Refresh the page
4. Clear cache and retry
5. Compare with source data

## Advanced Troubleshooting

### For Technical Users

#### Check API Response
```javascript
// Open browser console (F12)
// Go to Network tab
// Perform the action
// Check response status and body
```

#### Verify JWT Token
```javascript
// In console:
localStorage.getItem('token')
// Check if token exists and not expired
```

#### Test API Endpoint
```bash
curl -X GET https://api-url/endpoint \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Contact and Support

### Support Channels

**Level 1 - Self Service**
- This troubleshooting guide
- User documentation
- FAQ section

**Level 2 - Peer Support**
- Department supervisor
- Experienced users
- Internal forums

**Level 3 - IT Support**
- Email: support@hr-system.local
- Phone: Extension 1234
- Ticket system: http://helpdesk

**Level 4 - Emergency**
- System Administrator
- Development Team
- External vendor support

### Response Times

| Priority | Response Time | Resolution Time |
|----------|--------------|-----------------|
| Critical | 1 hour | 4 hours |
| High | 4 hours | 1 day |
| Medium | 1 day | 3 days |
| Low | 3 days | 1 week |

---

Last Updated: 2024-03-15
Version: 2.0