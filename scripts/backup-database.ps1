# SimLab Production PostgreSQL Database Backup Automation Script for Windows PowerShell
# Performs postgres container dumps, validates exports, zips backups, and handles cleanup.

$BackupDir = "C:\backups\simlab"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ContainerName = "simlab-postgres"
$DbName = "simlab"
$DbUser = "postgres"
$MaxBackups = 30

Write-Host "=== Starting SimLab Database Backup at $(Get-Date) ===" -ForegroundColor Cyan

# Ensure target folder exists
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
}

# Verify Docker container is running
$DockerStatus = docker ps --filter "name=$ContainerName" --format "{{.Names}}"
if ($DockerStatus -ne $ContainerName) {
    Write-Error "Error: Docker container '$ContainerName' is not running."
    Exit 1
}

$SqlFile = Join-Path $BackupDir "simlab_backup_$Timestamp.sql"
$ZipFile = "$SqlFile.zip"

Write-Host "Executing pg_dump snapshot on container $ContainerName..." -ForegroundColor Yellow
docker exec $ContainerName pg_dump -U $DbUser -d $DbName > $SqlFile

# Check file size
$FileObj = Get-Item $SqlFile
if ($FileObj.Length -eq 0) {
    Write-Error "Error: Database backup file is empty or failed to generate."
    Remove-Item $SqlFile -Force -ErrorAction SilentlyContinue
    Exit 1
}

Write-Host "Verifying schema consistency (checking for CREATE TABLE)..." -ForegroundColor Yellow
$ContentCheck = Select-String -Path $SqlFile -Pattern "CREATE TABLE" -Quiet
if (-not $ContentCheck) {
    Write-Warning "Warning: Schema verification failed! SQL file lacks expected 'CREATE TABLE' statements."
}

Write-Host "Compressing SQL snapshot into a zip archive..." -ForegroundColor Yellow
Compress-Archive -Path $SqlFile -DestinationPath $ZipFile -Force
Remove-Item $SqlFile -Force

$CompressedSize = [Math]::Round((Get-Item $ZipFile).Length / 1MB, 2)
Write-Host "Backup generated successfully: $ZipFile (Size: $CompressedSize MB)" -ForegroundColor Green

# Pruning old files
Write-Host "Pruning backups older than $MaxBackups days..." -ForegroundColor Yellow
$LimitDate = (Get-Date).AddDays(-$MaxBackups)
Get-ChildItem -Path $BackupDir -Filter "simlab_backup_*.zip" | Where-Object { $_.LastWriteTime -lt $LimitDate } | Remove-Item -Force

Write-Host "=== Backup Operation Finished Successfully ===" -ForegroundColor Green
