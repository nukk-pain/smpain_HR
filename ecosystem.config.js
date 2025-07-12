module.exports = {
  apps: [
    {
      name: 'hr-backend',
      script: './backend/server.js',
      cwd: '/volume1/web/HR',
      env: {
        NODE_ENV: 'production',
        PORT: 5455,
        MONGODB_URL: 'mongodb://localhost:27017',
        DB_NAME: 'SM_nomu',
        SESSION_SECRET: 'hr-synology-secret-2025'
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
      script: 'serve',
      args: '-s dist -p 3727',
      cwd: '/volume1/web/HR/frontend',
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