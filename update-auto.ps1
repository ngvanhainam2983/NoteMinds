# ============================================================
#  NoteMind Auto-Update Script (Windows PowerShell)
#  
#  This script automatically pulls from GitHub, installs
#  dependencies, and restarts the application.
#
#  Usage:
#    powershell.exe -ExecutionPolicy Bypass -File update-auto.ps1
#    powershell.exe -ExecutionPolicy Bypass -File update-auto.ps1 -CheckOnly
#
#  To schedule auto-updates via Task Scheduler:
#    1. Open Task Scheduler
#    2. Create Basic Task
#    3. Set trigger (e.g., Daily at 2 AM)
#    4. Set action: 
#       Program: powershell.exe
#       Arguments: -ExecutionPolicy Bypass -File "C:\path\to\NoteMind\update-auto.ps1"
#       Start in: C:\path\to\NoteMind
#
# ============================================================

param(
    [switch]$CheckOnly = $false,
    [string]$AppDir = (Get-Location).Path,
    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"
$LogFile = "$AppDir\logs\update-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

# Create logs directory if it doesn't exist
if (-not (Test-Path -Path "$AppDir\logs")) {
    New-Item -ItemType Directory -Path "$AppDir\logs" -Force | Out-Null
}

function Write-Log {
    param(
        [string]$Message,
        [ValidateSet("Info", "Warning", "Error")][string]$Level = "Info"
    )
    
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $logMessage = "[$timestamp] [$Level] $Message"
    
    # Write to console
    switch ($Level) {
        "Info"    { Write-Host "✓ $logMessage" -ForegroundColor Green }
        "Warning" { Write-Host "⚠ $logMessage" -ForegroundColor Yellow }
        "Error"   { Write-Host "✗ $logMessage" -ForegroundColor Red }
    }
    
    # Write to log file
    Add-Content -Path $LogFile -Value $logMessage -ErrorAction SilentlyContinue
}

function Exit-WithError {
    param([string]$Message)
    Write-Log -Message $Message -Level Error
    exit 1
}

# Check if we're in a git repository
if (-not (Test-Path -Path "$AppDir\.git")) {
    Exit-WithError "Not a git repository. Please run this script from the application root directory."
}

Write-Log "═══════════════════════════════════════════════════════"
Write-Log "Starting NoteMind Auto-Update Process"
Write-Log "═══════════════════════════════════════════════════════"

# Check if git is available
try {
    $null = git --version
} catch {
    Exit-WithError "Git is not installed or not in PATH"
}

# ── Fetch latest changes from remote ──────────────────────

Write-Log "Fetching latest changes from remote repository..."
git fetch origin $Branch 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Exit-WithError "Failed to fetch from remote repository"
}

# ── Check if there are updates available ──────────────────

$LocalCommit = git rev-parse HEAD
$RemoteCommit = git rev-parse "origin/$Branch"

if ($LocalCommit -eq $RemoteCommit) {
    Write-Log "Already up to date. No updates available."
    if (-not $CheckOnly) {
        Write-Log "Exiting auto-update process."
    }
    exit 0
}

Write-Log "New updates found! Local: $($LocalCommit.Substring(0, 7)), Remote: $($RemoteCommit.Substring(0, 7))"

# ── Create backup before updating ─────────────────────────

$BackupDir = "$AppDir\backups\backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Write-Log "Creating backup at $BackupDir..."
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

if (Test-Path "$AppDir\server\package.json") {
    Copy-Item "$AppDir\server\package.json" -Destination "$BackupDir\" -ErrorAction SilentlyContinue
}
if (Test-Path "$AppDir\client\package.json") {
    Copy-Item "$AppDir\client\package.json" -Destination "$BackupDir\" -ErrorAction SilentlyContinue
}
Write-Log "Backup created successfully"

# ── Check package.json changes ───────────────────────────

$PackagesChanged = $false

$ServerPkgDiff = git diff origin/$Branch -- server/package.json 2>&1
if ($ServerPkgDiff -match "version|dependencies") {
    $PackagesChanged = $true
    Write-Log "Server dependencies have changed"
}

$ClientPkgDiff = git diff origin/$Branch -- client/package.json 2>&1
if ($ClientPkgDiff -match "version|dependencies") {
    $PackagesChanged = $true
    Write-Log "Client dependencies have changed"
}

# ── Pull latest changes ──────────────────────────────────

Write-Log "Pulling latest changes from $Branch..."
git pull origin $Branch 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Exit-WithError "Failed to pull from remote repository"
}

# ── Install dependencies if needed ──────────────────────

if ($PackagesChanged) {
    Write-Log "Installing dependencies..."
    
    # Install server dependencies
    if ((Test-Path "$AppDir\server") -and (Test-Path "$AppDir\server\package.json")) {
        Write-Log "  → Installing server dependencies..."
        Push-Location "$AppDir\server"
        npm install --production 2>&1 | Select-String "up to date|added|removed|changed" | Select-Object -First 5
        Pop-Location
        Write-Log "  → Server dependencies installed"
    }
    
    # Install client dependencies
    if ((Test-Path "$AppDir\client") -and (Test-Path "$AppDir\client\package.json")) {
        Write-Log "  → Installing client dependencies..."
        Push-Location "$AppDir\client"
        npm install --production 2>&1 | Select-String "up to date|added|removed|changed" | Select-Object -First 5
        Pop-Location
        Write-Log "  → Client dependencies installed"
    }
} else {
    Write-Log "No package changes detected, skipping dependency installation"
}

# ── Rebuild client if needed ─────────────────────────────

if ((Test-Path "$AppDir\client") -and (Select-String -Path "$AppDir\client\package.json" -Pattern '"build":' -Quiet)) {
    Write-Log "Building client application..."
    Push-Location "$AppDir\client"
    npm run build 2>&1 | Tail -5
    Pop-Location
    Write-Log "Client build completed"
}

# ── Restart application with PM2 ────────────────────────

if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    Write-Log "Restarting application with PM2..."
    
    # Check if app is already running in PM2
    $pm2List = pm2 list 2>&1
    if ($pm2List -match "notemind") {
        pm2 restart notemind 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Application restarted successfully"
        } else {
            Write-Log "PM2 restart attempt 1 failed, retrying with force restart..." -Level Warning
            pm2 restart notemind --force 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Exit-WithError "Failed to restart application with PM2"
            }
            Write-Log "Application force restarted successfully"
        }
    } else {
        Write-Log "Application not found in PM2, starting it..." -Level Warning
        pm2 start "$AppDir\server\index.js" --name notemind 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Application started with PM2"
        } else {
            Exit-WithError "Failed to start application with PM2"
        }
    }
    
    pm2 save 2>&1 | Out-Null
} else {
    Write-Log "PM2 not found. Please install PM2 globally: npm install -g pm2" -Level Warning
    Write-Log "Or restart your application manually" -Level Warning
}

# ── Summary ──────────────────────────────────────────────

Write-Log "═══════════════════════════════════════════════════════"
Write-Log "Auto-Update completed successfully!"
Write-Log "Update: $($LocalCommit.Substring(0, 7)) → $($RemoteCommit.Substring(0, 7))"
Write-Log "Branch: $Branch"
Write-Log "═══════════════════════════════════════════════════════"

exit 0
