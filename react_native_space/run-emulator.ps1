# Roda o app no emulador (Nox Player).
# Uso: .\run-emulator.ps1
# Com o Metro aberto, pressione "a" para abrir no Android.

$ErrorActionPreference = "Stop"
$sdk = "C:\Android\Sdk"
$adb = "$sdk\platform-tools\adb.exe"

$env:ANDROID_HOME = $sdk
$env:PATH = "$sdk\platform-tools;" + $env:PATH

Write-Host "Conectando ao Nox (127.0.0.1:62001)..." -ForegroundColor Cyan
& $adb kill-server 2>$null
Start-Sleep -Seconds 2
& $adb start-server | Out-Null
& $adb connect 127.0.0.1:62001 | Out-Null
Start-Sleep -Seconds 1
$devices = & $adb devices
if ($devices -notmatch "127.0.0.1:62001\s+device") {
    Write-Host "AVISO: Nox nao detectado. Abra o Nox e rode o script de novo." -ForegroundColor Yellow
} else {
    Write-Host "Nox conectado." -ForegroundColor Green
}

Write-Host "`nIniciando Expo (Metro). Quando aparecer o menu, pressione [a] para abrir no Android.`n" -ForegroundColor Cyan
Set-Location $PSScriptRoot
npx expo start -c
