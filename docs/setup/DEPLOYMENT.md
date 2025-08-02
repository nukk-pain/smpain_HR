# HR System Deployment Guide

## Overview

This guide provides comprehensive deployment instructions for the refactored HR management system, covering development, staging, and production environments.

## Prerequisites

### System Requirements
- **Node.js**: Version 18.x or higher
- **MongoDB**: Version 6.0 or higher (or MongoDB Atlas)
- **Memory**: Minimum 2GB RAM (4GB recommended for production)
- **Storage**: 10GB available disk space
- **OS**: Linux (Ubuntu 20.04+), macOS, or Windows 10+

### Dependencies
- **Runtime**: Node.js with npm
- **Database**: MongoDB (standalone or replica set)
- **Process Manager**: PM2 (recommended for production)
- **Reverse Proxy**: Nginx (optional, recommended for production)
- **SSL Certificate**: For HTTPS in production

## Environment Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd HR
```

### 2. Install Dependencies
```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies (if applicable)
cd ../frontend
npm install
```

### 3. Environment Configuration

Create environment files for each environment:

#### Development (.env.development)
```env
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/SM_nomu
MONGODB_DATABASE=SM_nomu
MONGODB_MAX_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=2

# Session Configuration
SESSION_SECRET=development-secret-key-change-in-production
SESSION_MAX_AGE=86400000

# Performance Settings
ENABLE_COMPRESSION=true
ENABLE_CACHING=true
CACHE_TTL_SHORT=300
CACHE_TTL_MEDIUM=1800
CACHE_TTL_LONG=7200

# Logging
LOG_LEVEL=debug
```

#### Production (.env.production)
```env
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database Configuration (Replica Set)
MONGODB_URI=mongodb://hr_app_user:Hr2025Secure@host1:27018,host2:27019,host3:27020/SM_nomu?replicaSet=hrapp&authSource=SM_nomu
MONGODB_DATABASE=SM_nomu
MONGODB_REPLICA_SET=true
MONGODB_REPLICA_SET_NAME=hrapp
MONGODB_USERNAME=hr_app_user
MONGODB_PASSWORD=Hr2025Secure
MONGODB_AUTH_SOURCE=SM_nomu
MONGODB_MAX_POOL_SIZE=20
MONGODB_MIN_POOL_SIZE=5

# Session Configuration
SESSION_SECRET=super-secure-random-key-change-this
SESSION_MAX_AGE=86400000

# Performance Settings
ENABLE_COMPRESSION=true
ENABLE_CACHING=true
CACHE_TTL_SHORT=300
CACHE_TTL_MEDIUM=1800
CACHE_TTL_LONG=7200

# Security
SECURE_COOKIES=true
TRUST_PROXY=true

# Logging
LOG_LEVEL=info
```

## Database Setup

### Development Database (Single Instance)
```bash
# Install MongoDB locally
# Ubuntu/Debian
sudo apt-get install mongodb

# macOS with Homebrew
brew install mongodb/brew/mongodb-community

# Start MongoDB
sudo systemctl start mongodb  # Linux
brew services start mongodb/brew/mongodb-community  # macOS

# Create database and initial data
node backend/scripts/setup-database.js
```

### Production Database (Replica Set)
Follow the comprehensive setup in `mongodb-replica.md`:

```bash
# 1. Set up 3-node replica set (Primary + Secondary + Arbiter)
# 2. Configure authentication and users
# 3. Create application user with proper permissions
# 4. Set up automated backups
# 5. Configure monitoring
```

### Database Optimization
```bash
# Create performance indexes
npm run setup:performance

# Verify index creation
node -e "
const { analyzeIndexUsage } = require('./backend/config/database-indexes');
analyzeIndexUsage().then(console.log);
"
```

## Application Deployment

### Development Deployment
```bash
# Start development server
cd backend
npm run dev

# The application will be available at http://localhost:3000
```

### Production Deployment with PM2

#### 1. Install PM2
```bash
npm install -g pm2
```

#### 2. PM2 Configuration File
Create `ecosystem.config.js` in the root directory:

```javascript
module.exports = {
  apps: [{
    name: 'hr-backend',
    script: 'server.js',
    cwd: './backend',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Process management
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Monitoring
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    
    // Performance
    node_args: '--max-old-space-size=1024'
  }]
};
```

#### 3. Deploy with PM2
```bash
# Create logs directory
mkdir -p logs

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Enable PM2 startup script
pm2 startup

# Monitor application
pm2 monit
```

## Nginx Configuration (Optional)

For production deployments, use Nginx as a reverse proxy:

### 1. Install Nginx
```bash
# Ubuntu/Debian
sudo apt-get install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 2. Nginx Configuration
Create `/etc/nginx/sites-available/hr-system`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    # Static files
    location /static/ {
        alias /path/to/HR/frontend/build/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API routes
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }
    
    # Frontend application
    location / {
        try_files $uri $uri/ /index.html;
        root /path/to/HR/frontend/build;
        index index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:3000/health;
        access_log off;
    }
}

# Rate limiting configuration
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
}
```

### 3. Enable Nginx Configuration
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/hr-system /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## SSL Certificate Setup

### Using Let's Encrypt (Free)
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal setup
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Using Custom Certificate
```bash
# Place certificate files
sudo cp your-certificate.crt /etc/ssl/certs/
sudo cp your-private.key /etc/ssl/private/
sudo chmod 600 /etc/ssl/private/your-private.key
```

## Monitoring and Logging

### 1. Application Monitoring
```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs hr-backend

# Application metrics (JWT health check)
curl http://localhost:8080/api/health
curl http://localhost:8080/api/performance/stats

# JWT authentication test
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

### 2. System Monitoring
```bash
# System resources
htop
free -h
df -h

# MongoDB monitoring
# Connect to MongoDB and run:
db.runCommand({serverStatus: 1})
db.stats()
```

### 3. Log Rotation
Create `/etc/logrotate.d/hr-system`:

```
/path/to/HR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        pm2 reload hr-backend
    endscript
}
```

## Backup Strategy

### 1. Database Backup
```bash
# Automated backup script (from mongodb-replica.md)
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/mongodb/$DATE"
mkdir -p $BACKUP_DIR

# Create backup
mongodump --host "replica-set-hosts" \
  --authenticationDatabase admin \
  --username admin \
  --password Hr2025AdminSecure \
  --out $BACKUP_DIR

# Compress backup
tar -czf "$BACKUP_DIR.tar.gz" -C /backup/mongodb "$DATE"
rm -rf $BACKUP_DIR

# Cleanup old backups (keep 30 days)
find /backup/mongodb -name "*.tar.gz" -mtime +30 -delete
```

### 2. Application Backup
```bash
# Backup application files
tar -czf "hr-app-$(date +%Y%m%d).tar.gz" \
  --exclude=node_modules \
  --exclude=logs \
  /path/to/HR/

# Backup environment configuration
cp .env.production .env.production.bak.$(date +%Y%m%d)
```

### 3. Automated Backup Schedule
```bash
# Add to crontab
crontab -e

# Daily database backup at 2 AM
0 2 * * * /path/to/backup-database.sh

# Weekly application backup at 1 AM Sunday
0 1 * * 0 /path/to/backup-application.sh
```

## Security Hardening

### 1. System Security
```bash
# Update system
sudo apt-get update && sudo apt-get upgrade

# Configure firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 27018:27020/tcp  # MongoDB ports (restrict to app servers)

# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

### 2. Application Security
```bash
# Set proper file permissions
chmod 600 .env*
chmod 755 backend/scripts/*.sh
chown -R app:app /path/to/HR/

# Remove development dependencies in production
cd backend && npm prune --production
```

### 3. Database Security
- Enable authentication (configured in mongodb-replica.md)
- Use strong passwords
- Restrict network access
- Enable audit logging
- Regular security updates

## Performance Tuning

### 1. Node.js Optimization
```bash
# Increase memory limit for Node.js
export NODE_OPTIONS="--max-old-space-size=2048"

# Enable V8 optimizations
export NODE_OPTIONS="--optimize-for-size --max-old-space-size=2048"
```

### 2. PM2 Optimization
```javascript
// In ecosystem.config.js
{
  instances: 'max',  // Use all CPU cores
  exec_mode: 'cluster',
  max_memory_restart: '1G',
  node_args: '--optimize-for-size --max-old-space-size=1024'
}
```

### 3. Database Optimization
```bash
# Run performance setup
npm run setup:performance

# Monitor slow queries
# In MongoDB shell:
db.setProfilingLevel(2, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(5)
```

## Health Checks and Monitoring

### 1. Application Health Check
```bash
# Health check endpoint (includes JWT status)
curl -f http://localhost:8080/api/health || exit 1

# Performance check
curl -f http://localhost:8080/api/performance/stats

# JWT authentication test
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' | jq -r '.token')

if [ "$TOKEN" != "null" ] && [ "$TOKEN" != "" ]; then
  echo "JWT authentication working"
else
  echo "JWT authentication failed"
  exit 1
fi
```

### 2. Database Health Check
```bash
# MongoDB health check
mongosh --eval "db.runCommand('ping')" > /dev/null || exit 1
```

### 3. Automated Monitoring Script
Create `scripts/health-check.sh`:

```bash
#!/bin/bash

# Check application (JWT-enabled)
if ! curl -f http://localhost:8080/api/health > /dev/null 2>&1; then
    echo "Application health check failed"
    # Send alert (email, Slack, etc.)
    exit 1
fi

# Check JWT authentication
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' 2>/dev/null | jq -r '.token' 2>/dev/null)

if [ "$TOKEN" = "null" ] || [ "$TOKEN" = "" ]; then
    echo "JWT authentication health check failed"
    # Send alert
    exit 1
fi

# Check database
if ! mongosh --eval "db.runCommand('ping')" > /dev/null 2>&1; then
    echo "Database health check failed"
    # Send alert
    exit 1
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "Disk usage is ${DISK_USAGE}%"
    # Send alert
fi

echo "All health checks passed"
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start
```bash
# Check logs
pm2 logs hr-backend

# Check environment variables
pm2 env hr-backend

# Check port availability
netstat -tulpn | grep :8080
```

#### 2. Database Connection Issues
```bash
# Test MongoDB connection
mongosh "mongodb://hr_app_user:Hr2025Secure@host:27018/SM_nomu"

# Check replica set status
mongosh --eval "rs.status()"

# Check network connectivity
telnet mongodb-host 27018
```

#### 3. High Memory Usage
```bash
# Check process memory usage
ps aux | grep node

# Restart application
pm2 restart hr-backend

# Check for memory leaks
pm2 monit
```

#### 4. Slow Performance
```bash
# Check performance metrics
curl http://localhost:8080/api/performance/stats

# Monitor database queries
db.system.profile.find().sort({ ts: -1 }).limit(5)

# Check cache hit rates and JWT status
curl http://localhost:8080/api/health | jq .cache
curl http://localhost:8080/api/health | jq .config
```

## Rollback Procedures

### 1. Application Rollback
```bash
# Stop current version
pm2 stop hr-backend

# Switch to previous version
git checkout previous-stable-tag
cd backend && npm install

# Start application
pm2 start ecosystem.config.js --env production
```

### 2. Database Rollback
```bash
# Stop application
pm2 stop hr-backend

# Restore from backup
mongorestore --drop /path/to/backup/

# Start application
pm2 start hr-backend
```

## Maintenance

### Regular Maintenance Tasks

#### Daily
- Check application health
- Review error logs
- Monitor performance metrics
- Verify backup completion

#### Weekly
- Update security patches
- Review performance trends
- Clean up old logs
- Test backup restoration

#### Monthly
- Update dependencies
- Review and rotate secrets
- Performance optimization review
- Security audit

### Maintenance Scripts
```bash
# Weekly maintenance script
#!/bin/bash
echo "Starting weekly maintenance..."

# Update system packages
sudo apt-get update && sudo apt-get upgrade -y

# Clean up logs older than 30 days
find /path/to/HR/logs -name "*.log" -mtime +30 -delete

# Clean up old PM2 logs
pm2 flush

# Restart application for memory cleanup
pm2 restart hr-backend

echo "Weekly maintenance completed"
```

This deployment guide provides comprehensive instructions for deploying the HR system in various environments while maintaining security, performance, and reliability standards.