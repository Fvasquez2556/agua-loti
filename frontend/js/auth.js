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
    }

    /**
     * Guardar token en sessionStorage (se borra al cerrar navegador)
     * @param {string} token - JWT token
     * @param {object} userData - Datos del usuario (opcional)
     */
    saveToken(token, userData = null) {
        sessionStorage.setItem(this.tokenKey, token);
        if (userData) {
            sessionStorage.setItem(this.userKey, JSON.stringify(userData));
        }
    }

    /**
     * Obtener token del sessionStorage
     * @returns {string|null} Token o null si no existe
     */
    getToken() {
        return sessionStorage.getItem(this.tokenKey);
    }

    /**
     * Obtener datos del usuario
     * @returns {object|null} Datos del usuario o null
     */
    getUserData() {
        const userData = sessionStorage.getItem(this.userKey);
        return userData ? JSON.parse(userData) : null;
    }

    /**
     * Verificar si el usuario está autenticado
     * @returns {boolean} true si está autenticado
     */
    isAuthenticated() {
        const token = this.getToken();
        if (!token) return false;

        try {
            // Verificar si el token ha expirado (opcional)
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Date.now() / 1000;
            
            if (payload.exp && payload.exp < currentTime) {
                this.logout();
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error verificando token:', error);
            this.logout();
            return false;
        }
    }

    /**
     * Cerrar sesión y limpiar datos
     */
    logout() {
        sessionStorage.removeItem(this.tokenKey);
        sessionStorage.removeItem(this.userKey);
        // También limpiar localStorage por si acaso
        localStorage.removeItem('token');
        localStorage.removeItem('user_data');
    }

    /**
     * Redirigir a login si no está autenticado
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    /**
     * Redirigir a main page si ya está autenticado
     */
    redirectIfAuthenticated() {
        if (this.isAuthenticated()) {
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
            const response = await fetch("http://localhost:5000/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Credenciales incorrectas.");
            }

            // Guardar token en sessionStorage
            auth.saveToken(data.token, data.user);
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
     * @returns {object} Headers con token
     */
    getAuthHeaders() {
        const token = auth.getToken();
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
        const headers = {
            ...this.getAuthHeaders(),
            ...options.headers
        };

        const response = await fetch(url, {
            ...options,
            headers
        });

        // Si el token ha expirado o es inválido
        if (response.status === 401) {
            auth.logout();
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