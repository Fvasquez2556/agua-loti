@echo off
REM ====================================
REM Script de Instalacion - Sistema Agua LOTI
REM Para Windows
REM ====================================

echo.
echo ====================================
echo   INSTALADOR - SISTEMA AGUA LOTI
echo ====================================
echo.

REM Verificar que Node.js este instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado
    echo.
    echo Por favor instala Node.js desde: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js encontrado
node --version
echo.

REM Verificar que MongoDB este instalado
where mongod >nul 2>nul
if %errorlevel% neq 0 (
    echo [ADVERTENCIA] MongoDB no encontrado en PATH
    echo.
    echo Si MongoDB esta instalado, asegurate que este en el PATH
    echo O instalalo desde: https://www.mongodb.com/try/download/community
    echo.
)

echo.
echo ====================================
echo   PASO 1: Instalando dependencias
echo ====================================
echo.

call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la instalacion de dependencias
    pause
    exit /b 1
)

echo.
echo [OK] Dependencias instaladas correctamente
echo.

echo ====================================
echo   PASO 2: Configurando variables
echo ====================================
echo.

if not exist .env (
    echo Copiando .env.example a .env...
    copy .env.example .env >nul
    echo [OK] Archivo .env creado
    echo.
    echo IMPORTANTE: Edita el archivo .env con tus credenciales
    echo.
) else (
    echo [INFO] El archivo .env ya existe
    echo.
)

echo ====================================
echo   PASO 3: Verificando MongoDB
echo ====================================
echo.

echo Intentando conectar a MongoDB...
timeout /t 2 >nul
net start MongoDB >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] MongoDB iniciado correctamente
) else (
    echo [INFO] MongoDB puede estar ya corriendo o no instalado como servicio
)
echo.

echo ====================================
echo   INSTALACION COMPLETADA
echo ====================================
echo.
echo Pasos siguientes:
echo.
echo 1. Edita el archivo .env con tus credenciales
echo 2. Asegurate que MongoDB este corriendo
echo 3. Crea un usuario admin: npm run crear-admin
echo 4. Inicia el sistema: npm start
echo.
echo ====================================
echo.
pause
