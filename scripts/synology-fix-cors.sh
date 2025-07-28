#!/bin/bash

# Quick fix script for CORS issues on Synology
# This adds CORS headers at the nginx level

echo "=== Synology CORS Fix Script ==="
echo "This script provides instructions to fix CORS in Synology DSM"
echo ""

echo "OPTION 1: Through DSM GUI (Recommended)"
echo "========================================"
echo "1. Go to Control Panel > Application Portal > Reverse Proxy"
echo "2. Edit the 'hrbackend.smpain.synology.me' rule"
echo "3. Go to 'Custom Header' tab"
echo "4. Add these headers:"
echo "   - Header Name: Access-Control-Allow-Origin | Value: https://hr.smpain.synology.me"
echo "   - Header Name: Access-Control-Allow-Credentials | Value: true"
echo "   - Header Name: Access-Control-Allow-Methods | Value: GET, POST, PUT, DELETE, OPTIONS"
echo "   - Header Name: Access-Control-Allow-Headers | Value: Content-Type, Authorization, X-Requested-With"
echo ""

echo "OPTION 2: Direct nginx configuration (Advanced)"
echo "=============================================="
echo "If you have SSH access as root:"
echo ""
echo "1. Find the nginx config for your reverse proxy:"
echo "   find /etc/nginx -name '*hrbackend*' -type f"
echo ""
echo "2. Edit the configuration file and add CORS headers"
echo "3. Reload nginx: nginx -s reload"
echo ""

echo "OPTION 3: Emergency fix - Backend bypass"
echo "========================================"
echo "If nginx is stripping headers, modify the backend to force CORS:"
cat << 'EOF'

# In backend/server.js, after line 183 (app.use(cors(corsOptions));), add:

// Force CORS headers on all responses
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://hr.smpain.synology.me',
    'https://hrbackend.smpain.synology.me'
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  
  next();
});

EOF

echo ""
echo "After making changes, restart the backend:"
echo "pm2 restart hr-backend"
echo ""
echo "=== End of instructions ==="