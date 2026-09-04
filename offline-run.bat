@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Dependencies belum terinstall.
  echo Jalankan: npm install
  pause
  exit /b 1
)
call npm run dev
