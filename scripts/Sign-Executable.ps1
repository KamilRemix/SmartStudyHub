# PowerShell Code Signing Script for SmartStudyHub Executables

$certName = "SmartStudyHub Code Signing"
$cert = Get-ChildItem -Path Cert:\CurrentUser\My | Where-Object { $_.Subject -like "*$certName*" } | Select-Object -First 1

if (-not $cert) {
    Write-Host "Creating self-signed Code Signing certificate..." -ForegroundColor Cyan
    $cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=$certName" -CertStoreLocation Cert:\CurrentUser\My -NotAfter (Get-Date).AddYears(5)
    
    # Export public cert to Root store for local trust
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "CurrentUser")
    $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
    $store.Add($cert)
    $store.Close()
    Write-Host "Certificate added to Trusted Root Certification Authorities." -ForegroundColor Green
}

$exeFiles = Get-ChildItem -Path "$PSScriptRoot\..\dist-exe" -Filter "*.exe" -Recurse

if ($exeFiles.Count -eq 0) {
    Write-Host "No .exe files found in dist folder to sign." -ForegroundColor Yellow
    exit 0
}

foreach ($exe in $exeFiles) {
    Write-Host "Signing $($exe.Name)..." -ForegroundColor Cyan
    Set-AuthenticodeSignature -FilePath $exe.FullName -Certificate $cert -TimestampServer "http://timestamp.digicert.com"
}

Write-Host "All executables signed successfully!" -ForegroundColor Green
