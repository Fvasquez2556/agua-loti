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
    const successMsg = document.getElementById("successMsg");
    const submitButton = loginForm.querySelector('button[type="submit"]');
    const buttonText = submitButton.querySelector('.button-text');
    const buttonSpinner = submitButton.querySelector('.button-spinner');
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");

    // Agregar efectos visuales a los inputs con optimización
    [usernameInput, passwordInput].forEach(input => {
        input.addEventListener('focus', function() {
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                this.parentElement.style.transform = 'scale(1.02)';
                this.style.background = 'rgba(255, 255, 255, 0.7)';
            }
        });
        
        input.addEventListener('blur', function() {
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                this.parentElement.style.transform = 'scale(1)';
                this.style.background = 'rgba(255, 255, 255, 0.4)';
            }
        });
        
        // Limpiar mensajes al escribir
        input.addEventListener('input', clearError);
    });

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

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
     * Mostrar mensaje de error con nueva UI optimizada
     * @param {string} message - Mensaje de error
     */
    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.className = "error-message show";
        if (successMsg) {
            successMsg.classList.remove('show');
        }
        
        // Efecto de vibración optimizado para rendimiento
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            loginForm.style.animation = 'shake 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            setTimeout(() => {
                loginForm.style.animation = '';
            }, 400);
        }
    }

    /**
     * Mostrar mensaje de éxito con nueva UI
     * @param {string} message - Mensaje de éxito
     */
    function showSuccess(message) {
        if (successMsg) {
            successMsg.textContent = message;
            successMsg.className = "success-message show";
        }
        errorMsg.classList.remove('show');
    }

    /**
     * Limpiar mensajes de error
     */
    function clearError() {
        errorMsg.textContent = "";
        errorMsg.className = "error-message";
        if (successMsg) {
            successMsg.classList.remove('show');
        }
    }

    /**
     * Manejar estado de cargando con nueva UI
     * @param {boolean} isLoading - Si está cargando
     */
    function setLoadingState(isLoading) {
        submitButton.disabled = isLoading;
        
        if (isLoading) {
            submitButton.classList.add('loading');
            if (buttonText) buttonText.textContent = "Iniciando sesión...";
            if (buttonSpinner) buttonSpinner.style.display = "inline-block";
            usernameInput.disabled = true;
            passwordInput.disabled = true;
        } else {
            submitButton.classList.remove('loading');
            if (buttonText) buttonText.textContent = "Login";
            if (buttonSpinner) buttonSpinner.style.display = "none";
            usernameInput.disabled = false;
            passwordInput.disabled = false;
        }
    }

    // Limpiar campos al enfocar (mantener funcionalidad original)
    usernameInput.addEventListener('focus', clearError);
    passwordInput.addEventListener('focus', clearError);

    // Permitir login con Enter (mantener funcionalidad original)
    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });

    // Efectos de teclado adicionales
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !submitButton.disabled) {
            loginForm.dispatchEvent(new Event('submit'));
        }
        if (e.key === 'Escape') {
            clearError();
        }
    });

    // Auto-completar username para testing (solo en desarrollo)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Doble clic en el campo username para auto-completar (solo desarrollo)
        usernameInput.addEventListener('dblclick', function() {
            if (confirm('¿Usar credenciales de prueba? (Solo para desarrollo)')) {
                usernameInput.value = 'admin';
                passwordInput.value = 'admin123';
                passwordInput.focus();
            }
        });
    }
});

/**
 * Limpiar cualquier token residual al cargar la página de login
 */
window.addEventListener('load', function() {
    // Usar AuthManager para limpiar correctamente
    auth.logout();
});