# MongoDB Setup Guide

## Overview
This guide covers MongoDB setup for the HR system, including development and production environments.

## Development Setup (Single Node Replica Set)

### Why Replica Set?
The HR system uses MongoDB transactions for data consistency, which requires a replica set configuration.

### Configuration
```yaml
# /etc/mongod.conf
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1

replication:
  replSetName: "hrapp"

processManagement:
  fork: true
  pidFilePath: /var/run/mongodb/mongod.pid
```

### Initialize Replica Set
```bash
# Restart MongoDB
sudo systemctl restart mongod

# Connect to MongoDB
mongosh

# Initialize
rs.initiate({
  _id: "hrapp",
  members: [
    { _id: 0, host: "127.0.0.1:27017" }
  ]
})

# Check status
rs.status()
```

### Connection String
```javascript
// Development
mongodb://localhost:27017/SM_nomu?replicaSet=hrapp

// With authentication
mongodb://hr_app_user:Hr2025Secure@localhost:27017/SM_nomu?replicaSet=hrapp&authSource=SM_nomu
```

## Production Setup (3-Node Replica Set)

### Architecture
- **Primary**: Main read/write node
- **Secondary**: Read replica with automatic failover
- **Arbiter**: Voting member for quorum (minimal resources)

### Docker Compose Configuration
```yaml
version: '3.8'

services:
  mongo-hr-primary:
    image: mongo:7.0
    container_name: mongo-hr-primary
    hostname: mongo1
    restart: always
    ports:
      - "27018:27017"
    volumes:
      - ./node1:/data/db
      - ./keyfile:/data/keyfile:ro
    command: mongod --replSet hrapp --keyFile /data/keyfile --auth --bind_ip_all --wiredTigerCacheSizeGB 1
    networks:
      - mongo-net

  mongo-hr-secondary:
    image: mongo:7.0
    container_name: mongo-hr-secondary
    hostname: mongo2
    restart: always
    ports:
      - "27019:27017"
    volumes:
      - ./node2:/data/db
      - ./keyfile:/data/keyfile:ro
    command: mongod --replSet hrapp --keyFile /data/keyfile --auth --bind_ip_all --wiredTigerCacheSizeGB 0.5
    networks:
      - mongo-net

  mongo-hr-arbiter:
    image: mongo:7.0
    container_name: mongo-hr-arbiter
    hostname: mongo3
    restart: always
    ports:
      - "27020:27017"
    volumes:
      - ./node3:/data/db
      - ./keyfile:/data/keyfile:ro
    command: mongod --replSet hrapp --keyFile /data/keyfile --auth --bind_ip_all --wiredTigerCacheSizeGB 0.25 --nojournal
    networks:
      - mongo-net

networks:
  mongo-net:
    driver: bridge
```

### Setup Steps
```bash
# 1. Create directories
mkdir -p node1 node2 node3

# 2. Generate key file for authentication
openssl rand -base64 756 > keyfile
chmod 400 keyfile
chown 999:999 keyfile

# 3. Set permissions
chown -R 999:999 node1 node2 node3

# 4. Start containers
docker-compose up -d

# 5. Initialize replica set
docker exec -it mongo-hr-primary mongosh

# In MongoDB shell:
rs.initiate({
  _id: "hrapp",
  members: [
    { _id: 0, host: "mongo-hr-primary:27017", priority: 2 },
    { _id: 1, host: "mongo-hr-secondary:27017", priority: 1 },
    { _id: 2, host: "mongo-hr-arbiter:27017", arbiterOnly: true }
  ]
});

# Create users
use admin
db.createUser({
  user: "admin",
  pwd: "Hr2025AdminSecure",
  roles: ["root"]
});

use SM_nomu
db.createUser({
  user: "hr_app_user",
  pwd: "Hr2025Secure",
  roles: ["readWrite", "dbAdmin"]
});
```

### Connection String (Production)
```javascript
mongodb://hr_app_user:Hr2025Secure@server:27018,server:27019,server:27020/SM_nomu?replicaSet=hrapp&authSource=SM_nomu
```

## Database Users

### Admin User
- Username: `admin`
- Password: `Hr2025AdminSecure`
- Roles: Full administrative access

### Application User
- Username: `hr_app_user`
- Password: `Hr2025Secure`
- Database: `SM_nomu`
- Roles: Read/write access to application database

## Backup Strategy

### Automated Backup Script
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/mongodb/$DATE"
mkdir -p $BACKUP_DIR

# For Docker deployment
docker exec mongo-hr-primary mongodump \
  --authenticationDatabase admin \
  --username admin \
  --password Hr2025AdminSecure \
  --out /tmp/backup

docker cp mongo-hr-primary:/tmp/backup $BACKUP_DIR
docker exec mongo-hr-primary rm -rf /tmp/backup

# For standard deployment
mongodump \
  --authenticationDatabase admin \
  --username admin \
  --password Hr2025AdminSecure \
  --out $BACKUP_DIR

# Keep backups for 15 days
find /backup/mongodb -type d -mtime +15 -exec rm -rf {} \;
```

### Schedule Backup
```bash
# Add to crontab (daily at 2 AM)
0 2 * * * /path/to/backup.sh
```

## Performance Optimization

### Memory Settings (4GB RAM System)
- **Primary**: 1GB WiredTiger Cache
- **Secondary**: 0.5GB WiredTiger Cache
- **Arbiter**: 0.25GB WiredTiger Cache + nojournal

### Indexes
The application automatically creates necessary indexes on startup. See `backend/config/database-indexes.js` for details.

## Monitoring

### Check Replica Set Status
```bash
# Docker
docker exec mongo-hr-primary mongosh --eval "rs.status()"

# Standard
mongosh --eval "rs.status()"
```

### Monitor Performance
```bash
# Memory usage
docker stats --no-stream

# Connection count
mongosh --eval "db.serverStatus().connections"

# Operation stats
mongosh --eval "db.serverStatus().opcounters"
```

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Check username/password
   - Verify authSource parameter
   - Ensure user exists in correct database

2. **Transaction Error**
   - Verify replica set is properly initialized
   - Check all nodes are healthy
   - Ensure connection string includes replicaSet parameter

3. **Memory Issues**
   - Reduce wiredTigerCacheSizeGB
   - Add swap space
   - Monitor with `docker stats`

4. **Connection Refused**
   - Check firewall settings
   - Verify bindIp configuration
   - Ensure ports are not in use

### Recovery Procedures

#### Primary Node Failure
```bash
# Secondary automatically becomes primary
# To force election:
rs.stepDown()
```

#### Data Corruption
```bash
# Restore from backup
mongorestore --drop \
  --authenticationDatabase admin \
  --username admin \
  --password Hr2025AdminSecure \
  /backup/mongodb/latest
```

## Security Best Practices

1. **Authentication**: Always enable authentication in production
2. **Network**: Use firewall to restrict access to MongoDB ports
3. **Encryption**: Use keyFile for internal authentication
4. **Updates**: Keep MongoDB version updated
5. **Monitoring**: Set up alerts for unusual activity
6. **Backups**: Test restore procedures regularly

## References
- [MongoDB Replica Set Documentation](https://docs.mongodb.com/manual/replication/)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
- [MongoDB Production Notes](https://docs.mongodb.com/manual/administration/production-notes/)