@echo off
echo Building SmartBooks Desktop Application...
echo.
echo This process will:
echo 1. Build Next.js for production
echo 2. Package with Electron
echo 3. Create Windows installer (.exe)
echo.
echo Please wait, this may take several minutes...
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies first...
    npm install
    echo.
)

REM Build the application
echo Step 1/3: Building Next.js application...
npm run build
if %errorlevel% neq 0 (
    echo ❌ Next.js build failed!
    pause
    exit /b 1
)

echo.
echo Step 2/3: Packaging with Electron...
npm run dist
if %errorlevel% neq 0 (
    echo ❌ Electron packaging failed!
    pause
    exit /b 1
)

echo.
echo ✅ Build completed successfully!
echo.
echo Your SmartBooks installer is ready in the 'dist' folder:
dir dist\*.exe 2>nul
echo.
echo You can now distribute the installer to users!
pause