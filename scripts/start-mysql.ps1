# Helper memulai MySQL portable untuk SIPERAN (dibuat otomatis saat migrasi SQLite -> MySQL).
# Jalankan: powershell -File scripts\start-mysql.ps1
$root = Split-Path -Parent $PSScriptRoot
$installations = @(
  @{ Dir = (Join-Path $HOME 'mysql9\mysql-9.1.0-winx64'); Ini = (Join-Path $HOME 'mysql9\my.ini') },
  @{ Dir = 'C:\xampp\mysql'; Ini = 'C:\xampp\mysql\bin\my.ini' },
  @{ Dir = 'C:\Program Files\MySQL\MySQL Server 8.0'; Ini = 'C:\ProgramData\MySQL\MySQL Server 8.0\my.ini' }
)
if ($env:MYSQLD_PATH -and $env:MYSQL_INI_PATH) {
  $installations = @(@{ Dir = Split-Path -Parent (Split-Path -Parent $env:MYSQLD_PATH); Ini = $env:MYSQL_INI_PATH })
}
$installation = $installations | Where-Object { (Test-Path (Join-Path $_.Dir 'bin\mysqld.exe')) -and (Test-Path $_.Ini) } | Select-Object -First 1

$up = Test-NetConnection -ComputerName 127.0.0.1 -Port 3306 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($up) {
  Write-Host 'MySQL sudah berjalan di port 3306.'
  exit 0
}
if (-not $installation) {
  Write-Error 'MySQL tidak ditemukan. Set MYSQLD_PATH dan MYSQL_INI_PATH, atau pasang MySQL/MariaDB terlebih dahulu.'
  exit 1
}
$mysqlDir = $installation.Dir
$myIni = $installation.Ini
Start-Process -FilePath (Join-Path $mysqlDir 'bin\mysqld.exe') -ArgumentList "--defaults-file=$myIni --console" -WindowStyle Hidden
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 2
  if (Test-NetConnection -ComputerName 127.0.0.1 -Port 3306 -InformationLevel Quiet -WarningAction SilentlyContinue) {
    Write-Host 'MySQL siap di 127.0.0.1:3306 (database: siperan, user: siperan / siperan123).'
    exit 0
  }
}
Write-Error "MySQL gagal start dalam 60 detik. Cek log pada folder data MySQL yang dipakai oleh $mysqlDir."
exit 1
