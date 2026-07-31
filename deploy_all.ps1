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
Write-Host "[7/7] Creating GitHub Release v1.0.0..." -ForegroundColor Yellow

$ghCmd = Get-Command gh -ErrorAction SilentlyContinue
if ($ghCmd) {
    $notesFile = Join-Path $projectDir "RELEASE_NOTES.md"

    $installer = Get-ChildItem -Path $projectDir -Recurse -Filter "SmartStudyHub-Setup*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1

    if ($installer) {
        Write-Host "  Found installer: $($installer.FullName)" -ForegroundColor Gray
        gh release create v1.0.0 --repo "KamilRemix/SmartStudyHub" --title "SmartStudyHub v1.0.0" --notes-file $notesFile $installer.FullName
        Write-Host "  GitHub Release created with installer!" -ForegroundColor Green
    } else {
        Write-Host "  No .exe found - creating release without asset." -ForegroundColor DarkYellow
        gh release create v1.0.0 --repo "KamilRemix/SmartStudyHub" --title "SmartStudyHub v1.0.0" --notes-file $notesFile
        Write-Host "  GitHub Release created (no .exe attached)." -ForegroundColor Green
        Write-Host ""
        Write-Host "  TIP: Build the Windows installer first:" -ForegroundColor DarkYellow
        Write-Host "       npm run build" -ForegroundColor White
        Write-Host "       Then upload the .exe from dist/ to the release manually." -ForegroundColor White
    }
} else {
    Write-Host "  'gh' CLI not found." -ForegroundColor Red
    Write-Host "  Install it from: https://cli.github.com/" -ForegroundColor Yellow
    Write-Host "  Then run: gh release create v1.0.0 --title 'SmartStudyHub v1.0.0' --notes-file RELEASE_NOTES.md" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  All Done! Summary:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Web App:   https://smartstudyhub-46d44.web.app" -ForegroundColor Green
Write-Host "  GitHub:    https://github.com/KamilRemix/SmartStudyHub" -ForegroundColor Green
Write-Host "  Releases:  https://github.com/KamilRemix/SmartStudyHub/releases" -ForegroundColor Green
Write-Host ""
