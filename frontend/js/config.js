/**
 * Configuración Global del Frontend
 * Sistema Agua LOTI
 */

const AppConfig = {
    /**
     * URL base de la API
     * Usa ruta relativa para que funcione tanto en desarrollo como en producción
     */
    API_BASE_URL: window.location.origin,

    /**
     * Endpoints de la API
     */
    API_ENDPOINTS: {
        // Autenticación
        LOGIN: '/api/auth/login',
        LOGOUT: '/api/auth/logout',

        // Clientes
        CLIENTES: '/api/clientes',

        // Facturas
        FACTURAS: '/api/facturas',
        FACTURA_PDF: '/api/facturas/pdf',

        // Pagos
        PAGOS: '/api/pagos',

        // Lecturas
        LECTURAS: '/api/lecturas',

        // Mora
        MORA: '/api/mora',

        // Reconexión
        RECONEXION: '/api/reconexion',

        // Notas
        NOTAS: '/api/notas',

        // FEL
        FEL: '/api/fel'
    },

    /**
     * Configuración de la aplicación
     */
    APP_NAME: 'Sistema Agua LOTI',
    VERSION: '1.0.0',

    /**
     * Timeouts y configuraciones
     */
    REQUEST_TIMEOUT: 30000, // 30 segundos
    SESSION_CHECK_INTERVAL: 60000, // 1 minuto

    /**
     * Obtener URL completa de un endpoint
     * @param {string} endpoint - Nombre del endpoint o ruta
     * @returns {string} URL completa
     */
    getApiUrl(endpoint) {
        // Si el endpoint empieza con /, es una ruta
        if (endpoint.startsWith('/')) {
            return this.API_BASE_URL + endpoint;
        }

        // Si es un nombre de endpoint de la configuración
        if (this.API_ENDPOINTS[endpoint]) {
            return this.API_BASE_URL + this.API_ENDPOINTS[endpoint];
        }

        // Si no, devolver como está
        return endpoint;
    },

    /**
     * Información de debug
     */
    debug: {
        enabled: false, // Cambiar a true para ver logs
        log(...args) {
            if (this.enabled) {
                console.log('[AppConfig]', ...args);
            }
        }
    }
};

// Detectar si estamos en Electron
AppConfig.isElectron = typeof window.electronAPI !== 'undefined';

// Log de inicialización
if (AppConfig.debug.enabled) {
    console.log('📋 AppConfig inicializado');
    console.log('   API Base URL:', AppConfig.API_BASE_URL);
    console.log('   Is Electron:', AppConfig.isElectron);
    console.log('   Window Origin:', window.location.origin);
}

// Exportar configuración
if (typeof window !== 'undefined') {
    window.AppConfig = AppConfig;
}

// Para módulos ES6 si se necesita
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppConfig;
}
