# 🏢 HR Management System

A comprehensive HR management system with payroll functionality, built with modern technologies for efficient employee management.

## 🌟 Overview

This system provides complete HR management capabilities including employee leave tracking, payroll calculations with incentives, and user management with role-based access control.

### 🛠️ Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: React 19 + TypeScript + Vite
- **Database**: MongoDB
- **UI Library**: Material-UI (MUI)
- **Data Grid**: AG Grid Community
- **Authentication**: JWT token-based with bcryptjs (migrated Aug 2025)
- **Process Manager**: PM2 (Production)

---

## 🚀 Quick Start

### 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB
- Docker (for production deployment)

### 🔧 Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd HR
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend
   cd ../frontend && npm install
   ```

3. **Start development servers**
   ```bash
   # Option 1: Quick start (Linux/WSL/macOS)
   ./start-simple.sh
   
   # Option 2: Windows
   start.bat
   
   # Option 3: Manual start
   cd backend && node server.js
   cd frontend && npx vite
   ```

4. **Access the application**
   - Frontend: http://localhost:3727
   - Backend API: http://localhost:8080/api
   - Default login: `admin` / `admin`
   - JWT tokens stored in localStorage after login

---

## 📦 Production Deployment

### 🐳 MongoDB Docker Setup

1. **Create MongoDB container**
   ```bash
   docker run -d \
     --name mongo-hr \
     -p 27018:27017 \
     mongo:latest
   ```

2. **Create database user**
   ```bash
   docker exec -it mongo-hr mongosh SM_nomu
   ```
   ```javascript
   db.createUser({
     user: "hr_app_user",
     pwd: "Hr2025Secure",
     roles: [{ role: "readWrite", db: "SM_nomu" }]
   })
   ```

3. **Test connection**
   ```bash
   docker run -it --rm --network host mongo:latest mongosh \
     --host localhost --port 27018 \
     -u hr_app_user -p 'Hr2025Secure' \
     --authenticationDatabase SM_nomu
   ```

### 🚀 PM2 Deployment

1. **Build frontend**
   ```bash
   cd frontend && npm run build
   ```

2. **Start with PM2**
   ```bash
   pm2 start ecosystem.config.js
   ```

3. **Monitor processes**
   ```bash
   pm2 status
   pm2 logs
   ```

---

## 🔧 Configuration

### 📁 Environment Files

#### `ecosystem.config.js` (Production)
```javascript
env: {
  NODE_ENV: 'production',
  MONGODB_URI: 'mongodb+srv://hr_app_prod:STRONG_PASSWORD@hr-cluster-prod.xxxxx.mongodb.net/SM_nomu',
  DB_NAME: 'SM_nomu',
  JWT_SECRET: 'your-jwt-secret-256-bits',
  FRONTEND_URL: 'https://smpain-hr.vercel.app',
  USE_REFRESH_TOKENS: 'true',
  ENABLE_TOKEN_BLACKLIST: 'true'
}
```

#### Development Environment
- MongoDB: `Set via MONGODB_URI environment variable`
- Backend: `http://localhost:8080`
- Frontend: `http://localhost:3727`

---

## 🎯 Features

### ✅ Implemented Features

| Feature | Status | Description |
|---------|--------|-------------|
| 👥 **User Management** | ✅ Complete | Role-based access control (Admin/Manager/User) |
| 🏖️ **Leave Management** | ✅ Complete | Request, approve, and track employee leave |
| 💰 **Payroll System** | ✅ Complete | Salary calculations with incentives and bonuses |
| 📅 **Leave Calendar** | ✅ Complete | Monthly calendar view with team visibility |
| 📊 **Team Analytics** | ✅ Complete | Department and team leave statistics |
| 🔐 **Permission System** | ✅ Complete | Fine-grained access control |
| 📱 **Dashboard** | ✅ Complete | Role-based dashboards |

### 🔄 In Progress

- **Advanced Reporting**: Enhanced analytics and reporting
- **Notification System**: In-app notifications for leave updates

---

## 🏗️ Architecture

### 📂 Project Structure

```
HR/
├── backend/                 # Node.js Express API
│   ├── server.js           # Main server configuration
│   ├── routes/             # API route handlers
│   ├── middleware/         # Authentication & validation
│   └── package.json
├── frontend/               # React TypeScript app
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service layer
│   │   └── types/          # TypeScript definitions
│   ├── public/
│   └── package.json
├── ecosystem.config.js     # PM2 configuration
├── CLAUDE.md              # Development guide
└── README.md
```

### 🔗 API Endpoints

#### Authentication (JWT-based)
- `POST /api/auth/login` - User login (returns JWT token)
- `POST /api/auth/logout` - User logout (invalidates token if blacklisting enabled)
- `GET /api/auth/me` - Get current user info (requires JWT token)
- `POST /api/auth/refresh` - Refresh access token (Phase 4 feature)
- `POST /api/auth/change-password` - Change password

#### Leave Management
- `GET /api/leave` - Get leave requests
- `POST /api/leave` - Create leave request
- `PUT /api/leave/:id` - Update leave request
- `POST /api/leave/:id/approve` - Approve/reject leave
- `GET /api/leave/calendar/:month` - Calendar data
- `GET /api/leave/team-status` - Team statistics

#### User Management
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

---

## 🎭 User Roles & Permissions

### 👑 Admin
- **Full system access**
- User management and permissions
- System configuration
- All payroll operations

### 👨‍💼 Manager
- **Employee management**
- Leave approval workflow
- Team analytics
- Limited payroll access (configurable)

### 👤 User
- **Personal leave management**
- View own data
- Submit leave requests
- Personal dashboard

---

## 🔧 Troubleshooting

### 🚨 Common Issues

#### MongoDB Connection Failed
```
Error: Authentication failed
```

**Solution:**
1. **Check container status**
   ```bash
   docker ps | grep mongo-hr
   ```

2. **Recreate MongoDB user**
   ```bash
   docker exec -it mongo-hr mongosh SM_nomu
   ```
   ```javascript
   db.dropUser("hr_app_user")
   db.createUser({
     user: "hr_app_user",
     pwd: "Hr2025Secure",
     roles: [{ role: "readWrite", db: "SM_nomu" }]
   })
   ```

3. **Verify connection string**
   - Must include database name: `/SM_nomu`
   - Must include authSource: `?authSource=SM_nomu`
   - Format: `mongodb://hr_app_user:Hr2025Secure@localhost:27018/SM_nomu?authSource=SM_nomu`

4. **Restart PM2 process**
   ```bash
   pm2 delete hr-backend
   pm2 start ecosystem.config.js --only hr-backend
   ```

#### PM2 Process Issues
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs hr-backend

# Restart process
pm2 restart hr-backend
```

### 📝 Deployment Checklist

Before deployment, ensure:
- [ ] MongoDB Docker container is running
- [ ] User `hr_app_user` is created with correct password
- [ ] Connection string includes database name and authSource
- [ ] Frontend is built (`npm run build`)
- [ ] PM2 configuration is correct

### 🔍 Connection Test Commands

```bash
# Test MongoDB connection
docker run -it --rm --network host mongo:latest mongosh \
  --host localhost --port 27018 \
  -u hr_app_user -p 'Hr2025Secure' \
  --authenticationDatabase SM_nomu

# Check PM2 logs
pm2 logs hr-backend --lines 50

# Health check (includes JWT status)
curl http://localhost:8080/api/health

# Test JWT authentication
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

---

## 💡 Development Tips

### 🔍 Debugging
- Use `pm2 logs` for real-time log monitoring
- Check browser console for frontend errors
- MongoDB connection logs provide detailed error information

### 🧪 Testing
- Manual testing procedures in `TEST_GUIDE.md`
- Test all user roles and permissions
- Verify leave calculations and approval workflow

### 📊 Performance
- Database queries are optimized with proper indexing
- Frontend uses React Context for state management
- AG Grid for efficient data handling

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📞 Support

For issues or questions:
- Check the troubleshooting section above
- Review logs for error details
- Verify configuration settings

---

## 📄 License

This project is proprietary software developed for internal use.

---

*Last updated: August 2025 (JWT Migration Complete)*