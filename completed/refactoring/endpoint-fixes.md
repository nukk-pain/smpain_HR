# Endpoint Fixes Required

## Issues Found and Fixed

### 1. ✅ Payroll Upload Endpoints (FIXED)
- **Was**: `/api/payroll-upload`
- **Now**: `/api/upload`
- **Affected**: uploadPayrollFile, getUploadPreview, compareUploadData, processUpload

### 2. ✅ Bonus Endpoints (FIXED)
- **Was**: `/api/payroll/bonus`
- **Now**: `/api/bonus`
- **Was**: `/api/payroll/bonus/${userId}/${yearMonth}`
- **Now**: `/api/bonus/user/${userId}?yearMonth=${yearMonth}`

### 3. ✅ Payslip Upload Endpoint (FIXED)
- **Was**: `/api/payroll/:id/payslip/upload`
- **Now**: `/api/payroll/:id/payslip`

### 4. ✅ Excel Endpoints (FIXED EARLIER)
- **Was**: `/api/payroll/excel/*`
- **Now**: `/api/upload/excel/*`

## Endpoints That Need Backend Implementation

### 1. ⚠️ Calculate Incentive
- **Frontend calls**: `/api/payroll/calculate-incentive`
- **Backend status**: Endpoint doesn't exist
- **Action needed**: Either implement in backend or remove from frontend

### 2. ⚠️ Leave Stats
- **Frontend calls**: `/api/leave/stats/overview`
- **Backend status**: Endpoint doesn't exist
- **Action needed**: Either implement in backend or remove from frontend

### 3. ⚠️ Get All Permissions
- **Frontend calls**: `/api/permissions`
- **Backend status**: Endpoint doesn't exist (only user-specific permissions exist)
- **Action needed**: Either implement in backend or remove from frontend

## Correctly Working Endpoints

### ✅ Auth
- `/api/auth/logout`
- `/api/auth/change-password`

### ✅ Users
- `/api/users/:id`
- `/api/users/:id/permissions`
- `/api/users/stats/overview`

### ✅ Leave
- `/api/leave/*`
- `/api/leave/employee/:id/log`
- `/api/leave/cancellations/*`

### ✅ Admin
- `/api/admin/leave/*` (mounted at `/api/admin/leave/`)
- `/api/admin/stats/system`
- `/api/admin/policy`
- `/api/admin/policy/history`

### ✅ Payroll
- `/api/payroll`
- `/api/payroll/:id`
- `/api/payroll/monthly/:yearMonth`
- `/api/payroll/stats/:yearMonth`

### ✅ Sales
- `/api/sales/:yearMonth`

### ✅ Reports
- `/api/reports/payroll/:yearMonth`

### ✅ Departments
- `/api/departments/*`

### ✅ Positions
- `/api/positions/*`

## Summary

Most endpoints are correctly configured. The main issues were:
1. Payroll upload endpoints pointing to wrong path (FIXED)
2. Bonus endpoints under wrong path (FIXED)
3. Some endpoints that don't exist in backend but are called from frontend (needs decision)