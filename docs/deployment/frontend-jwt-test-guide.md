# Frontend JWT Testing Guide

## Prerequisites
- Chrome/Firefox with Developer Tools
- Deployed frontend URL
- Test accounts ready

## Test Accounts
- **Admin**: admin / 1234
- **Manager**: hyeseong.kim / ths1004
- **User**: yongho.kim / kim1234

## 1. Login and Token Storage Test

### Steps:
1. Open browser Developer Tools (F12)
2. Go to Network tab
3. Navigate to the application URL
4. Login with admin credentials

### Expected Results:
- ✅ Login API call shows in Network tab
- ✅ Response contains `token` field
- ✅ LocalStorage contains `authToken` key (Application tab → Storage → Local Storage)
- ✅ Redirected to dashboard after login

### Check in Console:
```javascript
// Run this in browser console to verify token
localStorage.getItem('authToken')
```

## 2. API Authentication Test

### Steps:
1. Stay logged in and navigate to different pages
2. Watch Network tab for API calls

### Expected Results for Each API Call:
- ✅ Request Headers contain `Authorization: Bearer [token]`
- ✅ Response status is 200 (not 401)
- ✅ Data loads correctly on the page

### Pages to Test:
- Dashboard (/)
- Employee Management (/employees)
- Leave Requests (/leave)
- Payroll (/payroll)
- Reports (/reports)

## 3. Page Refresh Test

### Steps:
1. While logged in, press F5 to refresh
2. Check if still authenticated

### Expected Results:
- ✅ No redirect to login page
- ✅ User info still displayed
- ✅ API calls still work

## 4. Token Expiration Test

### Steps:
1. Open Developer Tools → Application → Local Storage
2. Modify the token to make it invalid:
   ```javascript
   localStorage.setItem('authToken', 'invalid-token-here')
   ```
3. Refresh the page or navigate to another page

### Expected Results:
- ✅ Automatically redirected to login page
- ✅ Token removed from localStorage
- ✅ Error message displayed (optional)

## 5. Logout Test

### Steps:
1. Click logout button
2. Check localStorage and network

### Expected Results:
- ✅ Token removed from localStorage
- ✅ Redirected to login page
- ✅ Cannot access protected pages without logging in again

## 6. CRUD Operations Test

### Admin User Tests:
1. **Create Employee**
   - Go to Employee Management
   - Click Add Employee
   - Fill form and submit
   - ✅ Check Network tab for Authorization header
   - ✅ Employee created successfully

2. **Update Employee**
   - Click edit on any employee
   - Modify data and save
   - ✅ Changes saved successfully

3. **Delete Employee**
   - Click delete on test employee
   - ✅ Employee removed from list

### Manager User Tests:
1. **Approve Leave**
   - Login as manager
   - Go to Leave Requests
   - Approve/Reject a request
   - ✅ Status updated successfully

### Regular User Tests:
1. **Submit Leave Request**
   - Login as regular user
   - Create new leave request
   - ✅ Request submitted successfully

## 7. Error Handling Test

### Test Network Errors:
1. Open Network tab
2. Set throttling to "Offline"
3. Try to navigate or perform actions

### Expected Results:
- ✅ Error messages displayed to user
- ✅ No app crash
- ✅ Can recover when connection restored

## Common Issues and Solutions

### Issue: "Unauthorized" errors after login
**Check:**
- Token exists in localStorage
- Authorization header format is correct
- Token hasn't expired

### Issue: Lost authentication after refresh
**Check:**
- Token persistence in localStorage
- AuthProvider initialization on app load
- API client interceptor configuration

### Issue: CORS errors
**Check:**
- Backend CORS configuration
- Frontend API base URL
- Request headers

## Browser Console Commands for Debugging

```javascript
// Check current token
localStorage.getItem('authToken')

// Decode JWT token (paste token manually)
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}
parseJwt(localStorage.getItem('authToken'))

// Check token expiration
function isTokenExpired(token) {
  const payload = parseJwt(token);
  return Date.now() >= payload.exp * 1000;
}
isTokenExpired(localStorage.getItem('authToken'))

// Force logout
localStorage.removeItem('authToken')
window.location.href = '/login'
```

## Test Checklist Summary

- [ ] Login creates and stores JWT token
- [ ] All API calls include Authorization header
- [ ] Authentication persists after page refresh
- [ ] Invalid/expired tokens redirect to login
- [ ] Logout clears token and redirects
- [ ] CRUD operations work for all user roles
- [ ] Error handling works gracefully
- [ ] No console errors during normal operation