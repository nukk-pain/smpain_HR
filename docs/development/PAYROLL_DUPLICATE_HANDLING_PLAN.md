# Payroll Duplicate Data Handling Strategy

## AI-HEADER
- **Intent**: Define strategies for handling duplicate payroll data during imports
- **Domain Meaning**: Conflict resolution for payroll records
- **Misleading Names**: None
- **Data Contracts**: Must maintain data integrity and audit trail
- **PII**: Payroll data must be handled securely
- **Invariants**: No data loss, maintain history
- **RAG Keywords**: duplicate, upsert, overwrite, conflict resolution, payroll import

## Current Issue
When uploading Excel files or creating payroll records, duplicates (same userId + yearMonth) cause 400 errors.

## Proposed Solutions

### 1. Upsert Strategy (Recommended) ✅
**Implementation in `/backend/routes/payroll.js`:**

```javascript
router.post('/monthly', requireAuth, requirePermission('payroll:manage'), asyncHandler(async (req, res) => {
  const { userId, yearMonth, baseSalary, actualPayment } = req.body;
  const { mode = 'create' } = req.query; // 'create', 'upsert', 'overwrite'
  
  if (mode === 'upsert') {
    // Update if exists, create if not
    const result = await db.collection('monthlyPayments').findOneAndUpdate(
      { 
        userId: new ObjectId(userId), 
        yearMonth: yearMonth 
      },
      { 
        $set: {
          baseSalary,
          actualPayment,
          updatedAt: new Date(),
          updatedBy: req.user.id
        },
        $setOnInsert: {
          createdAt: new Date(),
          createdBy: req.user.id
        }
      },
      { 
        upsert: true, 
        returnDocument: 'after' 
      }
    );
    
    return res.status(200).json({
      success: true,
      message: result.lastErrorObject?.updatedExisting ? 'Updated existing record' : 'Created new record',
      data: result.value
    });
  }
  
  // Original create logic...
}));
```

### 2. Excel Upload with Conflict Resolution
**For bulk imports from Excel:**

```javascript
router.post('/excel/upload', requireAuth, asyncHandler(async (req, res) => {
  const { mode = 'skip' } = req.query; // 'skip', 'update', 'replace'
  const { records } = req.body;
  
  const results = {
    created: [],
    updated: [],
    skipped: [],
    errors: []
  };
  
  for (const record of records) {
    const existing = await db.collection('monthlyPayments').findOne({
      userId: record.userId,
      yearMonth: record.yearMonth
    });
    
    if (existing) {
      switch (mode) {
        case 'skip':
          results.skipped.push({
            ...record,
            reason: 'Already exists'
          });
          break;
          
        case 'update':
          // Update only provided fields
          await db.collection('monthlyPayments').updateOne(
            { _id: existing._id },
            { $set: { ...record, updatedAt: new Date() } }
          );
          results.updated.push(record);
          break;
          
        case 'replace':
          // Archive old record
          await db.collection('monthlyPayments_history').insertOne({
            ...existing,
            archivedAt: new Date(),
            archivedBy: req.user.id
          });
          
          // Replace with new
          await db.collection('monthlyPayments').replaceOne(
            { _id: existing._id },
            { ...record, createdAt: new Date() }
          );
          results.updated.push(record);
          break;
      }
    } else {
      // Create new record
      await db.collection('monthlyPayments').insertOne(record);
      results.created.push(record);
    }
  }
  
  return res.json({
    success: true,
    summary: {
      total: records.length,
      created: results.created.length,
      updated: results.updated.length,
      skipped: results.skipped.length,
      errors: results.errors.length
    },
    details: results
  });
}));
```

### 3. Frontend UI Options
**Add conflict resolution options to upload dialog:**

```tsx
// PayrollExcelUpload.tsx
<FormControl>
  <FormLabel>If records already exist:</FormLabel>
  <RadioGroup value={conflictMode} onChange={setConflictMode}>
    <FormControlLabel 
      value="skip" 
      control={<Radio />} 
      label="Skip existing records (safe)" 
    />
    <FormControlLabel 
      value="update" 
      control={<Radio />} 
      label="Update existing records (merge)" 
    />
    <FormControlLabel 
      value="replace" 
      control={<Radio />} 
      label="Replace existing records (overwrite)" 
    />
  </RadioGroup>
</FormControl>

// Show preview of conflicts
{conflicts.length > 0 && (
  <Alert severity="warning">
    Found {conflicts.length} existing records for the same period:
    <List>
      {conflicts.map(c => (
        <ListItem key={c.id}>
          {c.employeeName} - {c.yearMonth}: 
          Current: ₩{c.current} → New: ₩{c.new}
        </ListItem>
      ))}
    </List>
  </Alert>
)}
```

### 4. API Response for Conflicts
**Return detailed conflict information:**

```javascript
// When conflicts detected during preview
res.json({
  success: true,
  hasConflicts: true,
  conflicts: [
    {
      userId: '123',
      employeeName: 'John Doe',
      yearMonth: '2024-12',
      existing: {
        baseSalary: 3000000,
        actualPayment: 3200000,
        lastUpdated: '2024-12-01'
      },
      new: {
        baseSalary: 3500000,
        actualPayment: 3700000
      },
      difference: {
        baseSalary: 500000,
        actualPayment: 500000
      }
    }
  ],
  resolution: {
    skip: 'Keep existing data',
    update: 'Merge new data with existing',
    replace: 'Replace with new data (archive old)'
  }
});
```

## Implementation Priority

### Phase 1: Basic Upsert (Quick Win)
1. Add `?mode=upsert` parameter to POST endpoint
2. Update tests to use upsert mode
3. Document the new parameter

### Phase 2: Excel Upload Enhancement
1. Add conflict detection during preview
2. Implement resolution modes (skip/update/replace)
3. Show conflicts in UI before confirmation

### Phase 3: Full Version Management
1. Create history collection
2. Track all changes with timestamps
3. Add rollback capability

## Benefits

1. **No more 400 errors** on duplicate data
2. **User control** over conflict resolution
3. **Audit trail** with history tracking
4. **Safer imports** with preview and confirmation
5. **Flexibility** for different use cases

## Testing Strategy

```javascript
// Test different conflict modes
describe('Duplicate Handling', () => {
  test('should skip existing records', async () => {
    // Create initial record
    await createPayroll(data);
    
    // Try to create again with skip mode
    const result = await createPayroll(data, { mode: 'skip' });
    expect(result.skipped).toBe(1);
  });
  
  test('should update existing records', async () => {
    // Create initial record
    const initial = await createPayroll(data);
    
    // Update with new data
    const updated = await createPayroll(
      { ...data, baseSalary: 4000000 }, 
      { mode: 'upsert' }
    );
    expect(updated.baseSalary).toBe(4000000);
  });
  
  test('should replace and archive old records', async () => {
    // Create initial record
    await createPayroll(data);
    
    // Replace with history
    await createPayroll(newData, { mode: 'replace' });
    
    // Check history
    const history = await getPayrollHistory(userId, yearMonth);
    expect(history.length).toBe(1);
  });
});
```

## Migration Path

1. **Current state**: Returns 400 on duplicates
2. **Step 1**: Add upsert mode (backward compatible)
3. **Step 2**: Update frontend to use upsert
4. **Step 3**: Add conflict preview for Excel
5. **Step 4**: Implement full history tracking

## Decision Required

Which approach should we implement first?

1. **Quick fix**: Just add `?mode=upsert` parameter (1 day)
2. **Medium solution**: Add conflict preview + resolution modes (3 days)  
3. **Full solution**: Complete version management system (1 week)

**Recommendation**: Start with option 1 (upsert) for immediate relief, then implement option 2 for better UX.