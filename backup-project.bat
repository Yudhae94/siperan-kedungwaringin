@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0backup-project.ps1"
pause
