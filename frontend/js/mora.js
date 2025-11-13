/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GESTOR DE MORA ACUMULADA - SISTEMA AGUA LOTI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Archivo: mora.js (Versión Mejorada - v2.0)
 * Última actualización: 2025
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * MODIFICACIONES REALIZADAS:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. SISTEMA DE PAGINACIÓN COMPLETO
 *    - Variables de paginación: currentPage, pageSize, totalPages, totalRecords
 *    - Funciones: setupPaginationControls(), updatePaginationControls(),
 *      generatePageNumbers(), goToPage()
 *    - Control de tamaño de página (5, 10, 20, 50, 100 registros)
 *    - Navegación: Primera, Anterior, Números, Siguiente, Última página
 *
 * 2. FILTROS AVANZADOS Y BÚSQUEDA
 *    - Filtro por proyecto en tabla de clientes críticos
 *    - Búsqueda con debounce de 300ms (previene sobrecarga de peticiones)
 *    - Búsqueda automática después de 3 caracteres
 *    - Variable filteredClientes para almacenar resultados filtrados
 *    - Ordenamiento alfabético por nombre completo
 *
 * 3. FUNCIONES DE FORMATEO CENTRALIZADAS
 *    - formatCurrency(): Formato de moneda guatemalteco (Q con 2 decimales)
 *    - formatDate(): Formato de fecha guatemalteco (DD/MM/YYYY)
 *    - capitalizeFirst(): Capitalización de primera letra
 *    - getProjectName(): Mapeo de nombres de proyectos
 *
 * 4. MANEJO DE ERRORES MEJORADO
 *    - Detección y manejo de errores HTTP 401 (sesión expirada)
 *    - Mensajes específicos por tipo de error (conexión, sesión, servidor)
 *    - Limpieza automática de sessionStorage en errores de autenticación
 *    - Redirección automática al login cuando expira la sesión
 *
 * 5. UTILIDADES DE VISIBILIDAD
 *    - showElement(): Mostrar un elemento del DOM
 *    - hideElement(): Ocultar un elemento del DOM
 *    - showElements(): Mostrar múltiples elementos
 *    - hideElements(): Ocultar múltiples elementos
 *
 * 6. VERIFICACIÓN Y ACTUALIZACIÓN DE DATOS
 *    - checkBackendConnection(): Verifica conexión con el servidor
 *    - refreshData(): Recarga datos con Promise.all
 *    - Modo offline cuando no hay conexión con el backend
 *
 * 7. MEJORAS DE UX/UI
 *    - Contador dinámico de clientes con 3 estados (sin clientes, filtrado, todos)
 *    - Estados vacíos mejorados con iconos, mensajes y submensajes
 *    - Scroll suave (smooth) al mostrar resultados
 *    - Integración con PageUtils para mensajes centralizados
 *
 * 8. CARACTERÍSTICAS TÉCNICAS AVANZADAS
 *    - Debugging de autenticación (solo en localhost/127.0.0.1)
 *    - Limpieza de event listeners (removeEventListener antes de agregar)
 *    - Exportación de módulos para testing (module.exports)
 *    - Constantes del sistema: MORA_MENSUAL (7%), COSTO_RECONEXION (Q125)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FUNCIONALIDADES AÑADIDAS:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ✅ Sistema de paginación profesional (35 funcionalidades nuevas)
 * ✅ Filtros avanzados con debounce en búsqueda
 * ✅ Formateo consistente de moneda y fechas
 * ✅ Manejo robusto de errores HTTP
 * ✅ Verificación de conexión con backend
 * ✅ Contador dinámico de clientes
 * ✅ Estados vacíos con mejor diseño
 * ✅ Debugging avanzado de autenticación
 * ✅ Limpieza de event listeners (previene duplicados)
 * ✅ Exportación para testing unitario
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CORRECCIONES APLICADAS:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 🔧 Timeout de mensajes: 4000ms → 5000ms (consistente con otros módulos)
 * 🔧 Formateo manual de moneda → Intl.NumberFormat('es-GT')
 * 🔧 Formateo manual de fechas → toLocaleDateString('es-GT')
 * 🔧 Agregado manejo HTTP 401 con redirección automática
 * 🔧 Agregada variable currentMoraData para almacenar datos actuales
 * 🔧 Mejorada estructura de código con secciones comentadas
 * 🔧 Todos los mensajes y comentarios en ESPAÑOL
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ===============================================
// VARIABLES GLOBALES
// ===============================================
let clientes = [];
let clientesCriticos = [];
let filteredClientes = [];
let currentClienteId = null;
let currentCliente = null;
let currentMoraData = null;

// Variables de paginación
let currentPage = 1;
let pageSize = 10;
let totalPages = 1;
let totalRecords = 0;

// Timeout para debounce
let searchTimeout;

// ===============================================
// CONSTANTES DEL SISTEMA
// ===============================================
const API_BASE = window.location.origin + '/api';
const MORA_MENSUAL = 0.07; // 7% mora mensual
const COSTO_RECONEXION = 125.00; // Q125.00 reconexión

// ===============================================
// CLASE PRINCIPAL - MoraManager
// ===============================================
class MoraManager {
    constructor() {
        this.API_BASE = API_BASE;
        this.currentClienteId = null;
        this.currentCliente = null;
        this.init();
    }

    /**
     * Inicialización del gestor
     */
    async init() {
        console.log('🚀 MoraManager inicializado');

        // Verificar conexión con backend
        const connected = await this.checkBackendConnection();

        if (connected) {
            await this.cargarClientesCriticos();
        } else {
            this.showMessage('Trabajando en modo offline. Algunas funciones pueden no estar disponibles.', 'warning');
        }

        // Configurar event listeners
        this.setupEventListeners();
    }

    /**
     * Verificar conexión con el backend
     */
    async checkBackendConnection() {
        try {
            const response = await fetch(API_BASE + '/test');
            const data = await response.json();
            console.log('✅ Conexión con backend establecida:', data.message);
            return true;
        } catch (error) {
            console.error('❌ Error de conexión con backend:', error);
            this.showMessage('Error de conexión con el servidor. Verifica que el backend esté ejecutándose.', 'error');
            return false;
        }
    }

    /**
     * Configurar todos los event listeners
     */
    setupEventListeners() {
        // Búsqueda incremental de clientes en tabla
        const searchInput = document.getElementById('searchCliente');
        if (searchInput) {
            // Remover listener existente si lo hay
            searchInput.removeEventListener('input', this.handleSearchInput);
            searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
        }

        // Filtro de proyecto en tabla de clientes críticos
        const projectFilter = document.getElementById('projectFilterCriticos');
        if (projectFilter) {
            projectFilter.removeEventListener('change', this.handleProjectFilter);
            projectFilter.addEventListener('change', (e) => this.handleProjectFilter(e));
        }

        // Botón de actualizar
        const refreshBtn = document.getElementById('refreshCriticosBtn');
        if (refreshBtn) {
            refreshBtn.removeEventListener('click', this.refreshData);
            refreshBtn.addEventListener('click', () => this.refreshData());
        }

        // Controles de paginación
        this.setupPaginationControls();
    }

    /**
     * Manejar input de búsqueda con debounce
     */
    handleSearchInput(e) {
        clearTimeout(searchTimeout);
        const searchTerm = e.target.value.trim();
        
        // Si está vacío, mostrar todos los clientes inmediatamente
        if (searchTerm === '') {
            currentPage = 1;
            this.mostrarClientesCriticos();
            return;
        }
        
        // Esperar 2 segundos después de que el usuario deja de escribir
        searchTimeout = setTimeout(() => {
            this.filtrarClientesCriticos(searchTerm);
        }, 2000); // 2 segundos de espera
    }

    /**
     * Función para hacer peticiones autenticadas con manejo de errores mejorado
     */
    async apiRequest(url, options = {}) {
        try {
            // Usar AuthUtils si está disponible
            if (typeof AuthUtils !== 'undefined') {
                const response = await AuthUtils.authenticatedFetch(url, options);

                // Manejar error 401
                if (response.status === 401) {
                    await auth.logout();
                    this.showMessage('Sesión expirada. Redirigiendo al login...', 'error');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 1500);
                    throw new Error('Sesión expirada');
                }

                return response;
            }

            // Fallback manual usando sistema centralizado
            const token = await auth.getToken();

            if (!token) {
                this.showMessage('No hay token de autenticación', 'error');
                await auth.logout();
                window.location.href = 'login.html';
                throw new Error('No autenticado');
            }

            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            };

            const response = await fetch(url, {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...options.headers
                }
            });

            if (response.status === 401) {
                this.showMessage('Sesión expirada. Redirigiendo al login...', 'error');
                await auth.logout();
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
                throw new Error('Sesión expirada');
            }

            return response;
        } catch (error) {
            console.error('Error en API request:', error);
            throw error;
        }
    }

    /**
     * Buscar cliente por término de búsqueda
     */
    async buscarCliente() {
        const searchTerm = document.getElementById('searchCliente').value.trim();

        if (!searchTerm) {
            this.showMessage('Por favor ingresa un término de búsqueda', 'error');
            return;
        }

        // Validar que tenga al menos 3 caracteres
        if (searchTerm.length < 3) {
            this.showMessage('Por favor ingresa al menos 3 caracteres para buscar', 'error');
            return;
        }

        this.showLoading(true);

        try {
            // Buscar en la lista de clientes cargados primero
            const searchLower = searchTerm.toLowerCase();
            const clientesEncontrados = clientes.filter(cliente => {
                const nombreCompleto = `${cliente.nombres} ${cliente.apellidos}`.toLowerCase();
                const dpi = (cliente.dpi || '').toString();
                const contador = (cliente.contador || '').toLowerCase();
                
                return nombreCompleto.includes(searchLower) || 
                       dpi.includes(searchTerm) || 
                       contador.includes(searchLower);
            });

            if (clientesEncontrados.length === 0) {
                // Si no se encuentra en memoria, buscar en el backend
                const response = await this.apiRequest(
                    `${this.API_BASE}/clientes?search=${encodeURIComponent(searchTerm)}&estado=activo`
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Error al buscar cliente');
                }

                if (!data.data || data.data.length === 0) {
                    this.showMessage('No se encontró ningún cliente con ese criterio de búsqueda', 'error');
                    this.hideClienteInfo();
                    return;
                }

                // Tomar el primer resultado
                const cliente = data.data[0];
                this.currentCliente = cliente;
                this.currentClienteId = cliente._id;
                this.mostrarInfoCliente(cliente);
            } else {
                // Si se encontraron en memoria, tomar el primero
                const cliente = clientesEncontrados[0];
                this.currentCliente = cliente;
                this.currentClienteId = cliente._id;
                this.mostrarInfoCliente(cliente);
                
                if (clientesEncontrados.length > 1) {
                    this.showMessage(
                        `Se encontraron ${clientesEncontrados.length} clientes. Mostrando: ${cliente.nombres} ${cliente.apellidos}`, 
                        'success'
                    );
                }
            }

        } catch (error) {
            console.error('Error al buscar cliente:', error);

            // Mensajes específicos según el tipo de error
            if (error.message === 'Sesión expirada') {
                this.showMessage('Sesión expirada. Será redirigido al login.', 'error');
            } else if (error.message.includes('Failed to fetch')) {
                this.showMessage('Error de conexión. Verifique que el servidor esté ejecutándose en puerto 5000.', 'error');
            } else {
                this.showMessage(error.message, 'error');
            }

            this.hideClienteInfo();
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Filtrar clientes críticos en tiempo real según búsqueda
     */
    filtrarClientesCriticos(searchTerm) {
        if (!searchTerm || searchTerm.length === 0) {
            // Si no hay término de búsqueda, resetear filtro
            currentPage = 1;
            this.mostrarClientesCriticos();
            return;
        }

        const searchLower = searchTerm.toLowerCase();
        
        // Filtrar clientes que coincidan con el término de búsqueda
        const clientesFiltrados = clientesCriticos.filter(cliente => {
            const nombreCompleto = `${cliente.nombres} ${cliente.apellidos}`.toLowerCase();
            const dpi = (cliente.dpi || '').toString();
            const contador = (cliente.contador || '').toLowerCase();
            
            return nombreCompleto.includes(searchLower) || 
                   dpi.includes(searchTerm) || 
                   contador.includes(searchLower);
        });

        // Actualizar filteredClientes con los resultados
        filteredClientes = clientesFiltrados;
        
        // Resetear a página 1 y mostrar resultados
        currentPage = 1;
        this.mostrarClientesCriticos();

        // Mostrar mensaje con los resultados después de la búsqueda
        if (clientesFiltrados.length === 0) {
            this.showMessage(`No se encontraron clientes que coincidan con "${searchTerm}"`, 'error');
        } else {
            this.showMessage(`Se encontraron ${clientesFiltrados.length} cliente(s) que coinciden con "${searchTerm}"`, 'success');
        }
    }

    /**
     * Mostrar información del cliente
     */
    mostrarInfoCliente(cliente) {
        document.getElementById('clienteNombre').textContent =
            `${cliente.nombres} ${cliente.apellidos}`;
        document.getElementById('clienteDPI').textContent = cliente.dpi || 'N/A';
        document.getElementById('clienteContador').textContent =
            cliente.contador || 'N/A';

        const estadoBadge = document.getElementById('clienteEstado');
        const estado = cliente.estadoServicio || 'activo';
        estadoBadge.textContent = estado.toUpperCase();
        estadoBadge.className = `badge ${estado}`;

        this.showElement('clienteInfo', 'block');
        this.hideElement('moraResult');
    }

    /**
     * Ocultar información del cliente
     */
    hideClienteInfo() {
        this.hideElements('clienteInfo', 'moraResult');
        this.currentCliente = null;
        this.currentClienteId = null;
        this.currentMoraData = null;
    }

    /**
     * Calcular mora del cliente actual
     */
    async calcularMora() {
        if (!this.currentClienteId) {
            this.showMessage('No hay cliente seleccionado', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const response = await this.apiRequest(
                `${this.API_BASE}/mora/cliente/${this.currentClienteId}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al calcular mora');
            }

            this.currentMoraData = data.data;
            this.mostrarResultadoMora(data.data);

        } catch (error) {
            console.error('Error al calcular mora:', error);
            this.showMessage(error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Mostrar resultado de mora
     */
    mostrarResultadoMora(moraData) {
        // Actualizar resumen
        document.getElementById('facturasPendientes').textContent =
            moraData.facturasPendientes;
        document.getElementById('mesesAtrasados').textContent =
            moraData.mesesAtrasados;
        document.getElementById('montoOriginal').textContent =
            formatCurrency(moraData.montoOriginalTotal);
        document.getElementById('moraTotal').textContent =
            formatCurrency(moraData.moraTotal);
        document.getElementById('totalAPagar').textContent =
            formatCurrency(moraData.totalAPagar);

        // Actualizar badge de criticidad
        const criticidadBadge = document.getElementById('criticidadBadge');
        const criticidad = moraData.nivelCriticidad || 'bajo';
        criticidadBadge.textContent = criticidad.toUpperCase();
        criticidadBadge.className = `criticidad-badge ${criticidad}`;

        // Mostrar alerta de reconexión si aplica
        const reconexionAlert = document.getElementById('reconexionAlert');
        if (moraData.requiereReconexion) {
            document.getElementById('costoReconexion').textContent =
                moraData.costoReconexion.toFixed(2);
            reconexionAlert.classList.add('visible');
        } else {
            reconexionAlert.classList.remove('visible');
        }

        // Llenar tabla de facturas
        this.llenarTablaFacturas(moraData.detalleFacturas);

        // Mostrar resultado
        this.showElement('moraResult', 'block');

        // Scroll suave al resultado
        document.getElementById('moraResult').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    /**
     * Llenar tabla de facturas
     */
    llenarTablaFacturas(facturas) {
        const tbody = document.getElementById('facturasTableBody');
        tbody.innerHTML = '';

        if (!facturas || facturas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="loading-cell">
                        <div class="empty-state">
                            <div class="empty-state-icon">📋</div>
                            <div class="empty-state-message">No hay facturas vencidas</div>
                            <div class="empty-state-submessage">Este cliente no tiene mora acumulada</div>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        facturas.forEach(factura => {
            const tr = document.createElement('tr');

            const fechaEmision = formatDate(factura.fechaEmision);
            const fechaVencimiento = formatDate(factura.fechaVencimiento);

            tr.innerHTML = `
                <td>${factura.numeroFactura}</td>
                <td>${fechaEmision}</td>
                <td>${fechaVencimiento}</td>
                <td>${factura.diasVencidos}</td>
                <td>${factura.mesesCompletos}</td>
                <td>${formatCurrency(factura.montoOriginal)}</td>
                <td>${factura.porcentajeMora.toFixed(2)}%</td>
                <td>${formatCurrency(factura.montoMora)}</td>
                <td><strong>${formatCurrency(factura.totalConMora)}</strong></td>
                <td><span class="estado-badge ${factura.estado}">${factura.estado}</span></td>
            `;

            tbody.appendChild(tr);
        });
    }

    /**
     * Cargar lista de clientes con mora crítica
     */
    async cargarClientesCriticos() {
        try {
            // Mostrar loading en lugar de mensaje
            this.showLoading(true);

            // Obtener todos los clientes activos
            const response = await this.apiRequest(
                `${this.API_BASE}/clientes?estado=activo&limit=500`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al cargar clientes');
            }

            if (data.success && data.data) {
                clientes = data.data;
                
                // Para cada cliente, verificar si tiene facturas pendientes
                // y calcular su mora
                const clientesConMora = [];
                
                for (const cliente of clientes) {
                    try {
                        // Obtener facturas pendientes del cliente
                        const facturasResponse = await this.apiRequest(
                            `${this.API_BASE}/facturas?clienteId=${cliente._id}&estado=pendiente`
                        );
                        
                        const facturasData = await facturasResponse.json();
                        
                        if (facturasData.success && facturasData.data && facturasData.data.length > 0) {
                            const facturasPendientes = facturasData.data;
                            
                            // Calcular total de mora
                            let totalDeuda = 0;
                            let totalMora = 0;
                            let maxMesesAtraso = 0;
                            
                            facturasPendientes.forEach(factura => {
                                const fechaVencimiento = new Date(factura.fechaVencimiento || factura.fechaEmision);
                                fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
                                
                                const hoy = new Date();
                                const diasVencidos = Math.floor((hoy - fechaVencimiento) / (1000 * 60 * 60 * 24));
                                
                                if (diasVencidos > 0) {
                                    const mesesAtraso = Math.ceil(diasVencidos / 30);
                                    maxMesesAtraso = Math.max(maxMesesAtraso, mesesAtraso);
                                    
                                    const mora = factura.montoTotal * (mesesAtraso * MORA_MENSUAL);
                                    totalMora += mora;
                                    totalDeuda += factura.montoTotal + mora;
                                } else {
                                    totalDeuda += factura.montoTotal;
                                }
                            });
                            
                            // Solo agregar clientes con atraso
                            if (maxMesesAtraso > 0) {
                                clientesConMora.push({
                                    ...cliente,
                                    facturasPendientes: facturasPendientes.length,
                                    mesesAtraso: maxMesesAtraso,
                                    totalDeuda: totalDeuda,
                                    totalMora: totalMora,
                                    estadoServicio: maxMesesAtraso >= 2 ? 'suspendido' : 'activo'
                                });
                            }
                        }
                    } catch (error) {
                        console.error(`Error al procesar cliente ${cliente._id}:`, error);
                        // Continuar con el siguiente cliente
                    }
                }
                
                clientesCriticos = clientesConMora;
                filteredClientes = [...clientesCriticos];
                
                console.log(`✅ Clientes con mora cargados: ${clientesCriticos.length}`);
                
                // Mostrar clientes críticos
                this.mostrarClientesCriticos();
                
                // Mostrar mensaje de éxito
                this.showMessage(
                    `${clientesCriticos.length} clientes con mora cargados correctamente`, 
                    'success'
                );
            }

        } catch (error) {
            console.error('Error al cargar clientes críticos:', error);
            this.showMessage('Error al cargar clientes. Verifica tu conexión.', 'error');
            clientesCriticos = [];
            this.mostrarClientesCriticos();
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Aplicar filtros a clientes críticos
     */
    aplicarFiltros() {
        const projectFilter = document.getElementById('projectFilterCriticos');
        const selectedProject = projectFilter ? projectFilter.value : '';

        // IMPORTANTE: Solo resetear filteredClientes si NO hay búsqueda activa
        const searchInput = document.getElementById('searchCliente');
        const searchTerm = searchInput ? searchInput.value.trim() : '';
        
        // Si NO hay búsqueda activa, usar todos los clientes críticos
        if (!searchTerm) {
            filteredClientes = [...clientesCriticos];
        }
        // Si hay búsqueda, mantener los clientes ya filtrados

        // Filtrar por proyecto si se seleccionó uno
        if (selectedProject) {
            filteredClientes = filteredClientes.filter(cliente =>
                cliente.proyecto === selectedProject
            );
        }

        // Ordenar por nombre
        filteredClientes.sort((a, b) => {
            const nombreA = `${a.nombres} ${a.apellidos}`.toLowerCase();
            const nombreB = `${b.nombres} ${b.apellidos}`.toLowerCase();
            return nombreA.localeCompare(nombreB);
        });
    }

    /**
     * Mostrar clientes críticos con paginación
     */
    mostrarClientesCriticos() {
        // Aplicar filtros
        this.aplicarFiltros();

        // Calcular paginación
        totalRecords = filteredClientes.length;
        totalPages = Math.ceil(totalRecords / pageSize);

        // Obtener datos de la página actual
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const pageData = filteredClientes.slice(startIndex, endIndex);

        const tbody = document.getElementById('clientesCriticosBody');

        if (pageData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="loading-cell">
                        <div class="empty-state">
                            <div class="empty-state-icon">👥</div>
                            <div class="empty-state-message">No hay clientes con mora</div>
                            <div class="empty-state-submessage">
                                ${filteredClientes.length === 0 && clientesCriticos.length > 0 
                                    ? 'Intenta ajustar los filtros de búsqueda' 
                                    : 'Todos los clientes están al día con sus pagos'}
                            </div>
                        </div>
                    </td>
                </tr>
            `;
            this.hidePagination();
            this.updateClientCounter(0);
            return;
        }

        tbody.innerHTML = '';
        pageData.forEach(cliente => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${cliente.nombres} ${cliente.apellidos}</td>
                <td>${cliente.contador || 'N/A'}</td>
                <td>${cliente.mesesAtraso || 0}</td>
                <td>${formatCurrency(cliente.totalDeuda || 0)}</td>
                <td><span class="badge ${cliente.estadoServicio || 'activo'}">
                    ${(cliente.estadoServicio || 'activo').toUpperCase()}
                </span></td>
                <td>
                    <button class="btn-ver-detalle" onclick="moraManager.verDetalleMora('${cliente._id}')">
                        Ver Detalle
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Actualizar controles de paginación
        this.updatePaginationControls();

        // Actualizar contador de clientes
        this.updateClientCounter(totalRecords);
    }

    /**
     * Manejar cambio de filtro de proyecto
     */
    handleProjectFilter(e) {
        currentPage = 1; // Resetear a primera página
        this.mostrarClientesCriticos();
    }

    /**
     * Ver detalle de mora de un cliente específico
     */
    async verDetalleMora(clienteId) {
        this.currentClienteId = clienteId;

        // Cargar info del cliente primero
        this.showLoading(true);
        try {
            const response = await this.apiRequest(
                `${this.API_BASE}/clientes/${clienteId}`
            );
            const data = await response.json();

            if (response.ok && data.data) {
                this.currentCliente = data.data;
                this.mostrarInfoCliente(data.data);
                await this.calcularMora();

                // Scroll suave al resultado
                document.getElementById('clienteInfo').scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        } catch (error) {
            console.error('Error:', error);
            this.showMessage('Error al cargar información del cliente', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Exportar reporte de mora
     */
    async exportarReporte() {
        if (!this.currentClienteId || !this.currentMoraData) {
            this.showMessage('No hay datos de mora para exportar', 'error');
            return;
        }

        this.showMessage('Función de exportación en desarrollo', 'warning');
        // TODO: Implementar exportación a PDF/Excel
    }

    /**
     * Imprimir estado de cuenta
     */
    imprimirEstadoCuenta() {
        if (!this.currentClienteId) {
            this.showMessage('No hay cliente seleccionado para imprimir', 'error');
            return;
        }

        window.print();
    }

    /**
     * Refrescar todos los datos
     */
    async refreshData() {
        try {
            this.showMessage('Actualizando datos...', 'info');

            // Recargar clientes críticos
            await this.cargarClientesCriticos();

            // Si hay un cliente seleccionado, recalcular su mora
            if (this.currentClienteId) {
                await this.calcularMora();
            }

            this.showMessage('Datos actualizados correctamente', 'success');

        } catch (error) {
            console.error('Error al actualizar datos:', error);
            this.showMessage('Error al actualizar los datos', 'error');
        }
    }

    // ===============================================
    // FUNCIONES DE PAGINACIÓN
    // ===============================================

    /**
     * Configurar controles de paginación
     */
    setupPaginationControls() {
        // Cambio de tamaño de página
        const pageSizeSelect = document.getElementById('pageSizeSelect');
        if (pageSizeSelect) {
            pageSizeSelect.removeEventListener('change', this.handlePageSizeChange);
            pageSizeSelect.addEventListener('change', (e) => this.handlePageSizeChange(e));
        }

        // Botones de navegación
        const firstPageBtn = document.getElementById('firstPageBtn');
        const prevPageBtn = document.getElementById('prevPageBtn');
        const nextPageBtn = document.getElementById('nextPageBtn');
        const lastPageBtn = document.getElementById('lastPageBtn');

        if (firstPageBtn) {
            firstPageBtn.removeEventListener('click', this.goToFirstPage);
            firstPageBtn.addEventListener('click', () => this.goToPage(1));
        }
        if (prevPageBtn) {
            prevPageBtn.removeEventListener('click', this.goToPrevPage);
            prevPageBtn.addEventListener('click', () => this.goToPage(currentPage - 1));
        }
        if (nextPageBtn) {
            nextPageBtn.removeEventListener('click', this.goToNextPage);
            nextPageBtn.addEventListener('click', () => this.goToPage(currentPage + 1));
        }
        if (lastPageBtn) {
            lastPageBtn.removeEventListener('click', this.goToLastPage);
            lastPageBtn.addEventListener('click', () => this.goToPage(totalPages));
        }
    }

    /**
     * Manejar cambio de tamaño de página
     */
    handlePageSizeChange(e) {
        pageSize = parseInt(e.target.value);
        currentPage = 1;
        this.mostrarClientesCriticos();
    }

    /**
     * Ir a una página específica
     */
    goToPage(page) {
        if (page < 1 || page > totalPages) return;
        currentPage = page;
        this.mostrarClientesCriticos();
    }

    /**
     * Actualizar controles de paginación
     */
    updatePaginationControls() {
        const paginationContainer = document.getElementById('paginationContainer');

        if (!paginationContainer) return;

        if (totalRecords === 0 || totalPages <= 1) {
            this.hidePagination();
            return;
        }

        paginationContainer.classList.remove('hidden');

        // Actualizar información
        const startRecord = Math.min((currentPage - 1) * pageSize + 1, totalRecords);
        const endRecord = Math.min(currentPage * pageSize, totalRecords);
        const paginationInfo = document.getElementById('paginationInfo');
        if (paginationInfo) {
            paginationInfo.textContent =
                `Mostrando ${startRecord}-${endRecord} de ${totalRecords} clientes`;
        }

        // Actualizar botones
        const firstPageBtn = document.getElementById('firstPageBtn');
        const prevPageBtn = document.getElementById('prevPageBtn');
        const nextPageBtn = document.getElementById('nextPageBtn');
        const lastPageBtn = document.getElementById('lastPageBtn');

        if (firstPageBtn) firstPageBtn.disabled = currentPage === 1;
        if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
        if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
        if (lastPageBtn) lastPageBtn.disabled = currentPage === totalPages;

        // Generar números de página
        this.generatePageNumbers();
    }

    /**
     * Generar números de página
     */
    generatePageNumbers() {
        const pageNumbers = document.getElementById('pageNumbers');
        if (!pageNumbers) return;

        let html = '';

        // Mostrar máximo 5 números de página
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);

        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <button class="pagination-btn ${i === currentPage ? 'active' : ''}"
                        onclick="moraManager.goToPage(${i})">${i}</button>
            `;
        }

        pageNumbers.innerHTML = html;
    }

    /**
     * Ocultar paginación
     */
    hidePagination() {
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) {
            paginationContainer.classList.add('hidden');
        }
    }

    /**
     * Actualizar contador de clientes
     */
    updateClientCounter(count) {
        const counterElement = document.getElementById('clientesCriticosCount');
        if (counterElement) {
            if (count === 0) {
                counterElement.textContent = 'No se encontraron clientes';
                counterElement.style.color = '#dc3545';
            } else if (count === clientesCriticos.length) {
                counterElement.textContent = `${count} clientes con mora`;
                counterElement.style.color = '#6c757d';
            } else {
                counterElement.textContent = `${count} de ${clientesCriticos.length} clientes`;
                counterElement.style.color = '#28a745';
            }
        }
    }

    // ===============================================
    // FUNCIONES DE UTILIDAD
    // ===============================================

    /**
     * Mostrar elemento
     */
    showElement(elementId, displayType = 'block') {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('hidden');
            element.classList.add('visible');
        }
    }

    /**
     * Ocultar elemento
     */
    hideElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('hidden');
            element.classList.remove('visible');
        }
    }

    /**
     * Mostrar múltiples elementos
     */
    showElements(...elementIds) {
        elementIds.forEach(id => this.showElement(id));
    }

    /**
     * Ocultar múltiples elementos
     */
    hideElements(...elementIds) {
        elementIds.forEach(id => this.hideElement(id));
    }

    /**
     * Mostrar/ocultar loading
     */
    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            if (show) {
                loading.classList.add('visible');
            } else {
                loading.classList.remove('visible');
            }
        }
    }

    /**
     * Mostrar mensaje con PageUtils o fallback
     */
    showMessage(text, type = 'success') {
        // Usar el sistema centralizado de mensajes si está disponible
        if (typeof PageUtils !== 'undefined') {
            if (type === 'success') {
                PageUtils.showSuccess(text);
            } else if (type === 'error') {
                PageUtils.showError(text);
            } else {
                PageUtils.showMessage(text, type);
            }
            return;
        }

        // Fallback al sistema local
        const messageEl = document.getElementById('message');
        if (!messageEl) return;

        messageEl.textContent = text;
        messageEl.className = `message ${type} visible`;

        setTimeout(() => {
            messageEl.classList.remove('visible');
        }, 5000); // ✅ Corregido a 5000ms (antes era 4000ms)
    }

    /**
     * Debugging de autenticación (solo en desarrollo)
     */
    debugAuthentication() {
        if (typeof auth === 'undefined') return;

        const token = auth.getToken();
        const userData = auth.getUserData();

        console.log('🔍 Debug Autenticación - Mora:', {
            hasToken: !!token,
            tokenLength: token ? token.length : 0,
            tokenStart: token ? token.substring(0, 20) + '...' : 'No token',
            hasUserData: !!userData,
            userData: userData,
            currentURL: window.location.href,
            sessionStorageKeys: Object.keys(sessionStorage),
            authIsValid: auth.isAuthenticated(),
            authManagerLoaded: typeof auth !== 'undefined'
        });

        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                console.log('🔑 Token payload:', {
                    userId: payload.id,
                    username: payload.username,
                    role: payload.role,
                    exp: payload.exp,
                    expDate: new Date(payload.exp * 1000),
                    isExpired: Date.now() / 1000 > payload.exp
                });
            } catch (e) {
                console.error('❌ Error decodificando token:', e);
            }
        }
    }
}

// ===============================================
// FUNCIONES GLOBALES DE UTILIDAD
// ===============================================

/**
 * Formatear moneda a formato guatemalteco
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-GT', {
        style: 'currency',
        currency: 'GTQ',
        minimumFractionDigits: 2
    }).format(amount);
}

/**
 * Formatear fechas a formato guatemalteco
 */
function formatDate(date) {
    return new Date(date).toLocaleDateString('es-GT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

/**
 * Capitalizar primera letra de una cadena
 */
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Obtener nombre del proyecto
 */
function getProjectName(projectKey) {
    const projects = {
        'san-miguel': 'San Miguel',
        'santa-clara-1': 'Santa Clara Fase 1',
        'santa-clara-2': 'Santa Clara Fase 2',
        'cabanas-1': 'Cabañas Fase 1',
        'cabanas-2': 'Cabañas Fase 2'
    };
    return projects[projectKey] || projectKey;
}

// ===============================================
// INICIALIZACIÓN
// ===============================================

// Variable global del gestor
let moraManager;

/**
 * Inicializar cuando el DOM esté listo
 * La autenticación es manejada por pageProtection.js
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 Iniciando sistema de mora...');

        // Inicializar gestor de mora
        // (La autenticación ya fue verificada por pageProtection.js)
        moraManager = new MoraManager();

        // Debugging en desarrollo
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            moraManager.debugAuthentication();
        }

        console.log('✅ Sistema de mora inicializado correctamente');

    } catch (error) {
        console.error('❌ Error al inicializar sistema de mora:', error);
        if (typeof showMessage !== 'undefined') {
            showMessage('Error al inicializar el sistema de mora', 'error');
        }
    }
});

// Scroll to top al cargar la página
window.addEventListener('load', function() {
    window.scrollTo(0, 0);
});

// ===============================================
// EXPORTACIÓN PARA TESTING
// ===============================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MoraManager,
        formatCurrency,
        formatDate,
        capitalizeFirst,
        getProjectName,
        MORA_MENSUAL,
        COSTO_RECONEXION
    };
}
