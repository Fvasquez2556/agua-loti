/**
 * Protección de Páginas - pageProtection.js
 * Debe incluirse en todas las páginas que requieren autenticación
 */

document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación inmediatamente al cargar la página
    if (!auth.requireAuth()) {
        return; // Si no está autenticado, ya se redirige al login
    }

    // Mostrar información del usuario si está disponible
    displayUserInfo();

    // Configurar botón de logout si existe
    setupLogoutButton();

    // Verificar token periódicamente (cada 5 minutos)
    setInterval(checkTokenValidity, 5 * 60 * 1000);
});

/**
 * Mostrar información del usuario en la página
 */
function displayUserInfo() {
    const userData = auth.getUserData();
    if (userData) {
        // Buscar elementos donde mostrar info del usuario
        const userNameElement = document.getElementById('userName');
        const userRoleElement = document.getElementById('userRole');
        
        if (userNameElement && userData.username) {
            userNameElement.textContent = userData.username;
        }
        
        if (userRoleElement && userData.role) {
            userRoleElement.textContent = userData.role;
        }
    }
}

/**
 * Configurar botón de logout
 */
function setupLogoutButton() {
    // Buscar botones de logout
    const logoutButtons = document.querySelectorAll('[data-logout], .logout-btn, #logoutBtn');
    
    logoutButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Mostrar confirmación
            if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                AuthUtils.logout();
            }
        });
    });

    // También escuchar Ctrl+L para logout rápido (opcional)
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            if (confirm('¿Cerrar sesión? (Ctrl+L)')) {
                AuthUtils.logout();
            }
        }
    });
}

/**
 * Verificar validez del token periódicamente
 */
function checkTokenValidity() {
    if (!auth.isAuthenticated()) {
        alert('Tu sesión ha expirado. Serás redirigido al login.');
        AuthUtils.logout();
    }
}

/**
 * Funciones de utilidad para páginas protegidas
 */
const PageUtils = {
    /**
     * Realizar request autenticado a la API
     * @param {string} endpoint - Endpoint de la API
     * @param {object} options - Opciones del fetch
     * @returns {Promise<any>} Datos de la respuesta
     */
    async apiRequest(endpoint, options = {}) {
        try {
            const response = await AuthUtils.authenticatedFetch(
                `http://localhost:5000/api${endpoint}`,
                options
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error en la solicitud');
            }

            return await response.json();
        } catch (error) {
            console.error('Error en API request:', error);
            throw error;
        }
    },

    /**
     * Mostrar mensaje de éxito en la página
     * @param {string} message - Mensaje a mostrar
     */
    showSuccess(message) {
        this.showMessage(message, 'success');
    },

    /**
     * Mostrar mensaje de error en la página
     * @param {string} message - Mensaje a mostrar
     */
    showError(message) {
        this.showMessage(message, 'error');
    },

    /**
     * Mostrar mensaje general
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo de mensaje (success, error, warning)
     */
    showMessage(message, type = 'info') {
        // Crear elemento de mensaje si no existe
        let messageContainer = document.getElementById('messageContainer');
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'messageContainer';
            messageContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                max-width: 400px;
            `;
            document.body.appendChild(messageContainer);
        }

        // Crear mensaje
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            padding: 12px 16px;
            margin-bottom: 10px;
            border-radius: 8px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            animation: slideIn 0.3s ease;
            ${this.getMessageStyles(type)}
        `;
        messageDiv.textContent = message;

        messageContainer.appendChild(messageDiv);

        // Remover mensaje después de 5 segundos
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => {
                    if (messageDiv.parentNode) {
                        messageDiv.parentNode.removeChild(messageDiv);
                    }
                }, 300);
            }
        }, 5000);

        // Agregar estilos de animación si no existen
        this.addAnimationStyles();
    },

    /**
     * Obtener estilos según el tipo de mensaje
     * @param {string} type - Tipo de mensaje
     * @returns {string} CSS styles
     */
    getMessageStyles(type) {
        const styles = {
            success: 'background: #d4edda; color: #155724; border-left: 4px solid #28a745;',
            error: 'background: #f8d7da; color: #721c24; border-left: 4px solid #dc3545;',
            warning: 'background: #fff3cd; color: #856404; border-left: 4px solid #ffc107;',
            info: 'background: #d1ecf1; color: #0c5460; border-left: 4px solid #17a2b8;'
        };
        return styles[type] || styles.info;
    },

    /**
     * Agregar estilos de animación
     */
    addAnimationStyles() {
        if (!document.getElementById('messageAnimations')) {
            const style = document.createElement('style');
            style.id = 'messageAnimations';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
};

// Event listener para detectar cambios de pestaña
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        // Verificar token cuando el usuario regresa a la pestaña
        if (!auth.isAuthenticated()) {
            AuthUtils.logout();
        }
    }
});