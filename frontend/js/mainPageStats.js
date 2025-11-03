// frontend/js/mainPageStats.js
/**
 * Módulo para manejar las estadísticas en tiempo real del mainPage
 */

class MainPageStats {
    constructor() {
        this.baseURL = '/api';
        this.updateInterval = 30000; // 30 segundos
        this.intervalId = null;
        this.isLoading = false;
    }

    /**
     * Inicializar el módulo de estadísticas
     */
    init() {
        console.log('🔄 Inicializando estadísticas del dashboard...');
        this.setupEventListeners();
        this.loadStatistics();
        this.startAutoUpdate();
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Botón de actualización manual
        const refreshBtn = document.getElementById('refreshStats');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadStatistics(true);
            });
        }

        // Actualizar cuando la página regresa al foco
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.loadStatistics();
            }
        });
    }

    /**
     * Cargar estadísticas desde el backend
     */
    async loadStatistics(manual = false) {
        if (this.isLoading && !manual) return;

        try {
            this.isLoading = true;
            this.showLoadingState();

            // Usar AuthManager para obtener el token
            const token = auth.getToken();
            if (!token) {
                console.warn('No hay token de autenticación');
                this.redirectToLogin();
                return;
            }

            const response = await fetch(`${this.baseURL}/facturas/dashboard`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.warn('Token expirado, redirigiendo al login...');
                    this.redirectToLogin();
                    return;
                }
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.success) {
                this.updateStatisticsDisplay(data.data);
                this.showSuccessState();
                console.log('✅ Estadísticas actualizadas correctamente');
            } else {
                throw new Error(data.message || 'Error al cargar estadísticas');
            }

        } catch (error) {
            console.error('❌ Error al cargar estadísticas:', error);
            this.showErrorState(error.message);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Actualizar la visualización de las estadísticas
     */
    updateStatisticsDisplay(stats) {
        // Total de clientes
        this.updateStatCard('totalClientes', stats.totalClientes, 'clientes registrados');

        // Facturas del mes
        this.updateStatCard('facturasMes', stats.facturasMes, 'facturas este mes');

        // Facturas pendientes (cambiar de "Pagos Pendientes" a "Facturas Pendientes")
        this.updateStatCard('pagosPendientes', stats.facturasPendientes, 'facturas pendientes');

        // Ingresos del mes
        const ingresosMesFormateado = this.formatCurrency(stats.ingresosMes);
        this.updateStatCard('ingresosMes', ingresosMesFormateado, 'ingresos del mes');

        // Actualizar información adicional
        this.updateAdditionalInfo(stats);

        // Actualizar timestamp
        this.updateLastUpdateTime();
    }

    /**
     * Actualizar una tarjeta de estadística individual
     */
    updateStatCard(elementId, value, label) {
        const element = document.getElementById(elementId);
        const labelElement = element?.parentElement?.querySelector('.stat-label');
        
        if (element) {
            // Añadir animación de actualización
            element.style.transform = 'scale(1.1)';
            element.style.transition = 'transform 0.3s ease';
            
            setTimeout(() => {
                element.textContent = value;
                element.style.transform = 'scale(1)';
            }, 150);
        }

        if (labelElement && label) {
            labelElement.textContent = label;
        }
    }

    /**
     * Actualizar información adicional (facturas vencidas, etc.)
     */
    updateAdditionalInfo(stats) {
        // Actualizar o crear indicador de facturas vencidas
        let vencidasIndicator = document.getElementById('facturasVencidas');
        
        if (!vencidasIndicator) {
            // Crear el indicador si no existe
            const statsSection = document.querySelector('.stats-section');
            if (statsSection) {
                const vencidasDiv = document.createElement('div');
                vencidasDiv.className = 'alert-indicator';
                vencidasDiv.innerHTML = `
                    <div class="alert-content">
                        <span class="alert-icon">⚠️</span>
                        <span class="alert-text">
                            <span id="facturasVencidas">${stats.facturasVencidas}</span> facturas vencidas
                        </span>
                        <span class="alert-amount">Q${this.formatNumber(stats.montoPendiente)} pendientes</span>
                    </div>
                `;
                statsSection.appendChild(vencidasDiv);
            }
        } else {
            vencidasIndicator.textContent = stats.facturasVencidas;
            const montoPendienteEl = document.querySelector('.alert-amount');
            if (montoPendienteEl) {
                montoPendienteEl.textContent = `Q${this.formatNumber(stats.montoPendiente)} pendientes`;
            }
        }
    }

    /**
     * Formatear moneda
     */
    formatCurrency(amount) {
        return `Q${this.formatNumber(amount)}`;
    }

    /**
     * Formatear números con separadores de miles
     */
    formatNumber(num) {
        if (isNaN(num)) return '0.00';
        return parseFloat(num).toLocaleString('es-GT', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    /**
     * Mostrar estado de carga
     */
    showLoadingState() {
        const statNumbers = document.querySelectorAll('.stat-number');
        statNumbers.forEach(stat => {
            stat.style.opacity = '0.6';
        });

        // Mostrar indicador de carga si existe
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }
    }

    /**
     * Mostrar estado de éxito
     */
    showSuccessState() {
        const statNumbers = document.querySelectorAll('.stat-number');
        statNumbers.forEach(stat => {
            stat.style.opacity = '1';
        });

        // Ocultar indicador de carga
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }

    /**
     * Mostrar estado de error
     */
    showErrorState(errorMessage) {
        console.error('Error en estadísticas:', errorMessage);
        
        // Restaurar opacidad
        const statNumbers = document.querySelectorAll('.stat-number');
        statNumbers.forEach(stat => {
            stat.style.opacity = '1';
        });

        // Mostrar mensaje de error temporal
        this.showTemporaryMessage(`Error: ${errorMessage}`, 'error');
    }

    /**
     * Mostrar mensaje temporal
     */
    showTemporaryMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `temporary-message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 1000;
            font-size: 14px;
            ${type === 'error' ? 'background: #ff6b6b; color: white;' : 'background: #4ecdc4; color: white;'}
        `;

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    /**
     * Actualizar timestamp de última actualización
     */
    updateLastUpdateTime() {
        let timestampEl = document.getElementById('lastUpdate');
        
        if (!timestampEl) {
            // Crear elemento de timestamp si no existe
            const statsSection = document.querySelector('.stats-section');
            if (statsSection) {
                timestampEl = document.createElement('div');
                timestampEl.id = 'lastUpdate';
                timestampEl.className = 'last-update';
                statsSection.appendChild(timestampEl);
            }
        }

        if (timestampEl) {
            const now = new Date();
            timestampEl.textContent = `Última actualización: ${now.toLocaleTimeString('es-GT')}`;
        }
    }

    /**
     * Iniciar actualización automática
     */
    startAutoUpdate() {
        this.stopAutoUpdate(); // Detener cualquier intervalo existente
        
        this.intervalId = setInterval(() => {
            this.loadStatistics();
        }, this.updateInterval);

        console.log(`🔄 Actualización automática iniciada cada ${this.updateInterval/1000} segundos`);
    }

    /**
     * Detener actualización automática
     */
    stopAutoUpdate() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('⏹️ Actualización automática detenida');
        }
    }

    /**
     * Redirigir al login
     */
    redirectToLogin() {
        auth.logout(); // Usar AuthManager para logout limpio
        window.location.href = 'login.html';
    }

    /**
     * Destruir el módulo
     */
    destroy() {
        this.stopAutoUpdate();
        console.log('🗑️ Módulo de estadísticas destruido');
    }
}

// Instancia global
window.mainPageStats = new MainPageStats();

/**
 * Función global helper para actualizar estadísticas desde cualquier módulo
 * Puede ser llamada desde facturas, pagos, reconexión, etc.
 */
window.refreshDashboardStats = function() {
    try {
        // Verificar si estamos en la página principal
        if (window.mainPageStats && typeof window.mainPageStats.loadStatistics === 'function') {
            window.mainPageStats.loadStatistics(true);
            console.log('📊 Estadísticas actualizadas desde módulo externo');
        } else {
            // Si no estamos en mainPage, intentar actualizar vía postMessage
            // para cuando se regrese a la página principal
            if (window.opener) {
                window.opener.postMessage({ action: 'refreshStats' }, '*');
            }
            console.log('📊 Solicitud de actualización de estadísticas enviada');
        }
    } catch (error) {
        console.warn('No se pudieron actualizar las estadísticas:', error);
    }
};

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mainPageStats.init();
    });
} else {
    window.mainPageStats.init();
}

// Escuchar mensajes de otros módulos para actualizar estadísticas
window.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'refreshStats') {
        if (window.mainPageStats) {
            window.mainPageStats.loadStatistics(true);
        }
    }
});

// Limpiar al salir de la página
window.addEventListener('beforeunload', () => {
    if (window.mainPageStats) {
        window.mainPageStats.destroy();
    }
});
