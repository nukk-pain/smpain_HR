# Environment Setup Guide

## Overview

The HR system uses environment variables for configuration management. This approach improves security and makes deployment across different environments easier.

## Environment Files

### Development Environment

Copy the example file and modify for your development setup:

```bash
cd backend
cp .env.example .env
```

Edit `.env` for development:
```env
# HR System Environment Variables - Development

# Application Settings
NODE_ENV=development
PORT=5455

# MongoDB Settings (Development)
MONGODB_URL=mongodb://localhost:27017
DB_NAME=SM_nomu

# Session Configuration
SESSION_SECRET=hr-development-secret-2025
```

### Production Environment

For production (Synology), create `.env.production`:

```env
# HR System Environment Variables - Production

# Application Settings
NODE_ENV=production
PORT=5455

# MongoDB Settings (Production - Replica Set)
MONGODB_URL=mongodb://hr_app_user:Hr2025Secure@localhost:27018,localhost:27019,localhost:27020/SM_nomu?replicaSet=hrapp&authSource=SM_nomu
DB_NAME=SM_nomu

# MongoDB Authentication
MONGODB_USER=hr_app_user
MONGODB_PASSWORD=Hr2025Secure

# Session Configuration
SESSION_SECRET=hr-synology-secret-2025
```

## Environment Variables Reference

### Application Settings

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | Yes |
| `PORT` | Server port | `5455` | No |

### MongoDB Settings

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MONGODB_URL` | Full MongoDB connection string | See defaults | Yes |
| `DB_NAME` | Database name | `SM_nomu` | No |
| `MONGODB_USER` | MongoDB username | `hr_app_user` | Production only |
| `MONGODB_PASSWORD` | MongoDB password | - | Production only |

### Security Settings

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SESSION_SECRET` | Session encryption key | `fallback-secret-key` | Yes |

## Default Connection Strings

### Development
```
mongodb://localhost:27017
```

### Production (Replica Set)
```
mongodb://hr_app_user:Hr2025Secure@localhost:27018,localhost:27019,localhost:27020/SM_nomu?replicaSet=hrapp&authSource=SM_nomu
```

## Usage with Different Deployment Methods

### PM2 with ecosystem.config.js

The system will automatically load `.env.production` in production mode:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'hr-backend',
    script: './backend/server.js',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

### Docker

Mount environment file as volume:

```yaml
# docker-compose.yml
version: '3.8'
services:
  hr-backend:
    build: .
    volumes:
      - ./.env.production:/app/backend/.env
    ports:
      - "5455:5455"
```

### Manual Start

```bash
# Development
cd backend && npm run dev

# Production
NODE_ENV=production cd backend && npm start
```

## Security Best Practices

### 1. Environment File Security

- Never commit `.env` files to version control
- Use strong, unique secrets for each environment
- Regularly rotate session secrets
- Limit file permissions: `chmod 600 .env`

### 2. MongoDB Credentials

- Use dedicated database users with minimal privileges
- Avoid using admin credentials for applications
- Enable authentication in production
- Use connection string parameters for security options

### 3. Secret Management

```bash
# Generate secure session secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Troubleshooting

### Common Issues

1. **Environment file not found**
   ```
   Error: Cannot find .env file
   ```
   - Ensure `.env` exists in `backend/` directory
   - Check file permissions and ownership

2. **MongoDB connection failed**
   ```
   MongoNetworkError: failed to connect to server
   ```
   - Verify `MONGODB_URL` is correct
   - Check MongoDB service is running
   - Validate credentials and network access

3. **Session errors**
   ```
   Error: secret option required for sessions
   ```
   - Ensure `SESSION_SECRET` is set
   - Check the secret is not empty

### Debugging Environment Variables

Add debug logging to see loaded variables:

```javascript
// Temporary debug code
console.log('Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URL:', process.env.MONGODB_URL ? '[HIDDEN]' : 'NOT SET');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? '[HIDDEN]' : 'NOT SET');
```

## Migration from Hard-coded Values

If migrating from hard-coded configuration:

1. **Backup current configuration**
2. **Create appropriate `.env` file**
3. **Test in development first**
4. **Deploy to production with new environment file**
5. **Verify all services connect properly**

## Related Documentation

- [MongoDB Setup](MONGODB_SETUP.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Security Best Practices](../development/SECURITY.md)