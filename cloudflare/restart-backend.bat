@echo off
REM Restart backend SIPERAN agar seed() demo terisi ulang setelah reset database.
REM Menutup proses node server lama (port 3001) lalu menjalankan ulang server.js.
setlocal
cd /d %~dp0\..
echo [1/3] Menutup proses server lama di port 3001...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
  echo  - kill PID %%P
  taskkill /F /PID %%P >nul 2>&1
)
timeout /t 3 /nobreak >nul
echo [2/3] Menjalankan ulang server (seed demo otomatis)...
start "siperan-server" cmd /c "node server.js ^> server-run.log 2^> server-run.err.log"
timeout /t 6 /nobreak >nul
echo [3/3] Verifikasi...
curl.exe -s --max-time 10 http://localhost:3001/api/auth/captcha >nul
if errorlevel 1 (
  echo [GAGAL] server belum merespons. Cek server-run.err.log
  exit /b 1
)
node scripts\smoke-test-mysql.mjs
