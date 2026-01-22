@echo off
echo ========================================
echo Build AAB para Google Play - NANET
echo ========================================
echo.

cd android

echo Limpando builds anteriores...
call gradlew clean

echo.
echo Gerando AAB (Android App Bundle) de release...
call gradlew bundleRelease

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo AAB gerado com sucesso!
    echo ========================================
    echo.
    echo Localizacao: android\app\build\outputs\bundle\release\app-release.aab
    echo.
    echo Este arquivo esta pronto para upload na Google Play Console!
    echo.
) else (
    echo.
    echo ========================================
    echo ERRO ao gerar AAB!
    echo ========================================
    echo.
)

pause
