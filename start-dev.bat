@echo off
chcp 65001 >nul
title Portal Phong Vien thong

set PORT=5173
set URL=http://localhost:%PORT%
set "PROJECT_DIR=%~dp0"

echo ============================================
echo   Portal Phong Vien thong - Dev Server
echo ============================================
echo.

:: Kill process dang chiem port neu co
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
  echo [!] Port %PORT% dang duoc dung, dang tat PID %%a...
  taskkill /PID %%a /F >nul 2>&1
  timeout /t 1 /nobreak >nul
)

:: Mo cua so chay dev server (dung /d de set working dir, tranh loi space)
echo [1/2] Khoi dong dev server...
start "Dev Server" /d "%PROJECT_DIR%" cmd /k "npm run dev"

:: Cho port 5173 san sang bang PowerShell (khong can curl)
echo [2/2] Cho server san sang...
:WAIT_LOOP
timeout /t 2 /nobreak >nul
powershell -NoProfile -Command ^
  "try { $t = New-Object Net.Sockets.TcpClient('localhost',%PORT%); $t.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 goto WAIT_LOOP

:: Mo browser
echo.
echo [OK] Mo trinh duyet: %URL%
start "" "%URL%"

echo.
echo Nhan phim bat ky de dong cua so nay (server van chay).
pause >nul
