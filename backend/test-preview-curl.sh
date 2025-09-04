#!/bin/bash

# Get token
echo "Getting auth token..."
TOKEN=$(curl -s -X POST http://localhost:5455/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' | \
  grep -o '"token":"[^"]*' | sed 's/"token":"//')

echo "Token received: ${TOKEN:0:20}..."

# Test preview
echo -e "\nTesting preview upload..."
RESPONSE=$(curl -s -X POST http://localhost:5455/api/upload/excel/preview \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/mnt/d/my_programs/HR/sample-data/payroll/excel-templates/연세신명통증의학과_2025년_07월_임금대장_제출.xlsx" \
  -F "year=2025" \
  -F "month=7")

# Analyze response
echo "$RESPONSE" | python3 -c "
import json
import sys

try:
    data = json.load(sys.stdin)
    
    print('\n📊 Preview Response Analysis:')
    print(f'Success: {data.get(\"success\")}')
    
    summary = data.get('summary', {})
    print(f'Total Records: {summary.get(\"totalRecords\")}')
    print(f'Valid Records: {summary.get(\"validRecords\")}')
    print(f'Invalid Records: {summary.get(\"invalidRecords\")}')
    print(f'Warning Records: {summary.get(\"warningRecords\")}')
    
    records = data.get('records', [])
    print(f'\nAnalyzing {len(records)} records...')
    
    # Count statuses
    statuses = {}
    valid_or_warning = 0
    selected_with_fix = 0
    
    for r in records:
        status = r.get('status', 'undefined')
        statuses[status] = statuses.get(status, 0) + 1
        
        # Old logic (problematic)
        if status in ['valid', 'warning']:
            valid_or_warning += 1
        
        # New logic (fixed) - select all except 'invalid'
        if not status or status != 'invalid':
            selected_with_fix += 1
    
    print('\n📈 Status Distribution:')
    for status, count in sorted(statuses.items()):
        print(f'  {status}: {count}')
    
    print(f'\n🎯 Auto-Selection Result:')
    print(f'  OLD LOGIC (valid/warning only): {valid_or_warning} selected')
    old_status = '✅ ENABLED' if valid_or_warning > 0 else '❌ DISABLED'
    print(f'    → Button would be: {old_status}')
    print(f'\n  NEW LOGIC (all except invalid): {selected_with_fix} selected')
    new_status = '✅ ENABLED' if selected_with_fix > 0 else '❌ DISABLED'
    print(f'    → Button would be: {new_status}')
    
    if valid_or_warning == 0 and selected_with_fix > 0:
        print(f'\n  🎉 FIX WORKING! Old logic would disable button, new logic enables it!')
        print(f'  {selected_with_fix} records would now be selectable (including duplicates/unmatched)')
    
    # Show first few records
    print('\n📋 Sample Records:')
    for i, r in enumerate(records[:5]):
        print(f'  Row {i+1}: {r.get(\"employeeName\", \"N/A\")} - Status: {r.get(\"status\", \"undefined\")}')
    
except json.JSONDecodeError as e:
    print('Error parsing JSON:', e)
    print('Raw response:', sys.stdin.read())
except Exception as e:
    print('Error:', e)
"