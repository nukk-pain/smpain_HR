# 🚀 Production Deployment Plan - Unified Documents Collection

**Created:** 2025-01-20  
**Status:** Ready for Review

## 📋 Pre-Deployment Checklist

### ✅ Development Environment Status
- [x] Migration script tested and working
- [x] All backend routes updated to use unified collection
- [x] API endpoints tested and verified
- [x] Frontend compatibility confirmed (no changes needed)
- [x] Test data cleaned up
- [x] 16 documents successfully migrated in dev
- [x] All indexes created (12 indexes)

### ⚠️ Known Issues (Acceptable)
- 6 test documents have missing files (test data from original collection)
- 2 duplicate payslips in test data
- 3 users in documents don't exist in users collection (test data)
- **Overall health score: 50%** (acceptable for test environment)

## 🔧 Production Deployment Steps

### Phase 1: Pre-Deployment (Day 1 - Morning)
```bash
# 1. Backup production database
mongodump --uri="mongodb+srv://[PROD_CONNECTION_STRING]" --out=/backup/prod_backup_$(date +%Y%m%d)

# 2. Verify backup
mongorestore --dryRun --dir=/backup/prod_backup_$(date +%Y%m%d)

# 3. Create rollback script
cp /mnt/d/my_programs/HR/backend/scripts/rollback-migration.js /deployment/
```

### Phase 2: Code Deployment (Day 1 - Afternoon)
```bash
# 1. Deploy backend changes to Google Cloud Run
gcloud run deploy hr-backend \
  --source . \
  --region asia-northeast3 \
  --platform managed

# 2. Verify deployment
curl https://hr-backend-429401177957.asia-northeast3.run.app/health

# 3. Check logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=hr-backend" --limit 50
```

### Phase 3: Database Migration (Day 1 - Evening/Low Traffic)
```bash
# 1. Run migration in DRY RUN mode first
NODE_ENV=production DRY_RUN=true node scripts/migrateToUnifiedCollection.js

# 2. Review dry run results
# Expected: ~X documents to migrate

# 3. Execute actual migration
NODE_ENV=production node scripts/migrateToUnifiedCollection.js

# 4. Create indexes
NODE_ENV=production node scripts/createUnifiedIndexes.js

# 5. Verify migration
NODE_ENV=production node verify-migration.js
```

### Phase 4: Validation (Day 2 - Morning)
```bash
# 1. Test user document access
curl -X GET https://hr-backend-429401177957.asia-northeast3.run.app/api/documents \
  -H "Authorization: Bearer [USER_TOKEN]"

# 2. Test admin document access
curl -X GET https://hr-backend-429401177957.asia-northeast3.run.app/api/documents/admin/all \
  -H "Authorization: Bearer [ADMIN_TOKEN]"

# 3. Monitor error rates
gcloud monitoring dashboards list
```

### Phase 5: Cleanup (Day 3 - After Validation)
```bash
# 1. Archive old collections (DO NOT DELETE YET)
NODE_ENV=production node -e "
const { MongoClient } = require('mongodb');
(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  // Rename old collections
  await db.collection('payslips').rename('payslips_archived_20250120');
  await db.collection('payroll_documents').rename('payroll_documents_archived_20250120');
  await db.collection('documents').rename('documents_archived_20250120');
  
  console.log('✅ Old collections archived');
  await client.close();
})();
"

# 2. Update monitoring alerts
# 3. Document completion
```

## 🔄 Rollback Plan

If issues occur, execute rollback immediately:

```bash
# 1. Revert code deployment
gcloud run deploy hr-backend --image=[PREVIOUS_IMAGE_URL]

# 2. Drop unified collection
NODE_ENV=production node -e "
const { MongoClient } = require('mongodb');
(async () => {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  await db.collection('unified_documents').drop();
  console.log('✅ Unified collection dropped');
  await client.close();
})();
"

# 3. Restore from backup if needed
mongorestore --uri="mongodb+srv://[PROD_CONNECTION_STRING]" --dir=/backup/prod_backup_[DATE]
```

## 📊 Success Metrics

### Immediate (Day 1)
- [ ] All API endpoints responding < 500ms
- [ ] Zero 500 errors in first hour
- [ ] Document counts match expectations

### Short-term (Week 1)
- [ ] Users can see all their documents
- [ ] Admin can see documents from all collections
- [ ] No increase in support tickets

### Long-term (Month 1)
- [ ] System stability maintained
- [ ] Performance metrics improved
- [ ] Storage optimization achieved

## 👥 Stakeholders

| Role | Name | Contact | Responsibility |
|------|------|---------|---------------|
| Technical Lead | | | Final approval |
| Backend Dev | Claude AI | | Migration execution |
| DevOps | | | Cloud deployment |
| QA | | | Validation testing |
| Support | | | User communication |

## 📝 Communication Plan

### Pre-Deployment
- [ ] Email to all users about maintenance window
- [ ] Slack notification to dev team

### During Deployment
- [ ] Status updates every 30 minutes
- [ ] Immediate alert if rollback needed

### Post-Deployment
- [ ] Success notification to stakeholders
- [ ] User guide update if needed

## ⚠️ Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss | Low | High | Complete backup before migration |
| Performance degradation | Low | Medium | Indexes created, monitoring in place |
| User access issues | Medium | High | Immediate rollback plan ready |
| Duplicate documents | Low | Low | Deduplication logic in migration |

## 📅 Proposed Timeline

**Target Date:** 2025-01-22 (Wednesday)
- 09:00 - Pre-deployment checks
- 14:00 - Code deployment
- 19:00 - Database migration (low traffic)
- 21:00 - Initial validation
- Next day 09:00 - Full validation
- Day 3 - Cleanup and archival

## ✅ Final Checklist Before Production

- [ ] Management approval received
- [ ] Backup tested and verified
- [ ] Rollback plan reviewed
- [ ] Monitoring alerts configured
- [ ] Support team briefed
- [ ] Maintenance window scheduled
- [ ] User communication sent

---

**Note:** This plan assumes Google Cloud Run for backend and MongoDB Atlas for database. Adjust connection strings and commands based on actual production environment.