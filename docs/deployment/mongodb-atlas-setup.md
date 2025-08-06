# MongoDB Atlas Setup Guide

## Prerequisites
- MongoDB Atlas account (create at https://www.mongodb.com/cloud/atlas)
- Basic understanding of MongoDB

## Step 1: Create Atlas Account and Cluster

### 1.1 Sign up for MongoDB Atlas
1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Try Free" and create an account
3. Verify your email

### 1.2 Create an Organization
1. Name: Your company/project name
2. Select "MongoDB Atlas" as the product

### 1.3 Create a Project
1. Name: `HR-Management-Dev` (for development)
2. Later create `HR-Management-Prod` (for production)

### 1.4 Create a Free Cluster
1. Click "Build a Database"
2. Choose "Shared" (M0 Free tier)
3. Provider: Google Cloud Platform
4. Region: asia-northeast3 (Seoul)
5. Cluster Name: `hr-cluster-dev`

## Step 2: Configure Security

### 2.1 Database Access
1. Go to "Database Access" in the left menu
2. Click "Add New Database User"
3. Authentication Method: Password
4. Username: `hr_app_user`
5. Password: `HrDev2025Temp!` (temporary for development)
6. Database User Privileges: "Read and write to any database"
7. Click "Add User"

⚠️ **Important**: This password is temporary for development. Change it before production deployment.

### 2.2 Network Access
1. Go to "Network Access" in the left menu
2. Click "Add IP Address"
3. For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
4. Add a comment: "Development - temporary"
5. Click "Confirm"

⚠️ **Security Note**: For production, restrict to specific IP addresses only.

## Step 3: Get Connection String

1. Go to "Database" in the left menu
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Driver: Node.js, Version: 4.1 or later
5. Copy the connection string:
   ```
   mongodb+srv://hr_app_user:<password>@hr-cluster-dev.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with `HrDev2025Temp!`
7. Add your database name: `/SM_nomu?` before the query parameters

Final connection string:
```
mongodb+srv://hr_app_user:HrDev2025Temp!@hr-cluster-dev.xxxxx.mongodb.net/SM_nomu?retryWrites=true&w=majority
```

## Step 4: Update Application Configuration

### 4.1 Update Environment Variables
1. Copy the connection string from Step 3
2. Update `/backend/.env.development`:
   ```
   MONGODB_URI=mongodb+srv://hr_app_user:HrDev2025Temp!@hr-cluster-dev.xxxxx.mongodb.net/SM_nomu?retryWrites=true&w=majority
   ```

### 4.2 Test Connection
```bash
cd scripts
node testAtlasConnection.js
```

Expected output:
```
Testing MongoDB Atlas connection...
✅ Successfully connected to MongoDB Atlas!
```

## Step 5: Initialize Database

### 5.1 Create Indexes
The application will automatically create necessary indexes on first run.

### 5.2 Optional: Load Initial Data
```bash
cd backend
npm run dev
# The server will initialize default admin user and sample data
```

## Monitoring and Maintenance

### Atlas Dashboard Features
1. **Metrics**: Monitor database performance
2. **Profiler**: Analyze slow queries
3. **Backups**: Automatic daily backups (even on free tier)
4. **Alerts**: Set up notifications for issues

### Best Practices
1. Monitor connection pool usage
2. Set up alerts for high CPU/memory usage
3. Review slow query logs regularly
4. Plan for scaling before hitting limits

## Troubleshooting

### Common Issues

1. **Connection Timeout**
   - Check IP whitelist settings
   - Verify connection string format
   - Ensure cluster is active

2. **Authentication Failed**
   - Verify username and password
   - Check user permissions
   - Ensure database name is correct

3. **Network Error**
   - Check firewall settings
   - Verify DNS resolution
   - Try using a VPN if behind corporate firewall

### Debug Commands
```bash
# Test DNS resolution
nslookup hr-cluster-dev.xxxxx.mongodb.net

# Test connection with MongoDB shell
mongosh "mongodb+srv://hr_app_user:HrDev2025Temp!@hr-cluster-dev.xxxxx.mongodb.net/SM_nomu"
```

## Production Deployment Checklist

When ready for production:

- [ ] Create new production cluster (M10 or higher)
- [ ] Generate strong password (16+ chars)
- [ ] Restrict IP whitelist to Cloud Run IPs only
- [ ] Enable audit logs
- [ ] Configure backup retention
- [ ] Set up monitoring alerts
- [ ] Use Google Secret Manager for credentials
- [ ] Enable MongoDB Atlas encryption at rest
- [ ] Configure VPC peering if needed