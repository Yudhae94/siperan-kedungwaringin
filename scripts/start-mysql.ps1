# Helper memulai MySQL portable untuk SIPERAN (dibuat otomatis saat migrasi SQLite -> MySQL).
# Jalankan: powershell -File scripts\start-mysql.ps1
$root = Split-Path -Parent $PSScriptRoot
$mysqlDir = 'C:\Users\Yudhaeka12\mysql9\mysql-9.1.0-winx64'
$myIni = 'C:\Users\Yudhaeka12\mysql9\my.ini'

$up = Test-NetConnection -ComputerName 127.0.0.1 -Port 3306 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($up) {
  Write-Host 'MySQL sudah berjalan di port 3306.'
  exit 0
}
if (-not (Test-Path $myIni)) {
  Write-Error "my.ini tidak ditemukan di $myIni. Sesuaikan path MySQL di script ini."
  exit 1
}
Start-Process -FilePath (Join-Path $mysqlDir 'bin\mysqld.exe') -ArgumentList "--defaults-file=$myIni --console" -WindowStyle Hidden
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 2
  if (Test-NetConnection -ComputerName 127.0.0.1 -Port 3306 -InformationLevel Quiet -WarningAction SilentlyContinue) {
    Write-Host 'MySQL siap di 127.0.0.1:3306 (database: siperan, user: siperan / siperan123).'
    exit 0
  }
}
Write-Error 'MySQL gagal start dalam 60 detik. Cek log di C:\Users\Yudhaeka12\mysql9\data\*.err'
exit 1
