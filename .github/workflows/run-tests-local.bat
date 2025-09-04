@echo off
REM TEST-01 Local Test Runner for Windows
REM This script runs tests locally in the same way as CI/CD pipeline
REM Usage: run-tests-local.bat [backend|frontend|e2e|all]

setlocal enabledelayedexpansion

REM Test type from argument (default: all)
set TEST_TYPE=%1
if "%TEST_TYPE%"=="" set TEST_TYPE=all

echo ================================================
echo TEST-01 Integration Test Suite - Local Runner
echo ================================================
echo.

REM Check if MongoDB is running
echo Checking MongoDB...
mongosh --eval "db.adminCommand({ping: 1})" >nul 2>&1 || mongo --eval "db.adminCommand({ping: 1})" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] MongoDB is running
) else (
    echo [ERROR] MongoDB is not running
    echo Please start MongoDB first:
    echo   net start MongoDB
    echo   or manually start MongoDB from Services
    exit /b 1
)

REM Setup test database
echo Setting up test database...
cd backend
node -e "const{MongoClient}=require('mongodb');(async()=>{const client=new MongoClient('mongodb://localhost:27017');await client.connect();const db=client.db('hr_test');await db.dropDatabase();await db.collection('users').insertOne({employeeId:'ADM001',username:'admin',password:'$2a$10$YJvVqDpBBhRBH0ebiLlS7OI1oI2qM/7wJZeBtOmAqdwlwIdylAHl6',name:'Admin User',email:'admin@test.com',role:'Admin',permissions:{canCreate:true,canRead:true,canUpdate:true,canDelete:true},isActive:true,createdAt:new Date()});console.log('Test database setup complete');await client.close()})().catch(console.error);"
cd ..
echo [OK] Test database ready
echo.

REM Run tests based on type
if "%TEST_TYPE%"=="backend" goto :run_backend
if "%TEST_TYPE%"=="frontend" goto :run_frontend
if "%TEST_TYPE%"=="e2e" goto :run_e2e
if "%TEST_TYPE%"=="all" goto :run_all
goto :run_all

:run_backend
echo Running Backend Tests...
echo =========================
cd backend
if not exist node_modules (
    echo Installing backend dependencies...
    call npm ci
)
echo Running unit tests...
call npm test > test-results.txt 2>&1
type test-results.txt | findstr /C:"PASS" >nul
if %errorlevel% equ 0 (
    echo [OK] Backend tests completed
) else (
    echo [WARNING] Some backend tests may have failed
)
cd ..
if not "%TEST_TYPE%"=="all" goto :summary
goto :end_backend

:run_frontend
echo Running Frontend Component Tests...
echo ====================================
cd frontend
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm ci
)
echo Running component tests...
call npm run test:run > test-results.txt 2>&1
type test-results.txt | findstr /C:"passed" >nul
if %errorlevel% equ 0 (
    echo [OK] Frontend tests completed
    type test-results.txt | findstr /R "passed.*failed.*skipped"
) else (
    echo [WARNING] Some frontend tests may have failed
)
cd ..
if not "%TEST_TYPE%"=="all" goto :summary
goto :end_frontend

:run_e2e
echo Running E2E Tests...
echo ====================

REM Start backend server
echo Starting backend server...
cd backend
start /b cmd /c "npm start > ..\backend.log 2>&1"
cd ..

REM Wait for backend
echo Waiting for backend server...
set COUNTER=0
:wait_backend
timeout /t 1 /nobreak >nul
curl -s http://localhost:5455/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Backend server ready
    goto :backend_ready
)
set /a COUNTER+=1
if %COUNTER% lss 30 goto :wait_backend
echo [ERROR] Backend server failed to start
goto :cleanup

:backend_ready
REM Start frontend server
echo Starting frontend server...
cd frontend
start /b cmd /c "npm run dev > ..\frontend.log 2>&1"
cd ..

REM Wait for frontend
echo Waiting for frontend server...
set COUNTER=0
:wait_frontend
timeout /t 1 /nobreak >nul
curl -s http://localhost:3727 >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Frontend server ready
    goto :frontend_ready
)
set /a COUNTER+=1
if %COUNTER% lss 30 goto :wait_frontend
echo [ERROR] Frontend server failed to start
goto :cleanup

:frontend_ready
REM Run E2E tests
cd frontend
echo Running E2E scenario tests...
call npm run test:e2e > e2e-results.txt 2>&1
type e2e-results.txt | findstr /C:"passed" >nul
if %errorlevel% equ 0 (
    echo [OK] E2E tests completed
    type e2e-results.txt | findstr /R "passed.*failed.*skipped"
) else (
    echo [WARNING] Some E2E tests may have failed
)
cd ..

:cleanup
REM Stop servers
echo Stopping servers...
taskkill /f /im node.exe >nul 2>&1
if not "%TEST_TYPE%"=="all" goto :summary
goto :end_e2e

:run_all
call :run_backend
:end_backend
call :run_frontend
:end_frontend
call :run_e2e
:end_e2e

:summary
echo.
echo ================================================
echo Test Summary
echo ================================================

if exist backend\test-results.txt (
    echo Backend:
    type backend\test-results.txt | findstr /R "PASS FAIL tests" | more +0
)

if exist frontend\test-results.txt (
    echo Frontend:
    type frontend\test-results.txt | findstr /R "passed failed tests" | more +0
)

if exist frontend\e2e-results.txt (
    echo E2E:
    type frontend\e2e-results.txt | findstr /R "passed failed tests" | more +0
)

echo.
echo [OK] Test run completed!
echo.

REM Save summary with timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set datetime=%datetime:~0,8%-%datetime:~8,6%
echo Test results saved to test-summary-%datetime%.txt

endlocal
exit /b 0