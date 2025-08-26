# PayrollGrid Column Customization Test Plan

## Feature Overview
Added column customization feature to PayrollGrid component that allows users to show/hide columns based on their preferences. Settings are persisted in localStorage.

## Test Steps

### 1. Initial Load Test
1. Navigate to the Payroll page (Admin or Supervisor role)
2. Verify all columns are visible by default:
   - 직원명 (Employee Name)
   - 직원ID (Employee ID)
   - 부서 (Department)
   - 직급 (Position)
   - 기본급 (Base Salary)
   - 인센티브 (Incentive)
   - 수당 (Allowances)
   - 보너스 (Bonus)
   - 포상금 (Award)
   - 공제 (Deductions)
   - 지급총액 (Total Payment)
   - 실지급액 (Actual Payment)
   - 작업 (Actions)

### 2. Column Settings Button Test
1. Look for "컬럼 설정" button with Settings icon next to "Excel 내보내기" button
2. Click the button
3. Verify dropdown menu appears with:
   - Title: "표시할 컬럼 선택"
   - Checkbox for each column (except Actions which is always visible)
   - "모두 표시" button
   - "필수만 표시" button

### 3. Hide Columns Test
1. Click "컬럼 설정" button
2. Uncheck some columns (e.g., 직원ID, 직급, 보너스)
3. Click outside to close menu
4. Verify those columns are hidden from the grid
5. Verify remaining columns are still visible

### 4. Show All Columns Test
1. Click "컬럼 설정" button
2. Click "모두 표시" button
3. Verify all checkboxes are checked
4. Close menu
5. Verify all columns are visible in the grid

### 5. Show Essential Only Test
1. Click "컬럼 설정" button
2. Click "필수만 표시" button
3. Verify only these columns are checked:
   - 직원명 (employeeName)
   - 기본급 (base_salary)
   - 지급총액 (input_total)
   - 실지급액 (actual_payment)
4. Close menu
5. Verify only essential columns are visible

### 6. LocalStorage Persistence Test
1. Hide some columns
2. Refresh the page (F5)
3. Verify the same columns remain hidden
4. Navigate to another page and come back
5. Verify column settings are preserved

### 7. Clear LocalStorage Test
1. Open browser DevTools (F12)
2. Go to Application/Storage tab
3. Find and delete 'payrollGridVisibleColumns' key
4. Refresh page
5. Verify all columns are visible again (default state)

### 8. Data Display Test
1. With some columns hidden, verify:
   - Data still displays correctly in visible columns
   - Expandable sections (수당/공제) still work
   - Edit functionality still works
   - Excel export includes all data (not just visible columns)

### 9. Responsive Test
1. Hide many columns to make grid narrower
2. Verify horizontal scrolling works properly
3. Verify column headers align with data

### 10. Edge Cases
1. Hide all columns except Actions
   - Verify at least employee name remains visible
2. Rapidly toggle columns on/off
   - Verify no UI glitches or errors
3. Open column settings while data is loading
   - Verify no errors occur

## Expected Results
- ✅ Column visibility can be toggled individually
- ✅ Settings persist across page refreshes
- ✅ "Show All" and "Essential Only" shortcuts work
- ✅ Grid remains functional with any column configuration
- ✅ No console errors during any operations

## Browser Compatibility
Test on:
- Chrome (latest)
- Firefox (latest)
- Safari (if available)
- Edge (latest)

## Performance Notes
- Column visibility changes should be instant
- No noticeable lag when toggling columns
- LocalStorage operations should not block UI