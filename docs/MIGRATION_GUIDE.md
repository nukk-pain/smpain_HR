# Migration Guide

HR Management System - Version Migration and Upgrade Procedures

## Version History

### Version 2.0 (Current) - Excel Preview Feature
- **Release Date**: March 2024
- **Major Changes**: 
  - Added Excel upload preview functionality
  - Two-step upload process (preview → confirm)
  - Temporary data storage with TTL
  - Enhanced error reporting
  - Modularized Excel processing services

### Version 1.5
- **Release Date**: January 2024
- **Major Changes**:
  - Bulk upload support
  - JWT authentication implementation
  - Session migration from cookies

### Version 1.0
- **Release Date**: November 2023
- **Major Changes**:
  - Initial release
  - Basic Excel upload
  - User management
  - Leave tracking

## Breaking Changes

### v1.x to v2.0

#### API Changes
```diff
- POST /api/payroll/upload-excel
+ POST /api/payroll/excel/preview
+ POST /api/payroll/excel/confirm

- Response: { success: true, data: [...] }
+ Response: { success: true, previewToken: "...", data: [...] }
```

#### Frontend Changes
- New component: `PayrollExcelUploadWithPreview`
- Deprecated: `PayrollExcelUpload` (legacy component)
- New state management: `usePayrollUpload` hook

#### Database Changes
- New collection: `temp_uploads` with TTL index
- Modified `payroll` schema for validation metadata
- Added indexes for performance optimization

## Migration Steps

### Migrating from v1.x to v2.0

#### Step 1: Backup Current System

```bash
# 1. Backup MongoDB database
mongodump --uri="mongodb://localhost:27017/SM_nomu" --out=/backup/pre-v2-$(date +%Y%m%d)

# 2. Backup application files
tar -czf hr-system-v1-backup.tar.gz /path/to/hr-system

# 3. Export environment variables
env > env-backup-$(date +%Y%m%d).txt
```

#### Step 2: Database Migration

```javascript
// Run these commands in MongoDB shell

// 1. Create temp_uploads collection
db.createCollection("temp_uploads");

// 2. Add TTL index for automatic cleanup
db.temp_uploads.createIndex(
  { "expiresAt": 1 },
  { expireAfterSeconds: 0 }
);

// 3. Add new indexes for performance
db.payroll.createIndex({ "employeeId": 1, "payPeriod": 1 });
db.payroll.createIndex({ "createdAt": -1 });
db.users.createIndex({ "isActive": 1, "department": 1 });

// 4. Add migration flag to track status
db.system_config.insertOne({
  migration_version: "2.0",
  migrated_at: new Date(),
  status: "in_progress"
});
```

#### Step 3: Update Backend Code

```bash
# 1. Pull latest code
git fetch origin
git checkout v2.0

# 2. Install new dependencies
npm install

# 3. Update environment variables
echo "TEMP_UPLOAD_TTL=1800000" >> .env
echo "MAX_TEMP_STORAGE_MB=100" >> .env
echo "CLEANUP_INTERVAL_MS=300000" >> .env

# 4. Build the application
npm run build
```

#### Step 4: Update Frontend Code

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install new dependencies
npm install

# 3. Update configuration
# Update src/config/api.js with new endpoints

# 4. Build frontend
npm run build
```

#### Step 5: Deploy with Feature Flag

```javascript
// config/features.js
module.exports = {
  USE_PREVIEW_UPLOAD: process.env.USE_PREVIEW_UPLOAD === 'true' || false,
  LEGACY_UPLOAD_ENABLED: process.env.LEGACY_UPLOAD_ENABLED === 'true' || true
};
```

#### Step 6: Test Migration

Run the migration test checklist:

```bash
# Run automated tests
npm test -- --testSuite=migration

# Manual test checklist
- [ ] Legacy upload endpoint still works
- [ ] New preview endpoint accessible
- [ ] Database indexes created
- [ ] TTL cleanup working
- [ ] User authentication works
- [ ] Existing data accessible
```

## Rollback Procedures

### Emergency Rollback to v1.x

If critical issues occur, follow these steps:

#### Step 1: Stop Current Services

```bash
# Stop application
pm2 stop all
# or
systemctl stop hr-backend

# Note current issues for debugging
echo "Rollback reason: [DESCRIBE ISSUE]" > rollback-log.txt
```

#### Step 2: Restore Database

```bash
# Restore from backup
mongorestore --uri="mongodb://localhost:27017/SM_nomu" --drop /backup/pre-v2-[date]/

# Remove new collections if needed
mongo SM_nomu --eval "db.temp_uploads.drop()"
```

#### Step 3: Restore Application Code

```bash
# Restore from Git
git checkout v1.5
npm install

# Or restore from backup
tar -xzf hr-system-v1-backup.tar.gz -C /
```

#### Step 4: Restore Configuration

```bash
# Restore environment variables
cp env-backup-[date].txt .env

# Remove v2.0 specific variables
sed -i '/TEMP_UPLOAD_TTL/d' .env
sed -i '/MAX_TEMP_STORAGE_MB/d' .env
```

#### Step 5: Restart Services

```bash
# Start application
pm2 start ecosystem.config.js
# or
systemctl start hr-backend

# Verify services running
pm2 status
curl http://localhost:5455/api/health
```

## Data Migration

### Migrating Existing Payroll Data

For systems with existing payroll data, run this migration script:

```javascript
// scripts/migrate-payroll-v2.js
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');

async function migratePayrollData() {
  await connectDB();
  
  // Add validation status to existing records
  const result = await db.payroll.updateMany(
    { validationStatus: { $exists: false } },
    { 
      $set: { 
        validationStatus: 'legacy',
        migrated: true,
        migratedAt: new Date()
      }
    }
  );
  
  console.log(`Migrated ${result.modifiedCount} payroll records`);
  
  // Create summary
  const summary = await db.payroll.aggregate([
    { $group: { 
      _id: "$validationStatus",
      count: { $sum: 1 }
    }}
  ]);
  
  console.log('Migration Summary:', summary);
}

migratePayrollData().catch(console.error);
```

### Schema Updates

```javascript
// Update user schema for new fields
db.users.updateMany(
  { lastUploadAt: { $exists: false } },
  { $set: { lastUploadAt: null } }
);

// Add metadata to departments
db.departments.updateMany(
  { metadata: { $exists: false } },
  { $set: { metadata: {} } }
);
```

## API Migration

### Deprecated Endpoints

These endpoints are deprecated and will be removed in v3.0:

| Old Endpoint | New Endpoint | Deprecation Date | Removal Date |
|-------------|--------------|------------------|--------------|
| POST /api/payroll/upload-excel | POST /api/payroll/excel/preview + confirm | March 2024 | September 2024 |
| GET /api/payroll/status | GET /api/payroll/upload-status | March 2024 | September 2024 |
| POST /api/users/bulk-create | POST /api/users/import | March 2024 | September 2024 |

### Backward Compatibility

To maintain backward compatibility during transition:

```javascript
// routes/payroll-legacy.js
router.post('/upload-excel', async (req, res) => {
  console.warn('DEPRECATED: Using legacy upload endpoint');
  
  // Adapter pattern to use new service
  const preview = await payrollService.preview(req.file);
  const result = await payrollService.confirm(preview.token);
  
  // Return legacy format
  res.json({
    success: true,
    message: 'File uploaded successfully',
    data: result.data
  });
});
```

### API Client Updates

Update API clients to use new endpoints:

```javascript
// Old client code
const response = await fetch('/api/payroll/upload-excel', {
  method: 'POST',
  body: formData
});

// New client code
// Step 1: Preview
const previewResponse = await fetch('/api/payroll/excel/preview', {
  method: 'POST',
  body: formData
});
const { previewToken, data } = await previewResponse.json();

// Step 2: Confirm after user review
const confirmResponse = await fetch('/api/payroll/excel/confirm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ previewToken })
});
```

## Testing Procedures

### Pre-Migration Testing

```bash
# 1. Run full test suite on current version
npm test

# 2. Create test data snapshot
node scripts/create-test-snapshot.js

# 3. Document current behavior
npm run generate-api-docs
```

### Post-Migration Testing

```bash
# 1. Run migration tests
npm test -- tests/migration/

# 2. Verify data integrity
node scripts/verify-migration.js

# 3. Load test new endpoints
npm run load-test
```

### Testing Checklist

#### Functional Tests
- [ ] User login/logout works
- [ ] Excel upload preview displays correctly
- [ ] Preview data matches uploaded file
- [ ] Confirm process saves data correctly
- [ ] Legacy endpoints still functional
- [ ] Reports generate correctly
- [ ] User management operational

#### Performance Tests
- [ ] Upload response time < 2 seconds
- [ ] Preview generation < 5 seconds
- [ ] Database queries optimized
- [ ] Memory usage within limits
- [ ] Concurrent uploads handled

#### Security Tests
- [ ] JWT tokens validated
- [ ] File upload restrictions enforced
- [ ] Rate limiting active
- [ ] CORS properly configured
- [ ] Sensitive data masked in preview

## Monitoring

### Post-Migration Monitoring

Monitor these metrics after migration:

```javascript
// Key metrics to track
const metrics = {
  // Performance
  uploadResponseTime: '< 2s',
  previewGenerationTime: '< 5s',
  confirmationTime: '< 3s',
  
  // Reliability
  errorRate: '< 1%',
  uploadSuccessRate: '> 99%',
  
  // Usage
  dailyUploads: 'track trend',
  previewToConfirmRatio: '> 80%',
  
  // System
  memoryUsage: '< 1GB',
  tempStorageSize: '< 100MB',
  dbConnectionPool: '< 80% utilized'
};
```

### Alert Configuration

```yaml
# alerts.yaml
alerts:
  - name: high_error_rate
    condition: error_rate > 5%
    duration: 5m
    action: notify_admin
    
  - name: temp_storage_full
    condition: temp_storage_size > 90MB
    action: cleanup_temp_data
    
  - name: upload_timeout
    condition: upload_time > 30s
    action: scale_up_instance
```

## Troubleshooting Migration Issues

### Common Migration Problems

#### Problem: Database indexes not created
```bash
# Solution: Manually create indexes
mongo SM_nomu < scripts/create-indexes.js
```

#### Problem: Legacy endpoints not working
```javascript
// Solution: Enable compatibility mode
process.env.LEGACY_MODE = 'true';
```

#### Problem: Memory usage increased
```bash
# Solution: Adjust Node.js memory
node --max-old-space-size=2048 server.js
```

#### Problem: Temp uploads not cleaning up
```javascript
// Solution: Force cleanup
db.temp_uploads.deleteMany({ 
  expiresAt: { $lt: new Date() } 
});
```

## Support

### Getting Help

For migration assistance:

1. **Documentation**: Review this guide and API docs
2. **Support Email**: migration-support@hr-system.local  
3. **Slack Channel**: #hr-system-migration
4. **Office Hours**: Tuesday/Thursday 2-4 PM

### Reporting Issues

When reporting migration issues, include:
- Current version and target version
- Error messages and logs
- Steps to reproduce
- Environment details
- Migration checklist status

---

Last Updated: March 2024
Version: 2.0