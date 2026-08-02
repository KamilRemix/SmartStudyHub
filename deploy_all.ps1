# SmartStudyHub — Full Deployment Script
# Run from the project root: .\deploy_all.ps1
# Or right-click -> "Run with PowerShell"

$ErrorActionPreference = "Stop"

$projectDir = $PSScriptRoot
if (-not $projectDir) {
    $projectDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
}
Set-Location $projectDir

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SmartStudyHub - Deployment Pipeline" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ---- STEP 1: Remove AI trace files ----
Write-Host "[1/7] Cleaning AI trace files..." -ForegroundColor Yellow
$trashFiles = @(
    "find-missing.js",
    "add_translations.js",
    "DEPLOY_ELECTRON_AUTH.md",
    "public\test_icons.html"
)
foreach ($f in $trashFiles) {
    $full = Join-Path $projectDir $f
    if (Test-Path $full) {
        Remove-Item $full -Force
        Write-Host "  Deleted: $f" -ForegroundColor Gray
    }
}
Write-Host "  Done." -ForegroundColor Green

# ---- STEP 2: Build web app ----
Write-Host ""
Write-Host "[2/7] Building web app (node build-web.js)..." -ForegroundColor Yellow
node build-web.js
Write-Host "  Web build complete." -ForegroundColor Green

# ---- STEP 3: Deploy to Firebase Hosting ----
Write-Host ""
Write-Host "[3/7] Deploying to Firebase Hosting..." -ForegroundColor Yellow
npx -y firebase-tools@latest deploy --only hosting --project smartstudyhub-46d44
Write-Host "  Firebase deploy complete." -ForegroundColor Green

# ---- STEP 4: Git stage + commit + push ----
Write-Host ""
Write-Host "[4/7] Git: staging all changes..." -ForegroundColor Yellow
git add .

Write-Host "[5/7] Git: committing..." -ForegroundColor Yellow
git commit -m "chore: cleanup AI traces, update README, v1.0.0 release prep"

Write-Host "[6/7] Git: pushing to origin/main..." -ForegroundColor Yellow
git push origin main
Write-Host "  GitHub push complete." -ForegroundColor Green

# ---- STEP 5: GitHub Release ----
Write-Host ""

# Get version from package.json
$version = "1.0.0"
$packageJsonPath = Join-Path $projectDir "package.json"
if (Test-Path $packageJsonPath) {
    $packageJson = Get-Content $packageJsonPath | ConvertFrom-Json
    if ($packageJson.version) {
        $version = $packageJson.version
    }
}

Write-Host "[7/7] Processing GitHub Release v$version..." -ForegroundColor Yellow

$ghCmd = Get-Command gh -ErrorAction SilentlyContinue
if ($ghCmd) {
    $notesFile = Join-Path $projectDir "RELEASE_NOTES.md"
    
    # Search for setup executable in dist
    $installer = Get-ChildItem -Path (Join-Path $projectDir "dist") -Filter "SmartStudyHub*Setup*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $installer) {
        $installer = Get-ChildItem -Path (Join-Path $projectDir "dist") -Filter "SmartStudyHub*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    }

    # Check if release exists on GitHub
    $releaseExists = $false
    gh release view "v$version" --repo "KamilRemix/SmartStudyHub" >$null 2>&1
    if ($LASTEXITCODE -eq 0) {
        $releaseExists = $true
    }

    if ($installer) {
        Write-Host "  Found installer: $($installer.FullName)" -ForegroundColor Gray
        if ($releaseExists) {
            Write-Host "  Release v$version already exists. Uploading installer..." -ForegroundColor Yellow
            gh release upload "v$version" --repo "KamilRemix/SmartStudyHub" $installer.FullName --clobber
            Write-Host "  Installer uploaded to existing release!" -ForegroundColor Green
        } else {
            Write-Host "  Creating new release v$version..." -ForegroundColor Yellow
            if (Test-Path $notesFile) {
                gh release create "v$version" --repo "KamilRemix/SmartStudyHub" --title "SmartStudyHub v$version" --notes-file $notesFile $installer.FullName
            } else {
                gh release create "v$version" --repo "KamilRemix/SmartStudyHub" --title "SmartStudyHub v$version" --notes "Release v$version of SmartStudyHub" $installer.FullName
            }
            Write-Host "  GitHub Release created with installer!" -ForegroundColor Green
        }
    } else {
        Write-Host "  No .exe found in dist/." -ForegroundColor DarkYellow
        if (-not $releaseExists) {
            Write-Host "  Creating release v$version without asset..." -ForegroundColor Yellow
            if (Test-Path $notesFile) {
                gh release create "v$version" --repo "KamilRemix/SmartStudyHub" --title "SmartStudyHub v$version" --notes-file $notesFile
            } else {
                gh release create "v$version" --repo "KamilRemix/SmartStudyHub" --title "SmartStudyHub v$version" --notes "Release v$version of SmartStudyHub"
            }
            Write-Host "  GitHub Release created (no .exe attached)." -ForegroundColor Green
        } else {
            Write-Host "  Release v$version already exists." -ForegroundColor Green
        }
    }
} else {
    Write-Host "  'gh' CLI not found." -ForegroundColor Red
    Write-Host "  Install it from: https://cli.github.com/" -ForegroundColor Yellow
    Write-Host "  Then run: gh release upload v$version dist\<installer>.exe" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  All Done! Summary:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Web App:   https://smartstudyhub-46d44.web.app" -ForegroundColor Green
Write-Host "  GitHub:    https://github.com/KamilRemix/SmartStudyHub" -ForegroundColor Green
Write-Host "  Releases:  https://github.com/KamilRemix/SmartStudyHub/releases" -ForegroundColor Green
Write-Host ""
