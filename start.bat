@echo off
echo 🚀 Leave Management V3 - MongoDB Windows Start
echo ===============================================

REM Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

echo ✅ Node.js found

REM Install backend dependencies if missing
if not exist "backend\node_modules\mongodb" (
    echo 📦 Installing backend dependencies...
    cd backend
    npm install
    cd ..
)

echo.
echo 🔧 Starting backend server...
cd backend
start /B node server.js
cd ..

REM Wait a moment
timeout /t 3 /nobreak >nul

echo 🔧 Starting frontend server...
cd frontend
start /B npx vite

echo.
echo ✅ Servers started!
echo ===================
echo 🌐 Frontend: http://localhost:3000
echo 🔗 Backend: http://localhost:5444/api
echo 🔑 Login: admin / admin
echo.
echo 📊 Database: SM_nomu
echo 🗄️  MongoDB: localhost:27017
echo.
echo Press any key to stop servers...
pause >nul

REM Kill processes
taskkill /F /IM node.exe >nul 2>&1
echo Servers stopped.
pause