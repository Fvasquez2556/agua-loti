/**
 * Sistema de Autenticación - auth.js
 * Maneja autenticación con sessionStorage para que se borre al cerrar navegador
 */

/**
 * Clase para manejar la autenticación
 */
class AuthManager {
    constructor() {
        this.tokenKey = 'auth_token';
        this.userKey = 'user_data';

        // Detectar si estamos en Electron
        // En Electron, usar IPC para almacenamiento seguro en el proceso principal
        // En navegador web, usar sessionStorage para mayor seguridad
        this.isElectron = typeof window !== 'undefined' &&
                          typeof window.electronAPI !== 'undefined' &&
                          window.electronAPI.isElectron === true;

        // Determinar qué storage usar (solo para fallback)
        this.storage = this.isElectron ? localStorage : sessionStorage;

        console.log(`🔐 AuthManager inicializado`);
        console.log(`   Entorno: ${this.isElectron ? 'Electron' : 'Navegador Web'}`);
        console.log(`   Storage: ${this.isElectron ? 'IPC Electron (proceso principal)' : 'sessionStorage (se borra al cerrar)'}`);
    }

    /**
     * Guardar token en storage (IPC en Electron, sessionStorage en web)
     * @param {string} token - JWT token
     * @param {object} userData - Datos del usuario (opcional)
     */
    async saveToken(token, userData = null) {
        if (this.isElectron) {
            // En Electron, usar IPC para guardar en el proceso principal
            try {
                await window.electronAPI.saveAuthData(token, userData);
                console.log('✅ Token guardado en proceso principal de Electron');
            } catch (error) {
                console.error('❌ Error guardando token en Electron:', error);
                // Fallback a localStorage
                this.storage.setItem(this.tokenKey, token);
                if (userData) {
                    this.storage.setItem(this.userKey, JSON.stringify(userData));
                }
            }
        } else {
            // En navegador web, usar sessionStorage
            this.storage.setItem(this.tokenKey, token);
            if (userData) {
                this.storage.setItem(this.userKey, JSON.stringify(userData));
            }
            console.log('✅ Token guardado correctamente');
        }
    }

    /**
     * Obtener token del storage
     * @returns {Promise<string|null>} Token o null si no existe
     */
    async getToken() {
        if (this.isElectron) {
            // En Electron, obtener del proceso principal
            try {
                const token = await window.electronAPI.getAuthToken();
                return token;
            } catch (error) {
                console.error('❌ Error obteniendo token de Electron:', error);
                // Fallback a localStorage
                return this.storage.getItem(this.tokenKey);
            }
        } else {
            // En navegador web, usar sessionStorage
            return this.storage.getItem(this.tokenKey);
        }
    }

    /**
     * Obtener datos del usuario
     * @returns {Promise<object|null>} Datos del usuario o null
     */
    async getUserData() {
        if (this.isElectron) {
            // En Electron, obtener del proceso principal
            try {
                const userData = await window.electronAPI.getUserData();
                return userData;
            } catch (error) {
                console.error('❌ Error obteniendo datos de usuario de Electron:', error);
                // Fallback a localStorage
                const userData = this.storage.getItem(this.userKey);
                return userData ? JSON.parse(userData) : null;
            }
        } else {
            // En navegador web, usar sessionStorage
            const userData = this.storage.getItem(this.userKey);
            return userData ? JSON.parse(userData) : null;
        }
    }

    /**
     * Verificar si el usuario está autenticado
     * @returns {Promise<boolean>} true si está autenticado
     */
    async isAuthenticated() {
        const token = await this.getToken();

        if (!token) {
            console.log('⚠️ No hay token de autenticación');
            return false;
        }

        try {
            // Verificar si el token ha expirado (opcional)
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Date.now() / 1000;

            if (payload.exp && payload.exp < currentTime) {
                console.log('⚠️ Token expirado');
                await this.logout();
                return false;
            }

            console.log('✅ Token válido');
            return true;
        } catch (error) {
            console.error('❌ Error verificando token:', error);
            await this.logout();
            return false;
        }
    }

    /**
     * Cerrar sesión y limpiar datos
     */
    async logout() {
        if (this.isElectron) {
            // En Electron, limpiar del proceso principal
            try {
                await window.electronAPI.clearAuthData();
                console.log('🚪 Sesión cerrada (Electron IPC)');
            } catch (error) {
                console.error('❌ Error limpiando datos en Electron:', error);
            }
        }

        // Limpiar del storage local también (por compatibilidad)
        this.storage.removeItem(this.tokenKey);
        this.storage.removeItem(this.userKey);

        // Limpiar de ambos storages por si acaso (compatibilidad con versiones anteriores)
        sessionStorage.removeItem(this.tokenKey);
        sessionStorage.removeItem(this.userKey);
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        localStorage.removeItem('token'); // Legacy
        localStorage.removeItem('user_data'); // Legacy

        console.log('🚪 Sesión cerrada y datos limpiados');
    }

    /**
     * Redirigir a login si no está autenticado
     */
    async requireAuth() {
        console.log('🔒 Verificando autenticación...');

        const isAuth = await this.isAuthenticated();
        if (!isAuth) {
            console.log('🚫 Usuario no autenticado, redirigiendo a login...');
            window.location.href = 'login.html';
            return false;
        }

        console.log('✅ Usuario autenticado correctamente');
        return true;
    }

    /**
     * Redirigir a main page si ya está autenticado
     */
    async redirectIfAuthenticated() {
        const isAuth = await this.isAuthenticated();
        if (isAuth) {
            window.location.href = 'mainPage.html';
            return true;
        }
        return false;
    }
}

// Crear instancia global
const auth = new AuthManager();

/**
 * Funciones de utilidad para login
 */
const AuthUtils = {
    /**
     * Realizar login
     * @param {string} username - Nombre de usuario
     * @param {string} password - Contraseña
     * @returns {Promise<boolean>} true si login exitoso
     */
    async login(username, password) {
        try {
            // Usar ruta relativa para que funcione en cualquier puerto
            const apiUrl = window.AppConfig
                ? window.AppConfig.getApiUrl('/api/auth/login')
                : '/api/auth/login';

            const response = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Credenciales incorrectas.");
            }

            // Guardar token en sessionStorage
            await auth.saveToken(data.token, data.user);
            return true;

        } catch (error) {
            console.error('Error en login:', error);
            throw error;
        }
    },

    /**
     * Realizar logout
     */
    logout() {
        auth.logout();
        window.location.href = 'login.html';
    },

    /**
     * Obtener headers con autorización para requests
     * @returns {Promise<object>} Headers con token
     */
    async getAuthHeaders() {
        const token = await auth.getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    },

    /**
     * Realizar request autenticado
     * @param {string} url - URL del endpoint
     * @param {object} options - Opciones del fetch
     * @returns {Promise<Response>} Response del fetch
     */
    async authenticatedFetch(url, options = {}) {
        const authHeaders = await this.getAuthHeaders();
        const headers = {
            ...authHeaders,
            ...options.headers
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        // Si el token ha expirado o es inválido
        if (response.status === 401) {
            await auth.logout();
            window.location.href = 'login.html';
            throw new Error('Sesión expirada');
        }

        return response;
    }
};

/**
 * Event listeners para detectar cierre de ventana/pestaña
 */
window.addEventListener('beforeunload', function(e) {
    // Opcional: mostrar confirmación antes de cerrar
    // if (auth.isAuthenticated()) {
    //     e.preventDefault();
    //     e.returnValue = '¿Estás seguro de que quieres salir? Tu sesión se cerrará.';
    // }
});

window.addEventListener('unload', function() {
    // La sesión se borrará automáticamente al usar sessionStorage
});

// Event listener para detectar cambios de visibilidad (opcional)
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
        // La página está oculta (usuario cambió de pestaña o minimizó)
        // Aquí podrías implementar logout por inactividad si lo deseas
    }
});

// Exportar para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, AuthUtils, auth };
}