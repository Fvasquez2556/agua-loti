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

    // Configurar botón de logout
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
    // Buscar todos los botones de logout posibles
    const logoutButtons = document.querySelectorAll('#logoutBtn, .logout-btn, [data-logout]');
    
    logoutButtons.forEach(button => {
        // Remover cualquier listener existente clonando el elemento
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Agregar el nuevo listener
        newButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Usar modal personalizado en lugar de confirm()
            showLogoutModal();
        });
    });
}

/**
 * Mostrar modal de confirmación de logout personalizado
 */
function showLogoutModal() {
    // Crear modal personalizado
    const modal = document.createElement('div');
    modal.id = 'logoutModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        text-align: center;
        max-width: 400px;
        width: 90%;
    `;

    modalContent.innerHTML = `
        <h3 style="margin: 0 0 15px 0; color: #333;">Cerrar Sesión</h3>
        <p style="margin: 0 0 25px 0; color: #666;">¿Estás seguro de que deseas cerrar sesión?</p>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="confirmLogout" style="
                background: #dc3545;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
            ">Sí, cerrar sesión</button>
            <button id="cancelLogout" style="
                background: #6c757d;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
            ">Cancelar</button>
        </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Event listeners para los botones
    document.getElementById('confirmLogout').addEventListener('click', () => {
        // Limpiar datos de autenticación
        auth.logout();
        
        // Mostrar mensaje de confirmación
        showLogoutMessage();
        
        // Redirigir después de un breve delay
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
        
        // Remover modal
        modal.remove();
    });

    document.getElementById('cancelLogout').addEventListener('click', () => {
        modal.remove();
    });

    // Cerrar modal al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Cerrar modal con ESC
    const handleKeyPress = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleKeyPress);
        }
    };
    document.addEventListener('keydown', handleKeyPress);
}

/**
 * Mostrar mensaje de logout exitoso
 */
function showLogoutMessage() {
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        font-weight: 500;
        z-index: 10001;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    `;
    message.textContent = 'Sesión cerrada exitosamente';
    document.body.appendChild(message);

    setTimeout(() => {
        if (message.parentNode) {
            message.remove();
        }
    }, 800);
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