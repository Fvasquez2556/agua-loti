/**
 * Sistema de Login - main.js
 * Maneja el formulario de login con sessionStorage
 */

document.addEventListener('DOMContentLoaded', function() {
    // Verificar si ya está autenticado al cargar la página de login
    if (auth.redirectIfAuthenticated()) {
        return; // Sale de la función si ya está autenticado
    }

    // Manejar el formulario de login
    const loginForm = document.getElementById("loginForm");
    const errorMsg = document.getElementById("errorMsg");
    const submitButton = loginForm.querySelector('button[type="submit"]');

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();

        // Validaciones básicas
        if (!username || !password) {
            showError("Por favor complete todos los campos.");
            return;
        }

        // Deshabilitar botón y mostrar cargando
        setLoadingState(true);
        clearError();

        try {
            // Intentar login usando AuthUtils
            await AuthUtils.login(username, password);
            
            // Si llegamos aquí, el login fue exitoso
            showSuccess("Login exitoso. Redirigiendo...");
            
            // Pequeña pausa para mostrar el mensaje de éxito
            setTimeout(() => {
                window.location.href = "mainPage.html";
            }, 1000);

        } catch (error) {
            showError(error.message || "Error de conexión con el servidor.");
            console.error('Error en login:', error);
        } finally {
            setLoadingState(false);
        }
    });

    /**
     * Mostrar mensaje de error
     * @param {string} message - Mensaje de error
     */
    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.className = "error-msg show";
        errorMsg.style.color = "#dc3545";
    }

    /**
     * Mostrar mensaje de éxito
     * @param {string} message - Mensaje de éxito
     */
    function showSuccess(message) {
        errorMsg.textContent = message;
        errorMsg.className = "success-msg show";
        errorMsg.style.color = "#28a745";
    }

    /**
     * Limpiar mensajes de error
     */
    function clearError() {
        errorMsg.textContent = "";
        errorMsg.className = "error-msg";
    }

    /**
     * Manejar estado de cargando
     * @param {boolean} isLoading - Si está cargando
     */
    function setLoadingState(isLoading) {
        submitButton.disabled = isLoading;
        submitButton.textContent = isLoading ? "Ingresando..." : "Ingresar";
        
        // Cambiar cursor
        if (isLoading) {
            submitButton.style.cursor = "not-allowed";
            submitButton.style.opacity = "0.7";
        } else {
            submitButton.style.cursor = "pointer";
            submitButton.style.opacity = "1";
        }
    }

    // Limpiar campos al enfocar
    document.getElementById("username").addEventListener('focus', clearError);
    document.getElementById("password").addEventListener('focus', clearError);

    // Permitir login con Enter
    document.getElementById("password").addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });
});

/**
 * Limpiar cualquier token residual al cargar la página de login
 */
window.addEventListener('load', function() {
    // Limpiar cualquier localStorage residual
    localStorage.removeItem('token');
    localStorage.removeItem('user_data');
});