# Administrator Guide

HR Management System - Administrative Operations and System Management

## System Configuration

### Environment Variables

The system uses environment variables for configuration. Key variables include:

```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/SM_nomu  # Development
MONGODB_URI=mongodb+srv://...  # Production (set via Google Cloud Secret Manager)

# JWT Configuration  
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=5455
NODE_ENV=development|production

# File Upload Settings
MAX_FILE_SIZE=10485760  # 10MB in bytes
TEMP_UPLOAD_TTL=1800000  # 30 minutes in milliseconds

# Rate Limiting
RATE_LIMIT_WINDOW=300000  # 5 minutes
RATE_LIMIT_MAX_REQUESTS=5
```

### Google Cloud Production Settings

For production deployment on Google Cloud Run:

1. **Secret Manager Configuration**
   - Store sensitive data in Google Cloud Secret Manager
   - Reference secrets in Cloud Run configuration
   - Never commit secrets to repository

2. **Cloud Run Settings**
   ```yaml
   Memory: 1Gi
   CPU: 1
   Max Instances: 10
   Min Instances: 1
   Concurrency: 100
   Timeout: 300s
   ```

3. **MongoDB Atlas Connection**
   - Use connection string from MongoDB Atlas
   - Configure IP whitelist for Cloud Run
   - Enable connection pooling

## User Management

### Creating and Managing Users

#### Add New User via API
```bash
POST /api/users
Authorization: Bearer <admin-token>

{
  "username": "newuser",
  "password": "securepassword",
  "name": "John Doe",
  "email": "john@company.com",
  "role": "User",
  "department": "departmentId"
}
```

#### User Roles and Permissions

| Role | Permissions |
|------|------------|
| Admin | Full system access, user management, all data operations |
| Supervisor | Department management, approve leave requests, view reports |
| User | Personal data access, submit requests |

#### Deactivating Users
```bash
PUT /api/users/:id/deactivate
Authorization: Bearer <admin-token>
```

#### Bulk User Operations
- Import users via Excel upload
- Export user list to Excel
- Batch role updates

## Monitoring and Maintenance

### System Status Monitoring

#### Check System Health
```bash
GET /api/admin/system-status
Authorization: Bearer <admin-token>
```

Response includes:
- Memory usage statistics
- Temporary uploads count and size
- Database connection status
- Active sessions count
- System uptime

#### Debug API Endpoints

1. **View Debug Information**
   ```bash
   GET /api/admin/debug
   Authorization: Bearer <admin-token>
   ```

2. **Clear Temporary Data**
   ```bash
   POST /api/admin/cleanup
   Authorization: Bearer <admin-token>
   ```

3. **View System Logs**
   ```bash
   GET /api/admin/logs?level=error&limit=100
   Authorization: Bearer <admin-token>
   ```

### Temporary Upload Management

#### Understanding Temporary Uploads

The system stores Excel upload previews temporarily before confirmation:

- **Storage Location**: MongoDB `temp_uploads` collection
- **TTL (Time To Live)**: 30 minutes default
- **Auto-cleanup**: Runs every 5 minutes
- **Memory Limit**: 100MB total for all temporary data

#### Manual Cleanup Procedures

1. **Check Temporary Storage Status**
   ```javascript
   // MongoDB command
   db.temp_uploads.find().count()
   db.temp_uploads.stats()
   ```

2. **Force Cleanup Expired Data**
   ```bash
   POST /api/admin/cleanup/temp-uploads
   Authorization: Bearer <admin-token>
   ```

3. **Clear All Temporary Data**
   ```javascript
   // MongoDB command (use with caution)
   db.temp_uploads.deleteMany({})
   ```

#### Memory Usage Monitoring

Monitor memory usage to prevent system overload:

```bash
# Check Node.js memory usage
GET /api/admin/memory-stats

# Response
{
  "rss": "150MB",
  "heapTotal": "80MB",
  "heapUsed": "65MB",
  "external": "5MB",
  "tempDataSize": "25MB"
}
```

## Backup and Recovery

### Database Backup Procedures

#### Automated Backups
1. MongoDB Atlas handles automatic backups
2. Configure backup schedule in Atlas console
3. Retention period: 7 days for snapshots

#### Manual Backup Commands
```bash
# Export full database
mongodump --uri="mongodb://localhost:27017/SM_nomu" --out=/backup/$(date +%Y%m%d)

# Export specific collection
mongoexport --db=SM_nomu --collection=payroll --out=payroll_backup.json
```

### Recovery Procedures

#### Restore from Backup
```bash
# Restore full database
mongorestore --uri="mongodb://localhost:27017/SM_nomu" /backup/20240315/

# Restore specific collection
mongoimport --db=SM_nomu --collection=payroll --file=payroll_backup.json
```

#### Transaction Rollback

For failed payroll uploads:
1. System automatically creates restore points
2. Use rollback API if available
3. Manual rollback via database restore

### Disaster Recovery Plan

1. **Immediate Actions**
   - Assess damage scope
   - Switch to backup server if available
   - Notify stakeholders

2. **Recovery Steps**
   - Restore from latest backup
   - Verify data integrity
   - Test critical functions
   - Resume operations

3. **Post-Recovery**
   - Document incident
   - Update recovery procedures
   - Test backup integrity

## Security Settings

### Authentication Configuration

#### JWT Token Management
- Tokens expire after 24 hours
- Refresh tokens available for extended sessions
- Blacklist compromised tokens

#### Password Policies
- Minimum 8 characters
- Require complexity (uppercase, lowercase, numbers)
- Password history (prevent reuse of last 5)
- Force password change every 90 days

### Access Control

#### API Rate Limiting
```javascript
// Configuration
{
  windowMs: 5 * 60 * 1000,  // 5 minutes
  max: 5,  // 5 requests per window
  message: "Too many requests"
}
```

#### CORS Configuration
```javascript
// Allowed origins
const corsOptions = {
  origin: [
    'http://localhost:3727',
    'https://smpain-hr.vercel.app'
  ],
  credentials: true
}
```

### Security Monitoring

#### Audit Logs
- All admin actions logged
- Failed login attempts tracked
- Data modifications recorded

#### Security Alerts
Monitor for:
- Multiple failed login attempts
- Unusual access patterns
- Large data exports
- Unauthorized API calls

## Performance Optimization

### Database Optimization

#### Indexes
Ensure these indexes exist:
```javascript
// Users collection
db.users.createIndex({ username: 1 }, { unique: true })
db.users.createIndex({ email: 1 })
db.users.createIndex({ department: 1 })

// Payroll collection
db.payroll.createIndex({ employeeId: 1, payPeriod: 1 })
db.payroll.createIndex({ createdAt: -1 })

// Temp uploads (TTL index)
db.temp_uploads.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
```

#### Query Optimization
- Use projection to limit returned fields
- Implement pagination for large datasets
- Use aggregation pipeline for complex queries

### Application Performance

#### Memory Management
- Set Node.js memory limit: `node --max-old-space-size=1024`
- Monitor memory leaks with heap snapshots
- Implement garbage collection monitoring

#### Caching Strategy
- Cache frequently accessed data
- Implement Redis for session storage (optional)
- Use CDN for static assets

## Troubleshooting

### Common Issues and Solutions

#### High Memory Usage
**Symptoms**: Slow performance, crashes
**Solution**:
1. Check temporary uploads size
2. Clear expired data
3. Restart application
4. Increase memory allocation

#### Database Connection Issues
**Symptoms**: API errors, timeouts
**Solution**:
1. Check MongoDB status
2. Verify connection string
3. Check network connectivity
4. Review connection pool settings

#### Upload Failures
**Symptoms**: Excel uploads fail or timeout
**Solution**:
1. Check file size limits
2. Verify Excel format
3. Check available disk space
4. Review error logs

#### Authentication Problems
**Symptoms**: Login failures, token errors
**Solution**:
1. Verify JWT secret configuration
2. Check token expiration
3. Clear browser cache
4. Regenerate tokens

### Log Analysis

#### Accessing Logs

**Development**:
```bash
# Application logs
tail -f logs/app.log

# Error logs
tail -f logs/error.log
```

**Production (Google Cloud)**:
```bash
# View Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=hr-backend" --limit 50

# Stream logs
gcloud alpha run services logs tail hr-backend --region=asia-northeast3
```

#### Log Levels
- **ERROR**: System errors requiring immediate attention
- **WARN**: Issues that may cause problems
- **INFO**: General operational messages
- **DEBUG**: Detailed debugging information

### Performance Monitoring

#### Key Metrics to Monitor
1. **API Response Times**
   - Target: < 2 seconds for uploads
   - Monitor: 95th percentile latency

2. **Error Rates**
   - Target: < 1% error rate
   - Alert: > 5% error rate

3. **Resource Usage**
   - CPU: < 80% sustained
   - Memory: < 90% of allocation
   - Disk: < 80% capacity

#### Monitoring Tools
- Google Cloud Monitoring
- Application Performance Monitoring (APM)
- Custom dashboards with Grafana

## Maintenance Procedures

### Regular Maintenance Tasks

#### Daily
- Review error logs
- Check system status
- Monitor disk space
- Verify backup completion

#### Weekly
- Clean temporary data
- Review security logs
- Check database performance
- Update documentation

#### Monthly
- Security patches
- Performance review
- Capacity planning
- User access audit

### System Updates

#### Update Procedure
1. Test updates in staging environment
2. Schedule maintenance window
3. Backup production database
4. Deploy updates
5. Verify functionality
6. Monitor for issues

#### Rollback Procedure
1. Identify issue
2. Stop current deployment
3. Restore previous version
4. Restore database if needed
5. Verify system stability
6. Document incident

## API Administration

### Admin-Only Endpoints

```bash
# System Status
GET /api/admin/system-status

# Debug Information
GET /api/admin/debug

# Cleanup Operations
POST /api/admin/cleanup

# Memory Statistics
GET /api/admin/memory-stats

# Temporary Data Dashboard
GET /api/admin/temp-uploads

# Force Cleanup
DELETE /api/admin/temp-uploads/:id

# Audit Logs
GET /api/admin/audit-logs
```

### Swagger Documentation

Access API documentation:
- Development: http://localhost:5455/api-docs
- Production: https://hr-backend-429401177957.asia-northeast3.run.app/api-docs

## Best Practices

### Security Best Practices
1. Never expose sensitive data in logs
2. Rotate secrets regularly
3. Use HTTPS in production
4. Implement least privilege access
5. Regular security audits

### Operational Best Practices
1. Document all changes
2. Test in staging first
3. Maintain backup strategy
4. Monitor system health
5. Plan for capacity

### Development Best Practices
1. Use environment variables
2. Implement proper error handling
3. Write comprehensive tests
4. Maintain documentation
5. Follow code review process

## Emergency Contacts

### Escalation Path
1. System Administrator
2. Development Team Lead
3. Infrastructure Team
4. External Support (MongoDB Atlas, Google Cloud)

### Support Resources
- MongoDB Atlas Support: https://support.mongodb.com
- Google Cloud Support: https://cloud.google.com/support
- Internal Wiki: [Internal documentation link]
- GitHub Issues: [Repository issues page]

## Appendix

### Useful Commands

```bash
# Check MongoDB connection
mongo --eval "db.adminCommand('ping')"

# View collection statistics
mongo SM_nomu --eval "db.stats()"

# Export users list
mongoexport --db=SM_nomu --collection=users --fields=username,name,email,role --type=csv --out=users.csv

# Check Node.js version
node --version

# PM2 commands (if using PM2)
pm2 status
pm2 logs
pm2 restart all
```

### Configuration Files

Key configuration files:
- `/backend/config/database.js` - Database configuration
- `/backend/config/swagger.js` - API documentation
- `/backend/.env` - Environment variables
- `/ecosystem.config.js` - PM2 configuration

---

Last Updated: 2024-03-15
Version: 2.0