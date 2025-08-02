module.exports = {
  apps: [
    {
      name: 'hr-backend',
      script: './backend/server.js',
      cwd: '/volume1/web/HR',
      env: {
        NODE_ENV: 'production',
        PORT: 5455,
        // ⚠️ SECURITY: Set these via PM2 environment variables or external config
        // MONGODB_URI: 'Set_via_environment_variables',
        // MONGODB_USER: 'Set_via_environment_variables',
        // MONGODB_PASSWORD: 'Set_via_environment_variables',
        DB_NAME: 'SM_nomu',
        // SESSION_SECRET: 'Set_via_environment_variables',
        // JWT_SECRET: 'Set_via_environment_variables',
        FRONTEND_URL: 'https://hr.smpain.synology.me'
      },
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