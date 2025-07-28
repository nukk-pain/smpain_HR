#!/bin/bash

# Final Fix for Backend MongoDB Connection
echo "=== Final Backend Fix ==="
echo ""

# Stop and clean up
echo "1. Cleaning up PM2..."
pm2 stop hr-backend 2>/dev/null
pm2 delete hr-backend 2>/dev/null
pm2 flush hr-backend  # Clear logs
echo ""

# Check the actual error
echo "2. Let's run the backend directly to see the actual error..."
cd /volume1/web/HR/backend

# Load the production environment
export NODE_ENV=production
source .env.production 2>/dev/null || true

# Try running directly first to see errors
echo "Testing direct run (Ctrl+C to stop)..."
timeout 10 node server.js 2>&1 | head -50
echo ""

# Now let's fix PM2 startup
echo "3. Starting with PM2 using correct environment..."
cd /volume1/web/HR

# Create a startup script that ensures environment is loaded
cat > start-backend-prod.sh << 'EOF'
#!/bin/bash
cd /volume1/web/HR/backend

# Load production environment
export NODE_ENV=production
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Start the server
node server.js
EOF

chmod +x start-backend-prod.sh

# Update ecosystem.config.js to use the startup script
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'hr-backend',
      script: './start-backend-prod.sh',
      cwd: '/volume1/web/HR',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: '/root/.pm2/logs/hr-backend-error.log',
      out_file: '/root/.pm2/logs/hr-backend-out.log',
      log_file: '/root/.pm2/logs/hr-backend-combined.log',
      time: true
    },
    {
      name: 'hr-frontend',
      script: '/volume1/web/HR/start-frontend.sh',
      cwd: '/volume1/web/HR',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      error_file: '/root/.pm2/logs/hr-frontend-error.log',
      out_file: '/root/.pm2/logs/hr-frontend-out.log',
      log_file: '/root/.pm2/logs/hr-frontend-combined.log',
      time: true
    }
  ]
};
EOF

echo ""
echo "4. Starting backend with new configuration..."
pm2 start ecosystem.config.js --only hr-backend

echo ""
echo "5. Waiting for startup..."
sleep 5

echo ""
echo "6. Checking status..."
pm2 status hr-backend
echo ""

echo "7. Checking logs..."
pm2 logs hr-backend --lines 30 --nostream
echo ""

echo "8. Testing endpoints..."
echo "   Health check:"
curl -s http://localhost:5455/api/health | jq . || echo "Failed"
echo ""
echo "   CORS test:"
curl -I http://localhost:5455/api/cors-test -H "Origin: https://hr.smpain.synology.me" 2>/dev/null | grep -i access-control || echo "No CORS headers"
echo ""

echo "=== Troubleshooting ==="
echo "If still failing, check:"
echo "1. MongoDB user permissions: docker exec mongo-hr-primary mongosh --eval 'use SM_nomu; db.getUsers()'"
echo "2. Network connectivity: telnet localhost 27018"
echo "3. Full logs: pm2 logs hr-backend --lines 100"