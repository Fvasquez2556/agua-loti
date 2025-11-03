/**
 * Sistema de Facturación de Agua LOTI - Lógica Principal
 * Implementa las especificaciones del documento técnico
 * Archivo: factura.js
 */

// Variables globales
let clientes = [];
let facturas = [];
let lecturas = [];
let currentClientData = null;
let pendingInvoiceData = null;
let filteredClientes = []; // Nueva variable para clientes filtrados

// Constantes del sistema según documento técnico
const TARIFA_BASE = 50.00; // Q50.00 por 30,000 litros
const LIMITE_BASE = 30000; // 30,000 litros
const PRECIO_POR_LITRO = TARIFA_BASE / LIMITE_BASE; // Q0.00167 por litro
const RECARGO_EXCEDENTE = 0.075; // 7.5% recargo en excedentes
const MORA_MENSUAL = 0.07; // 7% mora mensual
const COSTO_RECONEXION = 125.00; // Q125.00 reconexión

// URLs de la API
const API_BASE_URL = 'http://localhost:5000/api';
const API_CLIENTES_URL = `${API_BASE_URL}/clientes`;
const API_FACTURAS_URL = `${API_BASE_URL}/facturas`; // ✅ Nueva URL para facturas
const API_LECTURAS_URL = `${API_BASE_URL}/lecturas`; // ✅ Nueva URL para lecturas

/**
 * Función para mostrar mensajes al usuario - USA PageUtils del sistema centralizado
 * @param {string} text - Texto del mensaje
 * @param {string} type - Tipo de mensaje (success, error, warning, info)
 */
function showMessage(text, type) {
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
    
    // Fallback al sistema local si PageUtils no está disponible
    const messageEl = document.getElementById('message');
    if (messageEl) {
        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
        messageEl.style.display = 'block';
        
        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    } else {
        console.log(`[${type.toUpperCase()}] ${text}`);
    }
}

/**
 * Función para hacer peticiones autenticadas al API - USA AuthUtils del sistema centralizado
 * @param {string} url - URL del endpoint
 * @param {object} options - Opciones del fetch
 * @returns {Promise} Response del fetch
 */
async function apiRequest(url, options = {}) {
    try {
        // Usar el sistema centralizado de autenticación
        return await AuthUtils.authenticatedFetch(url, options);
    } catch (error) {
        console.error('Error en API request:', error);
        throw error;
    }
}

/**
 * Funciones auxiliares para manejo de visibilidad de elementos
 */
function showElement(elementId, displayType = 'block') {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.remove('hidden');
        if (displayType !== 'block') {
            element.style.display = displayType;
        }
    }
}

function hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add('hidden');
    }
}

function showElements(...elementIds) {
    elementIds.forEach(id => showElement(id));
}

function hideElements(...elementIds) {
    elementIds.forEach(id => hideElement(id));
}

/**
 * Función para generar número de factura único
 * @returns {string} Número de factura en formato FAC-YYYYMM-NNNN
 */
function generateInvoiceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Obtener secuencial basado en facturas existentes del mes
    const currentMonthInvoices = facturas.filter(f => 
        f.numeroFactura.includes(`FAC-${year}${month}`)
    );
    
    const sequential = (currentMonthInvoices.length + 1).toString().padStart(4, '0');
    return `FAC-${year}${month}-${sequential}`;
}

/**
 * Función para aplicar el sistema de redondeo especificado
 * @param {number} amount - Monto a redondear
 * @returns {number} Monto redondeado
 */
function applyRoundingSystem(amount) {
    const integerPart = Math.floor(amount);
    const decimalPart = amount - integerPart;
    
    if (decimalPart === 0) {
        return amount; // Sin cambios
    } else if (decimalPart <= 0.50) {
        return integerPart + 0.50; // Redondear a .50
    } else {
        return integerPart + 1.00; // Redondear al entero superior
    }
}

/**
 * Función para calcular tarifa según especificaciones técnicas
 * @param {number} consumoLitros - Consumo en litros
 * @returns {object} Desglose de la tarifa
 */
function calculateTariff(consumoLitros) {
    let tarifaBase = TARIFA_BASE;
    let excedenteLitros = 0;
    let costoExcedente = 0;
    let subtotal = tarifaBase;
    
    // Calcular excedente si supera el límite base
    if (consumoLitros > LIMITE_BASE) {
        excedenteLitros = consumoLitros - LIMITE_BASE;
        
        // Costo del excedente con recargo del 7.5%
        const costoExcedenteBase = excedenteLitros * PRECIO_POR_LITRO;
        costoExcedente = costoExcedenteBase * (1 + RECARGO_EXCEDENTE);
        
        subtotal = tarifaBase + costoExcedente;
    }
    
    // Aplicar sistema de redondeo
    const montoTotal = applyRoundingSystem(subtotal);
    
    return {
        tarifaBase,
        excedenteLitros,
        costoExcedente,
        subtotal,
        montoTotal,
        consumoTotal: consumoLitros
    };
}

/**
 * Función para cargar clientes desde la base de datos
 */
async function loadClientes() {
    try {
        showMessage('Cargando clientes desde la base de datos...', 'info');
        
        // Verificar autenticación antes de hacer la petición
        if (!auth.isAuthenticated()) {
            showMessage('Sesión expirada. Redirigiendo al login...', 'error');
            AuthUtils.logout();
            return;
        }
        
        const response = await apiRequest(`${API_CLIENTES_URL}?estado=activo&limit=200`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al cargar clientes desde el servidor');
        }

        const data = await response.json();
        
        if (data.success && data.data && data.data.length > 0) {
            clientes = data.data;
            // Inicializar filteredClientes con todos los clientes
            filteredClientes = [...clientes];
            populateClientSelect();
            showMessage(`${clientes.length} clientes cargados correctamente`, 'success');
            console.log('✅ Clientes cargados:', clientes.length);
        } else {
            clientes = [];
            filteredClientes = [];
            showNoClientsMessage();
            console.warn('⚠️ No se encontraron clientes activos');
        }

    } catch (error) {
        console.error('❌ Error al cargar clientes:', error);
        clientes = [];
        filteredClientes = [];
        showNoClientsMessage();
        
        // Mensaje más específico según el tipo de error
        if (error.message === 'Sesión expirada') {
            showMessage('Sesión expirada. Será redirigido al login.', 'error');
        } else if (error.message.includes('Failed to fetch')) {
            showMessage('Error de conexión. Verifique que el servidor esté ejecutándose en puerto 5000.', 'error');
        } else {
            showMessage(`Error al cargar clientes: ${error.message}`, 'error');
        }
    }
}

/**
 * Función para mostrar mensaje cuando no hay clientes
 */
function showNoClientsMessage() {
    const select = document.getElementById('clienteSelect');
    select.innerHTML = '<option value="">No hay clientes disponibles</option>';
    alert('⚠️ No hay clientes registrados en la base de datos.\n\nPor favor, registre clientes antes de generar facturas.');
}

/**
 * Función para poblar el select de clientes
 * @param {Array} clientesToShow - Clientes a mostrar (opcional, usa filteredClientes por defecto)
 */
function populateClientSelect(clientesToShow = null) {
    const select = document.getElementById('clienteSelect');
    const clientsToDisplay = clientesToShow || filteredClientes || clientes;
    
    select.innerHTML = '<option value="">Seleccione un cliente</option>';
    
    clientsToDisplay.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente._id;
        
        // Formato mejorado: Nombre - Proyecto - Contador - Lote
        const projectName = getProjectName(cliente.proyecto);
        option.textContent = `${cliente.nombres} ${cliente.apellidos} - ${projectName} - ${cliente.contador} - Lote ${cliente.lote}`;
        
        select.appendChild(option);
    });
    
    // Actualizar contador
    updateClientCounter(clientsToDisplay.length);
}

/**
 * Función para actualizar el contador de clientes
 * @param {number} count - Número de clientes mostrados
 */
function updateClientCounter(count) {
    const counterElement = document.getElementById('clientCount');
    if (counterElement) {
        if (count === 0) {
            counterElement.textContent = 'No se encontraron clientes';
            counterElement.style.color = '#dc3545';
        } else if (count === clientes.length) {
            counterElement.textContent = `${count} clientes disponibles`;
            counterElement.style.color = '#6c757d';
        } else {
            counterElement.textContent = `${count} de ${clientes.length} clientes`;
            counterElement.style.color = '#28a745';
        }
    }
}

/**
 * Función para manejar la búsqueda de clientes
 * @param {Event} e - Evento de input
 */
function handleClientSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    const projectFilter = document.getElementById('projectFilter').value;
    
    filterClients(searchTerm, projectFilter);
}

/**
 * Función para manejar el filtro por proyecto
 * @param {Event} e - Evento de cambio en select
 */
function handleProjectFilter(e) {
    const projectFilter = e.target.value;
    const searchTerm = document.getElementById('searchClients').value.toLowerCase().trim();
    
    filterClients(searchTerm, projectFilter);
}

/**
 * Función para filtrar clientes según término de búsqueda y proyecto
 * @param {string} searchTerm - Término de búsqueda
 * @param {string} projectFilter - Filtro de proyecto
 */
function filterClients(searchTerm, projectFilter) {
    let filtered = [...clientes];
    
    // Filtrar por proyecto si se seleccionó uno
    if (projectFilter) {
        filtered = filtered.filter(cliente => cliente.proyecto === projectFilter);
    }
    
    // Filtrar por término de búsqueda si hay uno
    if (searchTerm) {
        filtered = filtered.filter(cliente => {
            const nombreCompleto = `${cliente.nombres} ${cliente.apellidos}`.toLowerCase();
            const dpi = cliente.dpi ? cliente.dpi.toLowerCase() : '';
            const contador = cliente.contador ? cliente.contador.toLowerCase() : '';
            const lote = cliente.lote ? cliente.lote.toString().toLowerCase() : '';
            const proyecto = getProjectName(cliente.proyecto).toLowerCase();
            
            return (
                nombreCompleto.includes(searchTerm) ||
                dpi.includes(searchTerm) ||
                contador.includes(searchTerm) ||
                lote.includes(searchTerm) ||
                proyecto.includes(searchTerm)
            );
        });
    }
    
    // Ordenar por nombre para mejor experiencia de usuario
    filtered.sort((a, b) => {
        const nombreA = `${a.nombres} ${a.apellidos}`.toLowerCase();
        const nombreB = `${b.nombres} ${b.apellidos}`.toLowerCase();
        return nombreA.localeCompare(nombreB);
    });
    
    filteredClientes = filtered;
    populateClientSelect(filtered);
}

/**
 * Función para obtener nombre del proyecto
 * @param {string} projectKey - Clave del proyecto
 * @returns {string} Nombre completo del proyecto
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

/**
 * Función para manejar el cambio de cliente seleccionado
 */
async function handleClientChange() {
    const clienteId = document.getElementById('clienteSelect').value;
    
    if (!clienteId) {
        hideClientSections();
        return;
    }

    try {
        // Buscar cliente en la lista cargada
        const cliente = clientes.find(c => c._id === clienteId);
        if (!cliente) {
            throw new Error('Cliente no encontrado');
        }

        currentClientData = cliente;
        
        // Mostrar información del cliente
        showClientInfo(cliente);
        
        // Cargar historial de facturas del cliente
        await loadClientInvoiceHistory(clienteId);
        
        // Obtener última lectura para establecer lectura anterior
        await loadLastReading(clienteId);
        
        showMessage(`Cliente ${cliente.nombres} ${cliente.apellidos} seleccionado`, 'success');
        
    } catch (error) {
        console.error('Error al cargar datos del cliente:', error);
        showMessage('Error al cargar los datos del cliente', 'error');
        hideClientSections();
    }
}

/**
 * Función para mostrar información del cliente
 * @param {object} cliente - Datos del cliente
 */
function showClientInfo(cliente) {
    // Llenar campos de información del cliente
    document.getElementById('clienteNombre').value = `${cliente.nombres} ${cliente.apellidos}`;
    document.getElementById('clienteProyecto').value = getProjectName(cliente.proyecto);
    document.getElementById('clienteContador').value = cliente.contador;
    document.getElementById('clienteLote').value = cliente.lote;
    
    // Mostrar secciones
    showElements('clientInfo', 'consumptionSection');
    
    // Establecer fecha actual como fecha de lectura
    document.getElementById('fechaLectura').valueAsDate = new Date();
    
    // Establecer período del mes actual
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    document.getElementById('periodoInicio').valueAsDate = firstDay;
    document.getElementById('periodoFin').valueAsDate = lastDay;
}

/**
 * Función para ocultar secciones del cliente
 */
function hideClientSections() {
    hideElements('clientInfo', 'consumptionSection', 'tariffSection', 'formActions', 'invoiceHistory', 'printSection');
    
    currentClientData = null;
    pendingInvoiceData = null;
}

/**
 * Función para cargar historial de facturas del cliente
 * @param {string} clienteId - ID del cliente
 */
async function loadClientInvoiceHistory(clienteId) {
    try {
        // ✅ Conectar con el backend real
        const response = await apiRequest(`${API_FACTURAS_URL}?clienteId=${clienteId}&limit=5&sortBy=fechaEmision&sortOrder=desc`);
        
        if (!response.ok) {
            throw new Error('Error al obtener historial de facturas');
        }
        
        const data = await response.json();
        const clientFacturas = data.data || [];
        
        const historyDiv = document.getElementById('historyList');
        
        if (clientFacturas.length === 0) {
            historyDiv.innerHTML = '<p>No hay facturas registradas para este cliente</p>';
        } else {
            historyDiv.innerHTML = clientFacturas.map(factura => `
                <div class="history-item">
                    <div>
                        <strong>${factura.numeroFactura}</strong><br>
                        <small>${new Date(factura.fechaEmision).toLocaleDateString('es-GT')}</small>
                    </div>
                    <div>
                        <strong>Q ${factura.montoTotal.toFixed(2)}</strong><br>
                        <small class="status-${factura.estado}">${factura.estado.toUpperCase()}</small>
                    </div>
                </div>
            `).join('');
        }
        
        showElement('invoiceHistory');
        
    } catch (error) {
        console.error('Error al cargar historial:', error);
        document.getElementById('historyList').innerHTML = '<p>Error al cargar el historial de facturas</p>';
    }
}

/**
 * Función para cargar última lectura del cliente
 * @param {string} clienteId - ID del cliente
 */
async function loadLastReading(clienteId) {
    try {
        // ✅ Conectar con el backend real
        const response = await apiRequest(`${API_LECTURAS_URL}/cliente/${clienteId}/ultima`);
        
        if (!response.ok) {
            throw new Error('Error al obtener última lectura');
        }
        
        const data = await response.json();
        
        if (data.data && data.data.lecturaActual !== undefined) {
            document.getElementById('lecturaAnterior').value = data.data.lecturaActual;
        } else {
            document.getElementById('lecturaAnterior').value = 0;
        }
        
    } catch (error) {
        console.error('Error al cargar última lectura:', error);
        document.getElementById('lecturaAnterior').value = 0;
    }
}

/**
 * Función para calcular consumo y mostrar desglose de tarifa
 */
function calculateConsumptionAndTariff() {
    const lecturaAnterior = parseFloat(document.getElementById('lecturaAnterior').value) || 0;
    const lecturaActual = parseFloat(document.getElementById('lecturaActual').value) || 0;
    
    if (lecturaActual < lecturaAnterior) {
        showMessage('La lectura actual no puede ser menor a la anterior', 'error');
        return;
    }
    
    const consumoLitros = lecturaActual - lecturaAnterior;
    document.getElementById('consumoCalculado').value = consumoLitros;
    
    // Calcular tarifa según especificaciones
    const tariffBreakdown = calculateTariff(consumoLitros);
    
    // Mostrar desglose
    showTariffBreakdown(tariffBreakdown);
    
    // Actualizar vista previa
    updateInvoicePreview(tariffBreakdown);
    
    // Mostrar secciones
    showElements('tariffSection', 'formActions');
    
    // Guardar datos para confirmación
    pendingInvoiceData = {
        ...tariffBreakdown,
        lecturaAnterior,
        lecturaActual
    };
}

/**
 * Función para mostrar desglose de tarifa
 * @param {object} breakdown - Desglose de la tarifa
 */
function showTariffBreakdown(breakdown) {
    document.getElementById('tarifaBase').textContent = `Q ${breakdown.tarifaBase.toFixed(2)}`;
    document.getElementById('subtotal').textContent = `Q ${breakdown.subtotal.toFixed(2)}`;
    document.getElementById('montoTotal').textContent = `Q ${breakdown.montoTotal.toFixed(2)}`;
    
    // Mostrar excedente si aplica
    if (breakdown.excedenteLitros > 0) {
        document.getElementById('excedenteLitros').textContent = `${breakdown.excedenteLitros.toLocaleString()} litros`;
        document.getElementById('excedenteMonto').textContent = `Q ${breakdown.costoExcedente.toFixed(2)}`;
        showElement('excedentItem', 'flex');
        showElement('excedenteMontoItem', 'flex');
    } else {
        hideElements('excedentItem', 'excedenteMontoItem');
    }
}

/**
 * Función para actualizar la vista previa de la factura
 * @param {object} breakdown - Desglose de la tarifa
 */
function updateInvoicePreview(breakdown) {
    if (!currentClientData) return;
    
    // Datos del cliente
    document.getElementById('preview-nombre').textContent = 
        `${currentClientData.nombres} ${currentClientData.apellidos}`;
    document.getElementById('preview-proyecto').textContent = 
        getProjectName(currentClientData.proyecto);
    document.getElementById('preview-contador').textContent = currentClientData.contador;
    document.getElementById('preview-lote').textContent = currentClientData.lote;
    
    // Datos de facturación
    const numeroFactura = generateInvoiceNumber();
    document.getElementById('preview-factura').textContent = numeroFactura;
    document.getElementById('preview-fecha').textContent = new Date().toLocaleDateString('es-GT');
    
    const periodoInicio = document.getElementById('periodoInicio').value;
    const periodoFin = document.getElementById('periodoFin').value;
    if (periodoInicio && periodoFin) {
        document.getElementById('preview-periodo').textContent = 
            `${new Date(periodoInicio).toLocaleDateString('es-GT')} - ${new Date(periodoFin).toLocaleDateString('es-GT')}`;
    }
    
    // Fecha límite (30 días después)
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + 30);
    document.getElementById('preview-limite').textContent = fechaLimite.toLocaleDateString('es-GT');
    
    // Detalles de consumo
    const tbody = document.getElementById('invoice-items');
    tbody.innerHTML = `
        <tr>
            <td>Tarifa Base (hasta 30,000 litros)</td>
            <td>1 servicio</td>
            <td>Q ${breakdown.tarifaBase.toFixed(2)}</td>
            <td>Q ${breakdown.tarifaBase.toFixed(2)}</td>
        </tr>
        ${breakdown.excedenteLitros > 0 ? `
        <tr>
            <td>Consumo Excedente (${breakdown.excedenteLitros.toLocaleString()} litros)</td>
            <td>${breakdown.excedenteLitros.toLocaleString()}</td>
            <td>Q ${(breakdown.costoExcedente / breakdown.excedenteLitros).toFixed(5)}</td>
            <td>Q ${breakdown.costoExcedente.toFixed(2)}</td>
        </tr>
        ` : ''}
    `;
    
    // Totales
    const totalsDiv = document.getElementById('invoice-totals');
    totalsDiv.innerHTML = `
        <div class="total-row">
            <span>Subtotal:</span>
            <span>Q ${breakdown.subtotal.toFixed(2)}</span>
        </div>
        ${breakdown.subtotal !== breakdown.montoTotal ? `
        <div class="total-row">
            <span>Redondeo aplicado:</span>
            <span>Q ${(breakdown.montoTotal - breakdown.subtotal).toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="total-row final">
            <span>TOTAL A PAGAR:</span>
            <span>Q ${breakdown.montoTotal.toFixed(2)}</span>
        </div>
    `;
}

/**
 * Función para manejar el envío del formulario
 * @param {Event} e - Evento de envío del formulario
 */
function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!currentClientData || !pendingInvoiceData) {
        showMessage('Complete todos los datos antes de generar la factura', 'error');
        return;
    }
    
    // Mostrar modal de confirmación
    showConfirmationModal();
}

/**
 * Función para mostrar modal de confirmación
 */
function showConfirmationModal() {
    const modal = document.getElementById('confirmModal');
    const messageEl = document.getElementById('confirmMessage');
    const detailsEl = document.getElementById('confirmDetails');
    
    messageEl.textContent = '¿Está seguro de generar esta factura interna?';
    
    detailsEl.innerHTML = `
        <div style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <p><strong>Cliente:</strong> ${currentClientData.nombres} ${currentClientData.apellidos}</p>
            <p><strong>Consumo:</strong> ${pendingInvoiceData.consumoTotal.toLocaleString()} litros</p>
            <p><strong>Monto Total:</strong> Q ${pendingInvoiceData.montoTotal.toFixed(2)}</p>
            <p><strong>Período:</strong> ${document.getElementById('periodoInicio').value} - ${document.getElementById('periodoFin').value}</p>
        </div>
    `;
    
    modal.style.display = 'block';
}

/**
 * Función para cerrar modal de confirmación
 */
function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

/**
 * Función para confirmar la generación de factura
 */
async function confirmGenerateInvoice() {
    try {
        closeConfirmModal();
        showMessage('Generando factura...', 'info');
        
        // Preparar datos para envío al backend
        const facturaData = {
            clienteId: currentClientData._id,
            lecturaAnterior: pendingInvoiceData.lecturaAnterior,
            lecturaActual: pendingInvoiceData.lecturaActual,
            fechaLectura: document.getElementById('fechaLectura').value,
            periodoInicio: document.getElementById('periodoInicio').value,
            periodoFin: document.getElementById('periodoFin').value,
            observaciones: `Factura generada vía sistema web. Consumo: ${pendingInvoiceData.consumoTotal} litros`
        };
        
        // ✅ Enviar al backend para crear factura
        const response = await apiRequest(API_FACTURAS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(facturaData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            // Manejar errores específicos del servidor
            if (result.errors && Array.isArray(result.errors)) {
                throw new Error(`Errores de validación: ${result.errors.join(', ')}`);
            } else if (result.message) {
                throw new Error(result.message);
            } else {
                throw new Error(`Error del servidor: ${response.status}`);
            }
        }
        
        if (result.success) {
            showMessage('✅ Factura generada exitosamente', 'success');

            // Actualizar vista previa con datos reales
            const factura = result.data;
            document.getElementById('preview-factura').textContent = factura.numeroFactura;

            // Mostrar botones de impresión
            showElement('printSection');

            // Recargar historial de facturas
            await loadClientInvoiceHistory(currentClientData._id);

            // Actualizar estadísticas del dashboard en tiempo real
            if (typeof window.refreshDashboardStats === 'function') {
                window.refreshDashboardStats();
            }

        } else {
            throw new Error(result.message || 'Error desconocido al generar factura');
        }
        
    } catch (error) {
        console.error('Error al generar factura:', error);
        showMessage('❌ Error al generar la factura: ' + error.message, 'error');
    }
}

/**
 * Función para resetear el formulario
 */
function resetForm() {
    document.getElementById('invoiceForm').reset();
    hideClientSections();
    
    // Limpiar filtros de búsqueda
    clearClientFilters();
    
    // Limpiar vista previa
    document.getElementById('invoice-items').innerHTML = `
        <tr>
            <td colspan="4" class="invoice-empty-cell">
                Complete el formulario para generar la vista previa
            </td>
        </tr>
    `;
    document.getElementById('invoice-totals').innerHTML = '';
    
    showMessage('Formulario limpiado', 'info');
}

/**
 * Función para limpiar filtros de búsqueda de clientes
 */
function clearClientFilters() {
    const searchInput = document.getElementById('searchClients');
    const projectFilter = document.getElementById('projectFilter');
    
    if (searchInput) {
        searchInput.value = '';
    }
    if (projectFilter) {
        projectFilter.value = '';
    }
    
    // Restaurar todos los clientes
    filteredClientes = [...clientes];
    populateClientSelect();
}

/**
 * Función para imprimir factura
 */
function printInvoice() {
    window.print();
}

/**
 * Función para descargar PDF (placeholder)
 */
function downloadInvoicePDF() {
    showMessage('Función de descarga PDF en desarrollo', 'warning');
    // TODO: Implementar generación de PDF
}

/*
// FUTURO: Función para envío de notificación WhatsApp
async function sendWhatsAppNotification(cliente, factura) {
    try {
        // Integración con WhatsApp Business API
        const mensaje = `
🧾 *Nueva Factura de Agua LOTI*

Estimado/a ${cliente.nombres} ${cliente.apellidos},

Se ha generado su factura:
📄 No. ${factura.numeroFactura}
💰 Monto: Q${factura.montoTotal.toFixed(2)}
📅 Vencimiento: ${new Date(factura.fechaVencimiento).toLocaleDateString('es-GT')}

Contador: ${cliente.contador}
Consumo: ${factura.consumoLitros.toLocaleString()} litros

Puede realizar su pago en nuestras oficinas.

Gracias por su preferencia.
        `;
        
        // const response = await fetch('/api/whatsapp/send', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({
        //         numero: cliente.whatsapp,
        //         mensaje: mensaje
        //     })
        // });
        
        console.log('Notificación WhatsApp enviada:', mensaje);
        
    } catch (error) {
        console.error('Error enviando WhatsApp:', error);
    }
}

// FUTURO: Función para certificación FEL
async function certificarFacturaFEL(facturaData) {
    try {
        // Preparar datos para DTE según formato FEL
        const dteData = {
            tipo: 'FACT',
            fechaEmision: facturaData.fechaEmision,
            emisor: {
                nit: 'TU_NIT_EMPRESA',
                nombre: 'Sistema de Agua LOTI',
                direccion: 'Huehuetenango, Guatemala'
            },
            receptor: {
                nit: facturaData.cliente.dpi, // Usar DPI como NIT
                nombre: `${facturaData.cliente.nombres} ${facturaData.cliente.apellidos}`
            },
            items: [
                {
                    descripcion: `Servicio de agua - Contador ${facturaData.cliente.contador}`,
                    cantidad: 1,
                    precioUnitario: facturaData.tarifaBase,
                    total: facturaData.tarifaBase
                }
            ]
        };
        
        // Si hay excedente, agregar como item separado
        if (facturaData.excedenteLitros > 0) {
            dteData.items.push({
                descripcion: `Consumo excedente ${facturaData.excedenteLitros} litros`,
                cantidad: facturaData.excedenteLitros,
                precioUnitario: facturaData.costoExcedente / facturaData.excedenteLitros,
                total: facturaData.costoExcedente
            });
        }
        
        // Enviar a certificador INFILE
        // const response = await fetch('/api/fel/certificar', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(dteData)
        // });
        
        // const resultado = await response.json();
        
        // Actualizar factura con datos de certificación
        // facturaData.certificadoFEL = true;
        // facturaData.codigoAutorizacionSAT = resultado.codigoAutorizacion;
        // facturaData.fechaCertificacionFEL = new Date().toISOString();
        
        console.log('Factura preparada para certificación FEL:', dteData);
        
    } catch (error) {
        console.error('Error en certificación FEL:', error);
    }
}
*/

/**
 * Función para configurar los event listeners
 */
function setupEventListeners() {
    // Evitar duplicar listeners - remover existentes primero
    const clienteSelect = document.getElementById('clienteSelect');
    const lecturaActual = document.getElementById('lecturaActual');
    const invoiceForm = document.getElementById('invoiceForm');
    const closeModal = document.querySelector('.close-modal');
    const confirmModal = document.getElementById('confirmModal');
    
    // Elementos de búsqueda y filtros
    const searchClients = document.getElementById('searchClients');
    const projectFilter = document.getElementById('projectFilter');
    const clearFilters = document.getElementById('clearFilters');
    
    // Remover listeners existentes (si los hay)
    clienteSelect.removeEventListener('change', handleClientChange);
    lecturaActual.removeEventListener('input', calculateConsumptionAndTariff);
    invoiceForm.removeEventListener('submit', handleFormSubmit);
    
    // Remover listeners de búsqueda si existen
    if (searchClients) {
        searchClients.removeEventListener('input', handleClientSearch);
    }
    if (projectFilter) {
        projectFilter.removeEventListener('change', handleProjectFilter);
    }
    if (clearFilters) {
        clearFilters.removeEventListener('click', clearClientFilters);
    }
    
    // Agregar listeners frescos
    clienteSelect.addEventListener('change', handleClientChange);
    lecturaActual.addEventListener('input', calculateConsumptionAndTariff);
    invoiceForm.addEventListener('submit', handleFormSubmit);
    
    // Agregar listeners de búsqueda y filtros
    if (searchClients) {
        searchClients.addEventListener('input', handleClientSearch);
    }
    if (projectFilter) {
        projectFilter.addEventListener('change', handleProjectFilter);
    }
    if (clearFilters) {
        clearFilters.addEventListener('click', clearClientFilters);
    }
    
    // Modal listeners
    if (closeModal) {
        closeModal.removeEventListener('click', closeConfirmModal);
        closeModal.addEventListener('click', closeConfirmModal);
    }
    
    if (confirmModal) {
        confirmModal.removeEventListener('click', handleModalOutsideClick);
        confirmModal.addEventListener('click', handleModalOutsideClick);
    }
    
    // ESC key listener (solo una vez)
    document.removeEventListener('keydown', handleEscapeKey);
    document.addEventListener('keydown', handleEscapeKey);
}

// Función separada para manejar click fuera del modal
function handleModalOutsideClick(e) {
    if (e.target === e.currentTarget) {
        closeConfirmModal();
    }
}

// Función separada para manejar ESC
function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        closeConfirmModal();
    }
}

/**
 * Función para inicializar valores por defecto
 */
function initializeDefaults() {
    // ✅ Ya no necesitamos localStorage, todo se maneja via backend
    console.log('Sistema de facturación inicializado con conexión a backend');
}

/**
 * Función principal de inicialización
 */
async function initializeApp() {
    try {
        console.log('🚀 Iniciando sistema de facturación...');
        
        // Verificar que el sistema de autenticación esté cargado
        if (typeof auth === 'undefined' || typeof AuthUtils === 'undefined') {
            console.error('❌ Sistema de autenticación no cargado');
            showMessage('Error: Sistema de autenticación no disponible', 'error');
            return;
        }
        
        // pageProtection.js ya verificó la autenticación, solo confirmamos
        if (!auth.isAuthenticated()) {
            console.warn('⚠️ Usuario no autenticado después de pageProtection');
            return; // No redirigir aquí, pageProtection.js ya lo hizo
        }
        
        // Debug autenticación (solo en desarrollo)
        debugAuthentication();
        
        // Inicializar valores por defecto
        initializeDefaults();
        
        // Configurar event listeners
        setupEventListeners();
        
        // Cargar clientes desde la base de datos
        await loadClientes();
        
        console.log('✅ Sistema de facturación inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error al inicializar la aplicación:', error);
        showMessage('Error al inicializar el sistema de facturación', 'error');
    }
}

// Funciones globales para botones (necesarias para onclick en HTML)
window.resetForm = resetForm;
window.printInvoice = printInvoice;
window.downloadInvoicePDF = downloadInvoicePDF;
window.closeConfirmModal = closeConfirmModal;
window.confirmGenerateInvoice = confirmGenerateInvoice;

// Debugging function para verificar autenticación
function debugAuthentication() {
    const token = auth.getToken();
    const userData = auth.getUserData();
    
    console.log('🔍 Debug Autenticación:', {
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

// Llamar debugging al cargar
window.debugAuthentication = debugAuthentication;
window.confirmGenerateInvoice = confirmGenerateInvoice;

// Event Listeners principales
document.addEventListener('DOMContentLoaded', initializeApp);

// Asegurar que la página se cargue correctamente desde arriba
window.addEventListener('load', function() {
    window.scrollTo(0, 0);
});

// Exportar funciones para testing (si es necesario)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateTariff,
        applyRoundingSystem,
        generateInvoiceNumber,
        TARIFA_BASE,
        LIMITE_BASE,
        PRECIO_POR_LITRO,
        RECARGO_EXCEDENTE,
        MORA_MENSUAL,
        COSTO_RECONEXION
    };
}