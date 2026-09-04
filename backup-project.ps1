$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backupDir = Join-Path $projectPath 'backup'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$zipPath = Join-Path $backupDir ("SIPERAN-KEDUNGWARINGIN-$timestamp.zip")

$items = Get-ChildItem -Path $projectPath -Force | Where-Object {
    $_.Name -notin @('node_modules', 'dist', 'backup', '.git') -and
    $_.Name -notlike '*.sqlite-wal' -and
    $_.Name -notlike '*.sqlite-shm' -and
    $_.Name -notlike '*.sqlite'
}

if (-not $items) {
    throw 'Tidak ada file yang dapat dibackup.'
}

Compress-Archive -Path $items.FullName -DestinationPath $zipPath -CompressionLevel Optimal -Force
Write-Host "Backup dibuat di: $zipPath"
