@echo off
echo ========================================
echo Build APK para NANET
echo ========================================
echo.

cd android

echo Limpando builds anteriores...
call gradlew clean

echo.
echo Gerando APK de release...
call gradlew assembleRelease

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo APK gerado com sucesso!
    echo ========================================
    echo.
    echo Localizacao: android\app\build\outputs\apk\release\app-release.apk
    echo.
) else (
    echo.
    echo ========================================
    echo ERRO ao gerar APK!
    echo ========================================
    echo.
)

pause
