// frontend/js/dashboardStats.js
/**
 * Módulo para manejar estadísticas y reportes en tiempo real del dashboard
 */

class DashboardStats {
    constructor() {
        this.baseURL = '/api';
        this.updateInterval = 60000; // 1 minuto para dashboard
        this.intervalId = null;
        this.isLoading = false;
        this.chartsInstances = {};
        this.currentTab = 'clientes';
        this.currentFilters = {};
    }

    /**
     * Inicializar el módulo de dashboard
     */
    init() {
        console.log('🔄 Inicializando dashboard avanzado...');
        this.setupEventListeners();
        this.loadAllData();
        this.startAutoUpdate();
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Botones de filtros
        const filterBtn = document.querySelector('[onclick="applyFilters()"]');
        if (filterBtn) {
            filterBtn.removeAttribute('onclick');
            filterBtn.addEventListener('click', () => this.applyFilters());
        }

        const resetBtn = document.querySelector('[onclick="resetFilters()"]');
        if (resetBtn) {
            resetBtn.removeAttribute('onclick');
            resetBtn.addEventListener('click', () => this.resetFilters());
        }

        // Botones de exportación
        document.querySelectorAll('[onclick^="exportData"]').forEach(btn => {
            const tipo = btn.getAttribute('onclick').match(/exportData\('(.+?)'\)/)[1];
            btn.removeAttribute('onclick');
            btn.addEventListener('click', () => this.exportData(tipo));
        });

        // Tabs de datos
        document.querySelectorAll('[onclick^="showTab"]').forEach(btn => {
            const tab = btn.getAttribute('onclick').match(/showTab\('(.+?)'\)/)[1];
            btn.removeAttribute('onclick');
            btn.addEventListener('click', () => this.showTab(tab));
        });

        // Búsqueda en tiempo real
        const searchInput = document.getElementById('dataSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterTableData(e.target.value));
        }

        // Actualizar cuando la página regresa al foco
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.loadAllData();
            }
        });
    }

    /**
     * Cargar todos los datos del dashboard
     */
    async loadAllData() {
        if (this.isLoading) return;

        try {
            this.isLoading = true;
            this.showLoadingState();

            const token = await auth.getToken();
            if (!token) {
                console.warn('No hay token de autenticación');
                this.redirectToLogin();
                return;
            }

            // Cargar estadísticas avanzadas
            await this.loadAdvancedStats();
            
            // Cargar datos de reportes
            await this.loadReportsData();
            
            // Cargar datos de tabla actual
            await this.loadCurrentTabData();

            this.showSuccessState();
            console.log('✅ Dashboard cargado correctamente');

        } catch (error) {
            console.error('❌ Error al cargar dashboard:', error);
            this.showErrorState(error.message);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Cargar estadísticas avanzadas
     */
    async loadAdvancedStats() {
        const response = await this.authenticatedFetch(`${this.baseURL}/facturas/dashboard/avanzadas`);
        const data = await response.json();

        if (data.success) {
            this.updateStatsDisplay(data.data);
            this.updateCharts(data.data);
        } else {
            throw new Error(data.message || 'Error al cargar estadísticas');
        }
    }

    /**
     * Cargar datos de reportes
     */
    async loadReportsData() {
        const [topConsumidores, clientesMorosos, pagosRecientes] = await Promise.all([
            this.loadTopConsumidores(),
            this.loadClientesMorosos(),
            this.loadPagosRecientes()
        ]);

        this.updateReportsDisplay({
            topConsumidores,
            clientesMorosos,
            pagosRecientes
        });
    }

    /**
     * Actualizar visualización de estadísticas
     */
    updateStatsDisplay(stats) {
        // Estadísticas principales
        this.updateStatCard('totalClientes', stats.totalClientes);
        this.updateStatCard('ingresosMes', this.formatCurrency(stats.ingresosMes));
        this.updateStatCard('facturasPendientes', stats.facturasPendientes || stats.pagosPendientes);
        this.updateStatCard('facturasVencidas', stats.facturasVencidas);

        // Cambios y tendencias
        if (stats.tendenciaIngresos) {
            const cambio = stats.tendenciaIngresos.porcentajeCambio;
            this.updateStatChange('ingresosChange', `${cambio > 0 ? '+' : ''}${cambio}% vs mes anterior`);
        }

        // Actualizar contadores de estado de pagos
        if (stats.facturasPorEstado) {
            stats.facturasPorEstado.forEach(estado => {
                const elementId = `facturas${estado._id.charAt(0).toUpperCase() + estado._id.slice(1)}`;
                this.updateStatCard(elementId, estado.cantidad);
            });
        }
    }

    /**
     * Actualizar gráficos
     */
    updateCharts(stats) {
        // Gráfico de ingresos mensuales
        if (stats.ingresosPorMes) {
            this.updateIngresosChart(stats.ingresosPorMes);
        }

        // Gráfico de consumo por proyecto
        if (stats.consumoPorProyecto) {
            this.updateProyectosChart(stats.consumoPorProyecto);
        }
    }

    /**
     * Actualizar gráfico de ingresos
     */
    updateIngresosChart(datosIngresos) {
        const canvas = document.getElementById('ingresosChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Destruir gráfico existente
        if (this.chartsInstances.ingresos) {
            this.chartsInstances.ingresos.destroy();
        }

        const labels = datosIngresos.map(item => 
            `${this.getMonthName(item._id.mes)} ${item._id.año}`
        );
        const data = datosIngresos.map(item => item.totalIngresos);

        this.chartsInstances.ingresos = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ingresos (Q)',
                    data: data,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Tendencia de Ingresos Mensuales'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'Q' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Actualizar gráfico de proyectos
     */
    updateProyectosChart(datosProyectos) {
        const canvas = document.getElementById('proyectosChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Destruir gráfico existente
        if (this.chartsInstances.proyectos) {
            this.chartsInstances.proyectos.destroy();
        }

        const labels = datosProyectos.map(item => this.formatProjectName(item._id));
        const data = datosProyectos.map(item => item.totalConsumo);

        this.chartsInstances.proyectos = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#FF9F40',
                        '#FF6384'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Distribución de Consumo por Proyecto'
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    /**
     * Cargar top consumidores
     */
    async loadTopConsumidores() {
        // Esta información viene en las estadísticas avanzadas
        return [];
    }

    /**
     * Cargar clientes morosos
     */
    async loadClientesMorosos() {
        // Esta información viene en las estadísticas avanzadas
        return [];
    }

    /**
     * Cargar pagos recientes
     */
    async loadPagosRecientes() {
        // Esta información viene en las estadísticas avanzadas
        return [];
    }

    /**
     * Actualizar reportes rápidos
     */
    updateReportsDisplay(reportes) {
        // Esta función se implementará cuando tengamos los datos específicos
        // Por ahora mostrar mensaje de carga completada
        document.querySelectorAll('.loading').forEach(el => {
            el.textContent = 'Datos cargados desde el servidor';
        });
    }

    /**
     * Cargar datos de la pestaña actual
     */
    async loadCurrentTabData() {
        try {
            const response = await this.authenticatedFetch(
                `${this.baseURL}/facturas/reportes/datos?tipo=${this.currentTab}${this.buildFilterQuery()}`
            );
            const data = await response.json();

            if (data.success) {
                this.updateTableData(this.currentTab, data.data);
            }
        } catch (error) {
            console.error('Error al cargar datos de tabla:', error);
        }
    }

    /**
     * Actualizar datos de tabla
     */
    updateTableData(tab, data) {
        const tbody = document.getElementById(`${tab}TableBody`);
        if (!tbody) return;

        tbody.innerHTML = '';

        switch (tab) {
            case 'clientes':
                this.renderClientesTable(tbody, data);
                break;
            case 'facturas':
                this.renderFacturasTable(tbody, data);
                break;
            case 'pagos':
                this.renderPagosTable(tbody, data);
                break;
        }
    }

    /**
     * Renderizar tabla de clientes
     */
    renderClientesTable(tbody, clientes) {
        clientes.forEach(cliente => {
            const row = document.createElement('tr');
            const stats = cliente.estadisticas || {};
            
            row.innerHTML = `
                <td>${cliente.nombres} ${cliente.apellidos}</td>
                <td>${cliente.dpi}</td>
                <td>${cliente.contador}</td>
                <td>${this.formatProjectName(cliente.proyecto)}</td>
                <td>${stats.totalFacturas || 0}</td>
                <td>${this.formatCurrency(stats.totalFacturado || 0)}</td>
                <td>${this.formatCurrency(stats.totalPagado || 0)}</td>
                <td class="${stats.pendiente > 0 ? 'text-danger' : ''}">
                    ${this.formatCurrency(stats.pendiente || 0)}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    /**
     * Renderizar tabla de facturas
     */
    renderFacturasTable(tbody, facturas) {
        facturas.forEach(factura => {
            const row = document.createElement('tr');
            const cliente = factura.clienteId;
            const fechaEmision = new Date(factura.fechaEmision);
            const diasVencimiento = factura.estado === 'pendiente' 
                ? Math.floor((new Date() - new Date(factura.fechaVencimiento)) / (1000 * 60 * 60 * 24))
                : 0;
            
            row.innerHTML = `
                <td>${factura.numeroFactura}</td>
                <td>${cliente.nombres} ${cliente.apellidos}</td>
                <td>${fechaEmision.toLocaleDateString('es-GT')}</td>
                <td>${factura.consumoLitros} L</td>
                <td>${this.formatCurrency(factura.montoTotal)}</td>
                <td>
                    <span class="badge badge-${this.getEstadoBadgeClass(factura.estado)}">
                        ${factura.estado.toUpperCase()}
                    </span>
                </td>
                <td class="${diasVencimiento > 0 ? 'text-danger' : ''}">
                    ${diasVencimiento > 0 ? `+${diasVencimiento}` : '-'}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    /**
     * Renderizar tabla de pagos
     */
    renderPagosTable(tbody, pagos) {
        pagos.forEach(pago => {
            const row = document.createElement('tr');
            const cliente = pago.clienteId;
            const factura = pago.facturaId;
            const fechaPago = new Date(pago.fechaPago);
            
            row.innerHTML = `
                <td>${fechaPago.toLocaleDateString('es-GT')}</td>
                <td>${cliente.nombres} ${cliente.apellidos}</td>
                <td>${factura?.numeroFactura || 'N/A'}</td>
                <td>${this.formatCurrency(pago.monto)}</td>
                <td>${pago.metodoPago}</td>
                <td>${pago.referenciaPago || '-'}</td>
            `;
            tbody.appendChild(row);
        });
    }

    /**
     * Mostrar pestaña específica
     */
    showTab(tabName) {
        this.currentTab = tabName;

        // Actualizar botones activos
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[onclick*="${tabName}"]`)?.classList.add('active');

        // Mostrar/ocultar tabs
        document.querySelectorAll('.data-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`)?.classList.add('active');

        // Cargar datos de la nueva pestaña
        this.loadCurrentTabData();
    }

    /**
     * Aplicar filtros
     */
    async applyFilters() {
        const dateFrom = document.getElementById('dateFrom')?.value;
        const dateTo = document.getElementById('dateTo')?.value;
        const project = document.getElementById('projectFilter')?.value;

        this.currentFilters = {
            fechaInicio: dateFrom,
            fechaFin: dateTo,
            proyecto: project
        };

        await this.loadAllData();
        this.showTemporaryMessage('Filtros aplicados correctamente', 'success');
    }

    /**
     * Resetear filtros
     */
    async resetFilters() {
        document.getElementById('dateFrom').value = '';
        document.getElementById('dateTo').value = '';
        document.getElementById('projectFilter').value = '';
        
        this.currentFilters = {};
        
        await this.loadAllData();
        this.showTemporaryMessage('Filtros restablecidos', 'info');
    }

    /**
     * Exportar datos
     */
    async exportData(tipo) {
        try {
            this.showTemporaryMessage(`Exportando datos de ${tipo}...`, 'info');
            
            const response = await this.authenticatedFetch(
                `${this.baseURL}/facturas/reportes/datos?tipo=${tipo}${this.buildFilterQuery()}`
            );
            const data = await response.json();

            if (data.success) {
                this.downloadAsCSV(data.data, tipo);
                this.showTemporaryMessage(`Datos de ${tipo} exportados correctamente`, 'success');
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error al exportar:', error);
            this.showTemporaryMessage(`Error al exportar ${tipo}: ${error.message}`, 'error');
        }
    }

    /**
     * Descargar datos como CSV
     */
    downloadAsCSV(data, tipo) {
        let csvContent = '';
        let filename = `reporte_${tipo}_${new Date().toISOString().split('T')[0]}.csv`;

        // Generar CSV según el tipo
        switch (tipo) {
            case 'clientes':
                csvContent = this.generateClientesCSV(data);
                break;
            case 'facturas':
                csvContent = this.generateFacturasCSV(data);
                break;
            case 'pagos':
                csvContent = this.generatePagosCSV(data);
                break;
            case 'completo':
                csvContent = this.generateCompleteCSV(data);
                filename = `reporte_completo_${new Date().toISOString().split('T')[0]}.csv`;
                break;
        }

        // Crear y descargar archivo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }

    /**
     * Generar CSV de clientes
     */
    generateClientesCSV(clientes) {
        const headers = ['Nombre', 'DPI', 'Contador', 'Proyecto', 'Total Facturas', 'Total Facturado', 'Total Pagado', 'Pendiente'];
        let csv = headers.join(',') + '\n';

        clientes.forEach(cliente => {
            const stats = cliente.estadisticas || {};
            const row = [
                `"${cliente.nombres} ${cliente.apellidos}"`,
                cliente.dpi,
                cliente.contador,
                this.formatProjectName(cliente.proyecto),
                stats.totalFacturas || 0,
                stats.totalFacturado || 0,
                stats.totalPagado || 0,
                stats.pendiente || 0
            ];
            csv += row.join(',') + '\n';
        });

        return csv;
    }

    /**
     * Generar CSV de facturas
     */
    generateFacturasCSV(facturas) {
        const headers = ['Número Factura', 'Cliente', 'Fecha', 'Consumo (L)', 'Monto', 'Estado'];
        let csv = headers.join(',') + '\n';

        facturas.forEach(factura => {
            const cliente = factura.clienteId;
            const row = [
                factura.numeroFactura,
                `"${cliente.nombres} ${cliente.apellidos}"`,
                new Date(factura.fechaEmision).toLocaleDateString('es-GT'),
                factura.consumoLitros,
                factura.montoTotal,
                factura.estado
            ];
            csv += row.join(',') + '\n';
        });

        return csv;
    }

    /**
     * Generar CSV de pagos
     */
    generatePagosCSV(pagos) {
        const headers = ['Fecha', 'Cliente', 'Factura', 'Monto', 'Método', 'Referencia'];
        let csv = headers.join(',') + '\n';

        pagos.forEach(pago => {
            const cliente = pago.clienteId;
            const factura = pago.facturaId;
            const row = [
                new Date(pago.fechaPago).toLocaleDateString('es-GT'),
                `"${cliente.nombres} ${cliente.apellidos}"`,
                factura?.numeroFactura || 'N/A',
                pago.monto,
                pago.metodoPago,
                pago.referenciaPago || ''
            ];
            csv += row.join(',') + '\n';
        });

        return csv;
    }

    /**
     * Generar CSV completo
     */
    generateCompleteCSV(data) {
        let csv = '=== REPORTE COMPLETO DEL SISTEMA ===\n\n';
        
        csv += '=== RESUMEN ===\n';
        csv += `Total Clientes,${data.resumen.totalClientes}\n`;
        csv += `Total Facturas,${data.resumen.totalFacturas}\n`;
        csv += `Total Pagos,${data.resumen.totalPagos}\n`;
        csv += `Monto Total Facturado,${data.resumen.montoTotalFacturado}\n`;
        csv += `Monto Total Pagado,${data.resumen.montoTotalPagado}\n\n`;

        csv += '=== CLIENTES ===\n';
        csv += this.generateClientesCSV(data.clientes);
        
        csv += '\n=== FACTURAS ===\n';
        csv += this.generateFacturasCSV(data.facturas);
        
        csv += '\n=== PAGOS ===\n';
        csv += this.generatePagosCSV(data.pagos);

        return csv;
    }

    /**
     * Filtrar datos de tabla
     */
    filterTableData(searchTerm) {
        const activeTab = document.querySelector('.data-tab.active');
        if (!activeTab) return;

        const rows = activeTab.querySelectorAll('tbody tr');
        const term = searchTerm.toLowerCase();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
        });
    }

    /**
     * Construir query string para filtros
     */
    buildFilterQuery() {
        const params = new URLSearchParams();
        
        if (this.currentFilters.fechaInicio) {
            params.append('fechaInicio', this.currentFilters.fechaInicio);
        }
        if (this.currentFilters.fechaFin) {
            params.append('fechaFin', this.currentFilters.fechaFin);
        }
        if (this.currentFilters.proyecto) {
            params.append('proyecto', this.currentFilters.proyecto);
        }

        return params.toString() ? '&' + params.toString() : '';
    }

    /**
     * Realizar request autenticado
     */
    async authenticatedFetch(url, options = {}) {
        const token = await auth.getToken();
        if (!token) {
            throw new Error('No hay token de autenticación');
        }

        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (response.status === 401) {
            this.redirectToLogin();
            throw new Error('Sesión expirada');
        }

        return response;
    }

    /**
     * Funciones auxiliares
     */
    updateStatCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    updateStatChange(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }

    formatCurrency(amount) {
        return `Q ${parseFloat(amount || 0).toLocaleString('es-GT', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    }

    formatProjectName(proyecto) {
        const proyectos = {
            'san-miguel': 'San Miguel',
            'santa-clara-1': 'Santa Clara Fase 1',
            'santa-clara-2': 'Santa Clara Fase 2',
            'cabanas-1': 'Cabañas Fase 1',
            'cabanas-2': 'Cabañas Fase 2'
        };
        return proyectos[proyecto] || proyecto;
    }

    getMonthName(monthNum) {
        const months = [
            'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
            'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
        ];
        return months[monthNum - 1] || 'N/A';
    }

    getEstadoBadgeClass(estado) {
        const classes = {
            'pagada': 'success',
            'pendiente': 'warning',
            'vencida': 'danger',
            'anulada': 'secondary'
        };
        return classes[estado] || 'secondary';
    }

    showLoadingState() {
        // Implementar estado de carga visual
    }

    showSuccessState() {
        // Implementar estado de éxito visual
    }

    showErrorState(message) {
        this.showTemporaryMessage(`Error: ${message}`, 'error');
    }

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
            ${type === 'error' ? 'background: #ff6b6b; color: white;' : 
              type === 'success' ? 'background: #4ecdc4; color: white;' : 
              'background: #45b7d1; color: white;'}
        `;

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    async redirectToLogin() {
        await auth.logout();
        window.location.href = 'login.html';
    }

    startAutoUpdate() {
        this.stopAutoUpdate();
        
        this.intervalId = setInterval(() => {
            this.loadAllData();
        }, this.updateInterval);

        console.log(`🔄 Actualización automática del dashboard iniciada cada ${this.updateInterval/1000} segundos`);
    }

    stopAutoUpdate() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    destroy() {
        this.stopAutoUpdate();
        
        // Destruir gráficos
        Object.values(this.chartsInstances).forEach(chart => {
            if (chart) chart.destroy();
        });
        
        console.log('🗑️ Dashboard destruido');
    }
}

// Reemplazar funciones globales por métodos de la clase
let dashboardStats;

// Funciones globales para compatibilidad
function applyFilters() {
    if (dashboardStats) dashboardStats.applyFilters();
}

function resetFilters() {
    if (dashboardStats) dashboardStats.resetFilters();
}

function exportData(tipo) {
    if (dashboardStats) dashboardStats.exportData(tipo);
}

function showTab(tab) {
    if (dashboardStats) dashboardStats.showTab(tab);
}

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        dashboardStats = new DashboardStats();
        dashboardStats.init();
    });
} else {
    dashboardStats = new DashboardStats();
    dashboardStats.init();
}

// Limpiar al salir de la página
window.addEventListener('beforeunload', () => {
    if (dashboardStats) {
        dashboardStats.destroy();
    }
});
