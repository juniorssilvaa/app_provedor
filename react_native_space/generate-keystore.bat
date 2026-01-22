@echo off
echo ========================================
echo Gerador de Keystore Android
echo ========================================
echo.
echo Este script ira gerar uma chave de assinatura (Keystore) para a Play Store.
echo.
echo Pressione ENTER para continuar...
pause > nul

set /p KEY_NAME="Digite o nome do arquivo (ex: upload-key): "
if "%KEY_NAME%"=="" set KEY_NAME=upload-key

set /p KEY_ALIAS="Digite o alias da chave (ex: my-key-alias): "
if "%KEY_ALIAS%"=="" set KEY_ALIAS=my-key-alias

echo.
echo Gerando %KEY_NAME%.keystore...
echo Voce precisara definir uma senha e responder algumas perguntas.
echo IMPORTANTE: Guarde a senha e o arquivo em local seguro!
echo.

keytool -genkeypair -v -storetype PKCS12 -keystore android/app/%KEY_NAME%.keystore -alias %KEY_ALIAS% -keyalg RSA -keysize 2048 -validity 10000

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Keystore gerada com sucesso!
    echo Arquivo: android/app/%KEY_NAME%.keystore
    echo Alias: %KEY_ALIAS%
    echo ========================================
    echo.
) else (
    echo.
    echo ========================================
    echo Erro ao gerar Keystore. Verifique se o Java (JDK) esta instalado e no PATH.
    echo ========================================
    echo.
)

pause
