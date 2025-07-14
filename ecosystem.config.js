module.exports = {
  apps: [
    {
      name: 'hr-backend',
      script: './backend/server.js',
      cwd: '/mnt/d/my_programs/HR',
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
      error_file: './logs/hr-backend-error.log',
      out_file: './logs/hr-backend-out.log',
      log_file: './logs/hr-backend-combined.log',
      time: true
    },
    {
      name: 'hr-frontend',
      script: '/mnt/d/my_programs/HR/start-frontend.sh',
      cwd: '/mnt/d/my_programs/HR',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      error_file: './logs/hr-frontend-error.log',
      out_file: './logs/hr-frontend-out.log',
      log_file: './logs/hr-frontend-combined.log',
      time: true
    }
  ]
};