@echo off
REM Menjalankan Cloudflare Quick Tunnel ke backend lokal http://localhost:3001
REM URL publik https://xxx.trycloudflare.com akan tercatat di tunnel-backend.log
cd /d %~dp0..
if exist tunnel-backend.log del tunnel-backend.log
start "siperan-backend-tunnel" /min bin\cloudflared.exe tunnel --url http://localhost:3001 --no-autoupdate --logfile tunnel-backend.log
echo Tunnel dijalankan. Tunggu 10-15 detik lalu cek tunnel-backend.log untuk URL trycloudflare.
