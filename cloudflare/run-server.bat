@echo off
REM ============================================================
REM  SIPERAN - Jalankan server produksi di Windows (port 3001)
REM  1. npm install --omit=dev
REM  2. npm run build
REM  3. set env MySQL lalu jalankan file ini
REM ============================================================
setlocal
cd /d %~dp0\..

if "%PORT%"=="" set PORT=3001
if "%MYSQL_HOST%"=="" set MYSQL_HOST=127.0.0.1
if "%MYSQL_PORT%"=="" set MYSQL_PORT=3306
if "%MYSQL_DATABASE%"=="" set MYSQL_DATABASE=siperan

if "%MYSQL_USER%"=="" (
  echo [ERROR] MYSQL_USER belum diisi. Contoh:
  echo   set MYSQL_USER=siperan ^&^& set MYSQL_PASSWORD=rahasia-kuat
  exit /b 1
)
if "%MYSQL_PASSWORD%"=="" (
  echo [ERROR] MYSQL_PASSWORD belum diisi.
  exit /b 1
)
if "%SESSION_SECRET%"=="" (
  echo [PERINGATAN] SESSION_SECRET kosong, memakai default tidak aman untuk produksi.
)

node scripts\start-mysql.js
if errorlevel 1 exit /b 1
node server.js
