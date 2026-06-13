@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title Deploy — Portal Phong Vien thong

echo.
echo ==========================================
echo   Deploy Portal Phong Vien thong
echo ==========================================
echo.
echo Chon che do deploy:
echo   [N] Push binh thuong  - them commit moi len lich su hien tai
echo   [X] Xoa sach GitHub   - xoa toan bo lich su cu, up code len tu dau
echo   [T] Thoat
echo.
choice /c NXT /n /m "Lua chon [N / X / T]: "
if errorlevel 3 goto :end
if errorlevel 2 goto :force_reset
if errorlevel 1 goto :normal_push
goto :end

:: -------------------------------------------------------
:: CHE DO BINH THUONG
:: -------------------------------------------------------
:normal_push

git diff --quiet
set UNSTAGED=%errorlevel%
git diff --cached --quiet
set STAGED=%errorlevel%

if "%UNSTAGED%"=="0" if "%STAGED%"=="0" (
    echo.
    echo [!] Khong co thay doi nao de commit.
    echo     Nhan P de push lai ban cu, T de thoat.
    echo.
    choice /c PT /n /m "    Lua chon [P = Push / T = Thoat]: "
    if errorlevel 2 goto :end
    if errorlevel 1 goto :push_only
)

echo.
echo [*] Cac file da thay doi:
echo.
git status --short
echo.

set "COMMIT_MSG="
set /p COMMIT_MSG=Nhap mo ta thay doi (Enter de dung ngay gio tu dong):

if "!COMMIT_MSG!"=="" (
    for /f "tokens=1-3 delims=/" %%a in ("%date%") do set D=%%c-%%b-%%a
    for /f "tokens=1-2 delims=:." %%a in ("%time: =0%") do set T=%%a:%%b
    set COMMIT_MSG=update: !D! !T!
)

echo.
echo [*] Commit: "!COMMIT_MSG!"
echo.
choice /c YT /n /m "    Xac nhan push len GitHub? [Y = Co / T = Huy]: "
if errorlevel 2 goto :end

echo.
echo [*] Dang commit...
git add .
git commit -m "!COMMIT_MSG!"
if %errorlevel% neq 0 (
    echo [!] Commit that bai.
    goto :error
)

:push_only
echo [*] Dang push len GitHub...
git push origin master
if %errorlevel% neq 0 (
    echo [!] Push that bai. Kiem tra ket noi mang hoac quyen truy cap repo.
    goto :error
)
goto :success

:: -------------------------------------------------------
:: CHE DO XOA SACH GITHUB
:: -------------------------------------------------------
:force_reset
echo.
echo ==========================================
echo   CANH BAO: XOA SACH LICH SU GITHUB
echo ==========================================
echo.
echo   Toan bo lich su commit cu tren GitHub se bi xoa.
echo   Code hien tai duoc up len nhu mot commit moi duy nhat.
echo   Hanh dong nay KHONG THE hoan tac tren GitHub.
echo.
choice /c YT /n /m "    Ban chac chan muon xoa sach khong? [Y = Xoa / T = Huy]: "
if errorlevel 2 goto :end

echo.
set "RESET_MSG="
set /p RESET_MSG=Noi dung commit (Enter de dung mac dinh):
if "!RESET_MSG!"=="" set RESET_MSG=chore: reset repository history

echo.
echo [*] Dang tao lich su moi...

for /f "usebackq" %%b in (`git rev-parse --abbrev-ref HEAD 2^>nul`) do set CURRENT_BRANCH=%%b
if "!CURRENT_BRANCH!"=="" set CURRENT_BRANCH=master

git checkout --orphan _temp_reset >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Khong the tao branch tam. Co the _temp_reset da ton tai.
    git branch -D _temp_reset >nul 2>&1
    git checkout --orphan _temp_reset >nul 2>&1
    if %errorlevel% neq 0 (
        echo [!] Van khong tao duoc branch tam. Thoat.
        goto :error
    )
)

git add .
git commit -m "!RESET_MSG!" >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Commit that bai.
    git checkout !CURRENT_BRANCH! >nul 2>&1
    git branch -D _temp_reset >nul 2>&1
    goto :error
)

git branch -D master >nul 2>&1
git branch -m master >nul 2>&1

echo [*] Dang force push len GitHub...
git push origin master --force
if %errorlevel% neq 0 (
    echo [!] Force push that bai. Kiem tra ket noi mang hoac quyen truy cap repo.
    goto :error
)
goto :success

:: -------------------------------------------------------
:: KET QUA
:: -------------------------------------------------------
:success
echo.
echo ==========================================
echo   [OK] Push thanh cong!
echo.
echo   Cloudflare dang tu dong build va deploy.
echo   Xem tien trinh tai:
echo   https://dash.cloudflare.com ^> Pages ^> telecom-portal
echo ==========================================
echo.
goto :end

:error
echo.
echo ==========================================
echo   [FAILED] Co loi xay ra. Xem thong bao phia tren.
echo ==========================================
echo.

:end
endlocal
pause
