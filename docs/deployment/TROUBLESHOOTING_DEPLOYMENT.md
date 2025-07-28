# Deployment Troubleshooting Guide

## 502 Bad Gateway Error on Login

### Problem
Getting 502 Bad Gateway error when trying to login through https://hrbackend.smpain.synology.me/api/auth/login

### Common Causes and Solutions

#### 1. Backend Server Not Running
Check if the backend server is running:
```bash
pm2 status
pm2 logs hr-backend
```

If not running, start it:
```bash
pm2 start ecosystem.config.js
```

#### 2. CORS Configuration Issues
The backend needs to allow the frontend domain. Check:
- `backend/middleware/errorHandler.js` includes the correct origins
- `ecosystem.config.js` has `FRONTEND_URL` environment variable set

#### 3. Reverse Proxy Configuration
For Synology DSM, ensure the reverse proxy is configured correctly:
- Source: https://hrbackend.smpain.synology.me
- Destination: http://localhost:5455
- Enable WebSocket if needed
- Protocol: HTTP

#### 4. MongoDB Connection Issues
Check if MongoDB is accessible:
```bash
# Test MongoDB connection
mongo mongodb://hr_app_user:Hr2025Secure@localhost:27018,localhost:27019,localhost:27020/SM_nomu?replicaSet=hrapp&authSource=SM_nomu
```

#### 5. Port Conflicts
Ensure port 5455 is not being used by another service:
```bash
netstat -tulpn | grep 5455
```

#### 6. Session Cookie Configuration
In production, ensure:
- `NODE_ENV=production` is set
- Session cookies have `secure: true` (requires HTTPS)
- Domain settings match your deployment

### Debugging Steps

1. **Check Backend Logs**
   ```bash
   pm2 logs hr-backend --lines 100
   ```

2. **Test Backend Directly**
   ```bash
   curl http://localhost:5455/api/health
   ```

3. **Check CORS Headers**
   ```bash
   curl -I -X OPTIONS https://hrbackend.smpain.synology.me/api/auth/login \
     -H "Origin: https://hr.smpain.synology.me" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type"
   ```

4. **Verify Environment Variables**
   ```bash
   pm2 env hr-backend
   ```

### Quick Fix Steps

1. Update and restart the backend:
   ```bash
   cd /volume1/web/HR
   git pull
   pm2 restart hr-backend
   ```

2. Clear PM2 logs if they're too large:
   ```bash
   pm2 flush
   ```

3. Restart the entire stack:
   ```bash
   pm2 stop all
   pm2 start ecosystem.config.js
   ```

### Frontend Configuration
Ensure the frontend is making requests to the correct backend URL:
- Check `frontend/src/config/api.ts` or similar configuration file
- Verify the API base URL matches your deployment

### SSL/TLS Issues
If using HTTPS:
- Ensure certificates are valid
- Check certificate chain is complete
- Verify SSL settings in reverse proxy

### Additional Notes
- Always check both frontend and backend logs
- Use browser developer tools to inspect network requests
- Check for any firewall rules blocking the connection
- Ensure all environment variables are properly set in production