#!/bin/bash

# ====================================
# Script de Instalación - Sistema Agua LOTI
# Para Linux/Mac
# ====================================

set -e  # Detener si hay error

echo ""
echo "===================================="
echo "  INSTALADOR - SISTEMA AGUA LOTI"
echo "===================================="
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js no está instalado"
    echo ""
    echo "Por favor instala Node.js desde: https://nodejs.org/"
    echo ""
    exit 1
fi

echo "[OK] Node.js encontrado"
node --version
echo ""

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo "[ERROR] npm no está instalado"
    exit 1
fi

echo "[OK] npm encontrado"
npm --version
echo ""

# Verificar MongoDB
if ! command -v mongod &> /dev/null; then
    echo "[ADVERTENCIA] MongoDB no encontrado en PATH"
    echo ""
    echo "Si MongoDB está instalado, asegúrate que esté en el PATH"
    echo "O instálalo desde: https://www.mongodb.com/try/download/community"
    echo ""
fi

echo ""
echo "===================================="
echo "  PASO 1: Instalando dependencias"
echo "===================================="
echo ""

npm install

echo ""
echo "[OK] Dependencias instaladas correctamente"
echo ""

echo "===================================="
echo "  PASO 2: Configurando variables"
echo "===================================="
echo ""

if [ ! -f .env ]; then
    echo "Copiando .env.example a .env..."
    cp .env.example .env
    echo "[OK] Archivo .env creado"
    echo ""
    echo "IMPORTANTE: Edita el archivo .env con tus credenciales"
    echo ""
else
    echo "[INFO] El archivo .env ya existe"
    echo ""
fi

echo "===================================="
echo "  PASO 3: Creando carpetas"
echo "===================================="
echo ""

# Crear carpetas necesarias si no existen
mkdir -p backend/uploads/tickets
mkdir -p backend/uploads/facturas-temporales
mkdir -p whatsapp-sessions

echo "[OK] Carpetas creadas"
echo ""

echo "===================================="
echo "  PASO 4: Verificando MongoDB"
echo "===================================="
echo ""

if command -v systemctl &> /dev/null; then
    echo "Intentando iniciar MongoDB..."
    if sudo systemctl start mongod 2>/dev/null; then
        echo "[OK] MongoDB iniciado correctamente"
    else
        echo "[INFO] MongoDB puede estar ya corriendo o requiere configuración manual"
    fi
elif command -v brew &> /dev/null; then
    echo "Detectado macOS con Homebrew"
    if brew services start mongodb-community 2>/dev/null; then
        echo "[OK] MongoDB iniciado correctamente"
    else
        echo "[INFO] MongoDB puede estar ya corriendo"
    fi
else
    echo "[INFO] No se pudo detectar gestor de servicios"
    echo "Por favor inicia MongoDB manualmente"
fi
echo ""

echo "===================================="
echo "  INSTALACIÓN COMPLETADA"
echo "===================================="
echo ""
echo "Pasos siguientes:"
echo ""
echo "1. Edita el archivo .env con tus credenciales:"
echo "   nano .env"
echo ""
echo "2. Asegúrate que MongoDB esté corriendo"
echo ""
echo "3. Crea un usuario admin:"
echo "   npm run crear-admin"
echo ""
echo "4. Inicia el sistema:"
echo "   npm start"
echo ""
echo "===================================="
echo ""
