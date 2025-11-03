/**
 * Sistema de Control de Pagos - Lógica Principal
 * Implementa la integración completa con el backend
 * Archivo: pagos.js
 */

// Variables globales
let clientes = [];
let facturasPendientes = [];
let filteredFacturas = []; // Facturas filtradas
let historialPagos = [];
let currentSelectedInvoice = null;
let pendingPaymentData = null;

// Variables de paginación
let currentPage = 1;
let pageSize = 10;
let totalPages = 1;
let totalRecords = 0;

// Constantes del sistema
const MORA_MENSUAL = 0.07; // 7% mora mensual
const API_BASE_URL = 'http://localhost:5000/api';

// URLs de la API
const API_ENDPOINTS = {
    clientes: `${API_BASE_URL}/clientes`,
    pagos: `${API_BASE_URL}/pagos`,
    facturas: `${API_BASE_URL}/facturas`,
    facturasPendientes: `${API_BASE_URL}/pagos/facturas-pendientes`,
    resumenPendientes: `${API_BASE_URL}/pagos/facturas-pendientes/resumen`,
    historialPagos: `${API_BASE_URL}/pagos/historial`
};

/**
 * Función para mostrar mensajes al usuario
 */
function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

/**
 * Función para hacer peticiones autenticadas al API
 */
async function apiRequest(url, options = {}) {
    try {
        const token = sessionStorage.getItem('auth_token');
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
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
            sessionStorage.removeItem('auth_token');
            window.location.href = 'login.html';
            throw new Error('Sesión expirada');
        }

        return response;
    } catch (error) {
        console.error('Error en API request:', error);
        throw error;
    }
}

/**
 * Función para calcular mora acumulada según especificaciones
 * @param {string} fechaEmision - Fecha de emisión de la factura
 * @param {number} montoOriginal - Monto original de la factura
 * @returns {object} Detalles de la mora
 */
function calculateMora(fechaEmision, montoOriginal) {
    const fechaVencimiento = new Date(fechaEmision);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 30); // 30 días para vencer
    
    const hoy = new Date();
    const diasVencidos = Math.floor((hoy - fechaVencimiento) / (1000 * 60 * 60 * 24));
    
    if (diasVencidos <= 0) {
        return {
            diasVencidos: 0,
            mesesMora: 0,
            porcentajeMora: 0,
            montoMora: 0,
            montoTotal: montoOriginal
        };
    }
    
    const mesesMora = Math.ceil(diasVencidos / 30);
    const porcentajeMora = mesesMora * MORA_MENSUAL;
    const montoMora = montoOriginal * porcentajeMora;
    const montoTotal = montoOriginal + montoMora;
    
    return {
        diasVencidos,
        mesesMora,
        porcentajeMora,
        montoMora,
        montoTotal
    };
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
 * Cargar lista de clientes
 */
async function loadClientes() {
    try {
        const response = await apiRequest(API_ENDPOINTS.clientes);
        const data = await response.json();
        
        if (data.success) {
            clientes = data.data;
            populateClienteSelect();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error al cargar clientes:', error);
        showMessage('Error al cargar lista de clientes', 'error');
    }
}

/**
 * Poblar select de clientes
 */
function populateClienteSelect() {
    const select = document.getElementById('clienteSelect');
    select.innerHTML = '<option value="">Seleccione un cliente</option>';
    
    clientes.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente._id;
        option.textContent = `${cliente.nombres} ${cliente.apellidos} - ${cliente.contador} (${cliente.proyecto})`;
        select.appendChild(option);
    });
}

/**
 * Función para formatear moneda
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-GT', {
        style: 'currency',
        currency: 'GTQ',
        minimumFractionDigits: 2
    }).format(amount);
}

/**
 * Función para formatear fechas
 */
function formatDate(date) {
    return new Date(date).toLocaleDateString('es-GT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

/**
 * Función utilitaria para capitalizar primera letra
 */
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Cargar facturas pendientes para la tabla general
 */
async function loadFacturasPendientes() {
    try {
        const response = await apiRequest(API_ENDPOINTS.resumenPendientes);
        const data = await response.json();
        
        if (data.success) {
            facturasPendientes = data.data;
            updatePendingSummary(data.resumen);
            populatePendingInvoicesTable();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error al cargar facturas pendientes:', error);
        showMessage('Error al cargar facturas pendientes', 'error');
    }
}

/**
 * Actualizar resumen de facturas pendientes
 */
function updatePendingSummary(resumen) {
    document.getElementById('totalPendingCount').textContent = resumen.totalFacturas || 0;
    document.getElementById('totalPendingAmount').textContent = formatCurrency(resumen.montoPendiente || 0);
    document.getElementById('overdueCount').textContent = resumen.facturasVencidas || 0;
    document.getElementById('totalMoraAmount').textContent = formatCurrency(resumen.montoMora || 0);
}

/**
 * Poblar tabla de facturas pendientes con paginación
 */
function populatePendingInvoicesTable() {
    // Aplicar filtros
    applyFilters();
    
    // Calcular paginación
    totalRecords = filteredFacturas.length;
    totalPages = Math.ceil(totalRecords / pageSize);
    
    // Obtener datos de la página actual
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageData = filteredFacturas.slice(startIndex, endIndex);
    
    const tbody = document.getElementById('pendingTableBody');
    
    if (pageData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="loading-cell">
                    <div class="empty-state">
                        <div class="empty-state-icon">📋</div>
                        <div class="empty-state-message">No se encontraron facturas</div>
                        <div class="empty-state-submessage">Intenta ajustar los filtros de búsqueda</div>
                    </div>
                </td>
            </tr>
        `;
        document.getElementById('paginationContainer').classList.add('hidden');
        return;
    }
    
    // Mostrar solo las 10 facturas más antiguas (ordenadas por fecha de emisión)
    const sortedData = pageData.sort((a, b) => {
        const dateA = new Date(a.fechaEmision);
        const dateB = new Date(b.fechaEmision);
        return dateA - dateB; // Más antigua primero
    });
    
    tbody.innerHTML = sortedData.map(factura => {
        const cliente = factura.clienteId;
        const totalConMora = factura.montoTotalConMora || factura.montoTotal;
        const statusClass = factura.diasMora > 0 ? 'overdue' : 'pending';
        const statusText = factura.diasMora > 0 ? `Vencida (${factura.diasMora} días)` : 'Pendiente';
        
        return `
            <tr class="factura-row" data-factura-id="${factura._id}">
                <td>
                    <div class="cliente-info">
                        <strong>${cliente?.nombres || 'N/A'}</strong>
                        <br>
                        <small class="text-muted">${cliente?.proyecto || 'Sin proyecto'}</small>
                    </div>
                </td>
                <td><strong>${factura.numeroFactura}</strong></td>
                <td>${formatDate(factura.fechaEmision)}</td>
                <td class="${statusClass}">
                    ${factura.diasMora > 0 ? factura.diasMora : '-'}
                </td>
                <td>${formatCurrency(factura.montoTotal)}</td>
                <td class="mora-amount">
                    ${factura.montoMora > 0 ? formatCurrency(factura.montoMora) : '-'}
                </td>
                <td class="total-amount">
                    <strong>${formatCurrency(totalConMora)}</strong>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
                <td class="actions">
                    <button class="actions-btn btn-info" onclick="selectInvoiceForPayment('${factura._id}')" 
                            title="Seleccionar para pago">
                        💰 Pagar
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Actualizar controles de paginación
    updatePaginationControls();
}

/**
 * Cargar historial de pagos
 */
async function loadHistorialPagos() {
    try {
        const response = await apiRequest(`${API_ENDPOINTS.historialPagos}?limit=20`);
        const data = await response.json();
        
        if (data.success) {
            historialPagos = data.data;
            populatePaymentsTable();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error al cargar historial de pagos:', error);
        showMessage('Error al cargar historial de pagos', 'error');
    }
}

/**
 * Poblar tabla de historial de pagos
 */
function populatePaymentsTable() {
    const tbody = document.getElementById('paymentsTableBody');
    
    if (historialPagos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="loading-cell">
                    <div class="no-data">
                        📄 No hay pagos registrados
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = historialPagos.map(pago => {
        const cliente = pago.clienteId;
        const factura = pago.facturaId;
        const felStatus = pago.fel?.generado ? 'Generado' : 'Pendiente';
        const felClass = pago.fel?.generado ? 'success' : 'warning';

        return `
            <tr>
                <td>${formatDate(pago.fechaPago)}</td>
                <td>${cliente.nombres} ${cliente.apellidos}</td>
                <td>${factura.numeroFactura}</td>
                <td class="text-right">${formatCurrency(pago.montoPagado)}</td>
                <td>${capitalizeFirst(pago.metodoPago)}</td>
                <td>${pago.referenciaPago || '-'}</td>
                <td><span class="status-badge ${felClass}">${felStatus}</span></td>
                <td>
                    <button class="btn-sm btn-secondary" onclick="viewPaymentDetails('${pago._id}')" title="Ver detalles">
                        👁️ Ver
                    </button>
                    <button class="btn-sm btn-primary" onclick="descargarTicketPago('${pago._id}')" title="Descargar ticket PDF">
                        📄 Ticket
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Funciones globales para eventos onclick en HTML
window.selectInvoiceForPayment = selectInvoiceForPayment;
window.viewPaymentDetails = viewPaymentDetails;
window.closeConfirmPaymentModal = closeConfirmPaymentModal;
window.confirmPaymentRegistration = confirmPaymentRegistration;
window.onClienteChange = onClienteChange;
window.onFacturaChange = onFacturaChange;
window.onMetodoPagoChange = onMetodoPagoChange;
window.descargarTicketPago = descargarTicketPago;

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeApp);

// Scroll to top al cargar la página
window.addEventListener('load', function() {
    window.scrollTo(0, 0);
});

/**
 * Manejar cambio de cliente seleccionado
 */
async function onClienteChange() {
    const clienteId = document.getElementById('clienteSelect').value;
    const pendingSection = document.getElementById('pendingInvoicesSection');
    const facturaSelect = document.getElementById('facturaSelect');
    
    if (!clienteId) {
        pendingSection.classList.add('hidden');
        hideInvoiceInfo();
        return;
    }
    
    try {
        showMessage('Cargando facturas del cliente...', 'info');
        
        const response = await apiRequest(`${API_ENDPOINTS.facturasPendientes}/${clienteId}`);
        const data = await response.json();
        
        if (data.success) {
            facturaSelect.innerHTML = '<option value="">Seleccione una factura</option>';
            
            if (data.data.length === 0) {
                facturaSelect.innerHTML = '<option value="">No hay facturas pendientes</option>';
                showMessage('Este cliente no tiene facturas pendientes', 'info');
            } else {
                data.data.forEach(factura => {
                    const option = document.createElement('option');
                    option.value = factura._id;
                    option.dataset.factura = JSON.stringify(factura);
                    
                    const estado = factura.diasMora > 0 ? 'VENCIDA' : 'PENDIENTE';
                    const total = factura.montoTotalConMora || factura.montoTotal;
                    option.textContent = `${factura.numeroFactura} - ${formatCurrency(total)} (${estado})`;
                    
                    facturaSelect.appendChild(option);
                });
                showMessage('Facturas cargadas correctamente', 'success');
            }
            
            pendingSection.classList.remove('hidden');
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error al cargar facturas del cliente:', error);
        showMessage('Error al cargar facturas del cliente', 'error');
    }
}

/**
 * Manejar cambio de factura seleccionada
 */
function onFacturaChange() {
    const facturaSelect = document.getElementById('facturaSelect');
    const selectedOption = facturaSelect.options[facturaSelect.selectedIndex];
    
    if (!selectedOption.value || !selectedOption.dataset.factura) {
        hideInvoiceInfo();
        return;
    }
    
    try {
        currentSelectedInvoice = JSON.parse(selectedOption.dataset.factura);
        showInvoiceInfo(currentSelectedInvoice);
    } catch (error) {
        console.error('Error al parsear datos de factura:', error);
        showMessage('Error al cargar información de la factura', 'error');
    }
}

/**
 * Mostrar información de la factura seleccionada
 */
function showInvoiceInfo(factura) {
    const infoSection = document.getElementById('invoiceInfo');
    const paymentSection = document.getElementById('paymentDetails');
    
    // Llenar información básica
    document.getElementById('facturaNumero').textContent = factura.numeroFactura;
    document.getElementById('facturaFecha').textContent = formatDate(factura.fechaEmision);
    document.getElementById('montoOriginal').textContent = formatCurrency(factura.montoTotal);
    document.getElementById('moraAcumulada').textContent = formatCurrency(factura.montoMora || 0);
    
    const totalAPagar = (factura.montoTotal || 0) + (factura.montoMora || 0);
    document.getElementById('totalAPagar').textContent = formatCurrency(totalAPagar);
    
    const estado = factura.diasMora > 0 ? 'Vencida' : 'Pendiente';
    const estadoBadge = document.getElementById('estadoFactura');
    estadoBadge.textContent = estado;
    estadoBadge.className = `status-badge ${factura.diasMora > 0 ? 'overdue' : 'pending'}`;
    
    // Mostrar alerta de mora si aplica
    const moraAlert = document.getElementById('moraAlert');
    if (factura.diasMora > 0) {
        document.getElementById('moraDetails').textContent = 
            `Esta factura tiene ${factura.diasMora} días de mora. Mora acumulada: ${formatCurrency(factura.montoMora)}`;
        moraAlert.classList.remove('hidden');
    } else {
        moraAlert.classList.add('hidden');
    }
    
    // Configurar monto de pago
    document.getElementById('montoPago').value = totalAPagar.toFixed(2);
    
    // Actualizar resumen de pago
    updatePaymentSummary(factura);
    
    // Mostrar secciones
    infoSection.classList.remove('hidden');
    paymentSection.classList.remove('hidden');
}

/**
 * Ocultar información de factura
 */
function hideInvoiceInfo() {
    document.getElementById('invoiceInfo').classList.add('hidden');
    document.getElementById('paymentDetails').classList.add('hidden');
    currentSelectedInvoice = null;
}

/**
 * Actualizar resumen de pago
 */
function updatePaymentSummary(factura) {
    document.getElementById('summaryOriginal').textContent = formatCurrency(factura.montoTotal);
    document.getElementById('summaryMora').textContent = formatCurrency(factura.montoMora || 0);
    
    const total = (factura.montoTotal || 0) + (factura.montoMora || 0);
    document.getElementById('summaryTotal').textContent = formatCurrency(total);
    
    // Mostrar/ocultar fila de mora
    const moraItem = document.getElementById('summaryMoraItem');
    if (factura.montoMora > 0) {
        moraItem.style.display = 'flex';
    } else {
        moraItem.style.display = 'none';
    }
}

/**
 * Función para mostrar información de la factura seleccionada
 * @param {object} factura - Objeto de la factura
 */
function showInvoiceInfo(factura) {
    try {
        // Calcular mora
        const mora = calculateMora(factura.fechaEmision, factura.montoTotal);
        
        // Llenar información de la factura
        document.getElementById('facturaNumero').textContent = factura.numeroFactura;
        document.getElementById('facturaFecha').textContent = 
            new Date(factura.fechaEmision).toLocaleDateString('es-GT');
        document.getElementById('montoOriginal').textContent = `Q ${factura.montoTotal.toFixed(2)}`;
        document.getElementById('moraAcumulada').textContent = `Q ${mora.montoMora.toFixed(2)}`;
        document.getElementById('totalAPagar').textContent = `Q ${mora.montoTotal.toFixed(2)}`;
        
        // Estado de la factura
        const estadoBadge = document.getElementById('estadoFactura');
        if (mora.diasVencidos > 0) {
            estadoBadge.textContent = `VENCIDA (${mora.diasVencidos} días)`;
            estadoBadge.className = 'status-badge vencida';
        } else {
            estadoBadge.textContent = 'PENDIENTE';
            estadoBadge.className = 'status-badge pendiente';
        }
        
        // Mostrar alerta de mora si aplica
        if (mora.montoMora > 0) {
            document.getElementById('moraDetails').innerHTML = `
                <strong>Mora de ${mora.mesesMora} mes(es):</strong> ${(mora.porcentajeMora * 100).toFixed(1)}% sobre Q${factura.montoTotal.toFixed(2)} = Q${mora.montoMora.toFixed(2)}
            `;
            document.getElementById('moraAlert').classList.remove('hidden');
        } else {
            document.getElementById('moraAlert').classList.add('hidden');
        }
        
        // Configurar datos de pago
        setupPaymentData(factura, mora);
        
        // Mostrar secciones
        document.getElementById('invoiceInfo').classList.remove('hidden');
        document.getElementById('paymentDetails').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error al mostrar información de factura:', error);
        showMessage('Error al procesar la información de la factura', 'error');
    }
}

/**
 * Función para configurar datos de pago
 * @param {object} factura - Datos de la factura
 * @param {object} mora - Cálculo de mora
 */
function setupPaymentData(factura, mora) {
    // Establecer monto de pago (total con mora)
    document.getElementById('montoPago').value = mora.montoTotal.toFixed(2);
    
    // Establecer fecha actual como fecha de pago
    document.getElementById('fechaPago').valueAsDate = new Date();
    
    // Actualizar resumen de pago
    document.getElementById('summaryOriginal').textContent = `Q ${factura.montoTotal.toFixed(2)}`;
    document.getElementById('summaryTotal').textContent = `Q ${mora.montoTotal.toFixed(2)}`;
    
    if (mora.montoMora > 0) {
        document.getElementById('summaryMora').textContent = `Q ${mora.montoMora.toFixed(2)}`;
        document.getElementById('summaryMoraItem').style.display = 'flex';
    } else {
        document.getElementById('summaryMoraItem').style.display = 'none';
    }
    
    // Guardar datos para el pago
    pendingPaymentData = {
        factura,
        mora,
        montoTotal: mora.montoTotal
    };
}

/**
 * Función para ocultar información de la factura
 */
function hideInvoiceInfo() {
    document.getElementById('invoiceInfo').classList.add('hidden');
    document.getElementById('paymentDetails').classList.add('hidden');
    currentSelectedInvoice = null;
    pendingPaymentData = null;
}

/**
 * Manejar cambio de método de pago
 */
function onMetodoPagoChange() {
    const metodoPago = document.getElementById('metodoPago').value;
    const chequeFields = document.getElementById('chequeFields');
    
    if (metodoPago === 'cheque') {
        chequeFields.classList.remove('hidden');
        document.getElementById('bancoCheque').required = true;
        document.getElementById('numeroCheque').required = true;
    } else {
        chequeFields.classList.add('hidden');
        document.getElementById('bancoCheque').required = false;
        document.getElementById('numeroCheque').required = false;
    }
}

/**
 * Manejar envío del formulario de pago
 */
async function onPaymentSubmit(e) {
    e.preventDefault();
    
    if (!currentSelectedInvoice) {
        showMessage('Debe seleccionar una factura para procesar el pago', 'error');
        return;
    }
    
    // Recopilar datos del formulario
    const formData = new FormData(e.target);
    const paymentData = {
        facturaId: currentSelectedInvoice._id,
        fechaPago: formData.get('fechaPago'),
        metodoPago: formData.get('metodoPago'),
        referenciaPago: formData.get('referencia') || null,
        observaciones: formData.get('observaciones') || null
    };
    
    // Agregar datos específicos para cheques
    if (paymentData.metodoPago === 'cheque') {
        paymentData.bancoCheque = formData.get('bancoCheque');
        paymentData.numeroCheque = formData.get('numeroCheque');
    }
    
    // Mostrar modal de confirmación
    showConfirmPaymentModal(paymentData);
}

/**
 * Mostrar modal de confirmación de pago
 */
function showConfirmPaymentModal(paymentData) {
    // Guardar SOLO los datos del pago (no sobrescribir con otros datos)
    pendingPaymentData = paymentData;

    const modal = document.getElementById('confirmPaymentModal');
    const detailsDiv = document.getElementById('confirmPaymentDetails');

    // Obtener el ID del cliente (puede ser un objeto o un string)
    const clienteId = typeof currentSelectedInvoice.clienteId === 'object'
        ? currentSelectedInvoice.clienteId._id
        : currentSelectedInvoice.clienteId;

    const cliente = clientes.find(c => c._id === clienteId);
    const total = (currentSelectedInvoice.montoTotal || 0) + (currentSelectedInvoice.montoMora || 0);

    if (!cliente) {
        showMessage('Error: No se encontró información del cliente', 'error');
        return;
    }

    // Mostrar resumen en el modal
    detailsDiv.innerHTML = `
        <div class="confirm-details">
            <p><strong>Cliente:</strong> ${cliente.nombres} ${cliente.apellidos}</p>
            <p><strong>Factura:</strong> ${currentSelectedInvoice.numeroFactura}</p>
            <p><strong>Monto a Pagar:</strong> ${formatCurrency(total)}</p>
            <p><strong>Método:</strong> ${capitalizeFirst(paymentData.metodoPago)}</p>
            ${paymentData.referenciaPago ? `<p><strong>Referencia:</strong> ${paymentData.referenciaPago}</p>` : ''}
            ${paymentData.metodoPago === 'cheque' ? `<p><strong>Cheque No.:</strong> ${paymentData.numeroCheque} (${paymentData.bancoCheque})</p>` : ''}
        </div>
    `;

    modal.style.display = 'block';
}

/**
 * Confirmar y procesar el pago
 */
async function confirmPaymentRegistration() {
    if (!pendingPaymentData) {
        showMessage('Error: datos de pago no encontrados', 'error');
        return;
    }

    try {
        showMessage('Procesando pago...', 'info');

        // Debug: mostrar datos que se enviarán
        console.log('Datos del pago a enviar:', JSON.stringify(pendingPaymentData, null, 2));

        const response = await apiRequest(API_ENDPOINTS.pagos, {
            method: 'POST',
            body: JSON.stringify(pendingPaymentData)
        });

        const data = await response.json();

        if (data.success) {
            const pagoId = data.data._id;
            showMessage('✅ Pago registrado exitosamente y DTE generado', 'success');

            // Descargar ticket automáticamente
            try {
                showMessage('📄 Descargando ticket de pago...', 'info');
                await descargarTicketPago(pagoId);
                showMessage('✅ Ticket descargado correctamente', 'success');
            } catch (ticketError) {
                console.error('Error al descargar ticket:', ticketError);
                showMessage('⚠️ Pago registrado pero no se pudo descargar el ticket automáticamente', 'warning');
            }

            // Cerrar modal
            closeConfirmPaymentModal();

            // Resetear formulario
            document.getElementById('paymentForm').reset();
            hideInvoiceInfo();
            document.getElementById('clienteSelect').value = '';
            document.getElementById('pendingInvoicesSection').classList.add('hidden');

            // Actualizar datos
            await refreshData();

            // Actualizar estadísticas del dashboard en tiempo real
            if (typeof window.refreshDashboardStats === 'function') {
                window.refreshDashboardStats();
            }

        } else {
            throw new Error(data.message);
        }

    } catch (error) {
        console.error('Error al procesar pago:', error);
        showMessage(`Error al procesar el pago: ${error.message}`, 'error');
    }
}

/**
 * Cerrar modal de confirmación
 */
function closeConfirmPaymentModal() {
    document.getElementById('confirmPaymentModal').style.display = 'none';
    pendingPaymentData = null;
}

/**
 * Seleccionar factura para pago desde tabla
 */
async function selectInvoiceForPayment(facturaId) {
    try {
        // Encontrar la factura en la lista
        const factura = facturasPendientes.find(f => f._id === facturaId);
        if (!factura) {
            showMessage('Factura no encontrada', 'error');
            return;
        }
        
        // Seleccionar el cliente automáticamente
        document.getElementById('clienteSelect').value = factura.clienteId._id;
        await onClienteChange();
        
        // Esperar un momento para que se carguen las facturas del cliente
        setTimeout(() => {
            document.getElementById('facturaSelect').value = facturaId;
            onFacturaChange();
            
            // Hacer scroll al formulario de pago
            document.querySelector('.payment-form-section').scrollIntoView({ 
                behavior: 'smooth' 
            });
        }, 500);
        
    } catch (error) {
        console.error('Error al seleccionar factura:', error);
        showMessage('Error al seleccionar la factura', 'error');
    }
}

/**
 * Ver detalles de un pago específico
 */
async function viewPaymentDetails(pagoId) {
    try {
        const response = await apiRequest(`${API_ENDPOINTS.pagos}/${pagoId}`);
        const data = await response.json();

        if (data.success) {
            const pago = data.data;
            const cliente = pago.clienteId;
            const factura = pago.facturaId;

            const modalContent = `
                <div class="payment-details">
                    <h4>Detalles del Pago</h4>
                    <div class="detail-grid">
                        <p><strong>Número de Pago:</strong> ${pago.numeroPago || pago._id}</p>
                        <p><strong>Cliente:</strong> ${cliente.nombres} ${cliente.apellidos}</p>
                        <p><strong>Factura:</strong> ${factura.numeroFactura}</p>
                        <p><strong>Fecha de Pago:</strong> ${formatDate(pago.fechaPago)}</p>
                        <p><strong>Monto Original:</strong> ${formatCurrency(pago.montoOriginal || 0)}</p>
                        ${pago.montoMora > 0 ? `<p><strong>Mora:</strong> ${formatCurrency(pago.montoMora)}</p>` : ''}
                        ${pago.montoReconexion > 0 ? `<p><strong>Reconexión:</strong> ${formatCurrency(pago.montoReconexion)}</p>` : ''}
                        <p><strong>Total Pagado:</strong> <span style="color: #27ae60; font-size: 1.1em;">${formatCurrency(pago.montoPagado)}</span></p>
                        <p><strong>Método:</strong> ${capitalizeFirst(pago.metodoPago)}</p>
                        ${pago.referenciaPago ? `<p><strong>Referencia:</strong> ${pago.referenciaPago}</p>` : ''}
                        ${pago.bancoCheque ? `<p><strong>Banco:</strong> ${pago.bancoCheque}</p>` : ''}
                        ${pago.numeroCheque ? `<p><strong>No. Cheque:</strong> ${pago.numeroCheque}</p>` : ''}
                        <p><strong>Estado FEL:</strong> ${pago.fel?.generado ? '✅ Generado' : '⏳ Pendiente'}</p>
                        ${pago.observaciones ? `<p><strong>Observaciones:</strong> ${pago.observaciones}</p>` : ''}
                    </div>
                    <div style="margin-top: 20px; text-align: center;">
                        <button class="btn-primary" onclick="descargarTicketPago('${pago._id}')" style="padding: 10px 20px;">
                            📄 Descargar Ticket PDF
                        </button>
                    </div>
                </div>
            `;

            document.getElementById('paymentDetails-modal').innerHTML = modalContent;
            document.getElementById('paymentModal').style.display = 'block';

        } else {
            throw new Error(data.message);
        }

    } catch (error) {
        console.error('Error al cargar detalles del pago:', error);
        showMessage('Error al cargar detalles del pago', 'error');
    }
}

/**
 * Descargar ticket PDF de un pago
 * @param {string} pagoId - ID del pago
 */
async function descargarTicketPago(pagoId) {
    try {
        const token = sessionStorage.getItem('auth_token');

        const response = await fetch(`${API_ENDPOINTS.pagos}/${pagoId}/ticket`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al descargar ticket');
        }

        // Obtener el blob del PDF
        const blob = await response.blob();

        // Obtener el nombre del archivo desde el header Content-Disposition
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'ticket-pago.pdf';

        if (contentDisposition) {
            // Mejorar la extracción del nombre del archivo
            // Soportar: filename="nombre.pdf" o filename=nombre.pdf o filename*=UTF-8''nombre.pdf
            const utf8Match = contentDisposition.match(/filename\*=UTF-8''(.+)/i);
            const quotedMatch = contentDisposition.match(/filename="(.+?)"/i);
            const unquotedMatch = contentDisposition.match(/filename=([^;]+)/i);

            if (utf8Match && utf8Match[1]) {
                filename = decodeURIComponent(utf8Match[1]);
            } else if (quotedMatch && quotedMatch[1]) {
                filename = quotedMatch[1];
            } else if (unquotedMatch && unquotedMatch[1]) {
                filename = unquotedMatch[1].trim();
            }

            // Limpiar caracteres no deseados y asegurar extensión .pdf
            filename = filename.replace(/['"]/g, '').trim();
            if (!filename.endsWith('.pdf')) {
                filename = filename.replace(/\.pdf_?$/, '') + '.pdf';
            }
        }

        // Crear URL temporal y descargar
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        // Limpiar
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        return true;
    } catch (error) {
        console.error('Error al descargar ticket:', error);
        throw error;
    }
}

/**
 * Actualizar todos los datos desde el backend
 */
async function refreshData() {
    try {
        showMessage('Actualizando datos...', 'info');

        // Cargar datos en paralelo
        await Promise.all([
            loadClientes(),
            loadFacturasPendientes(),
            loadHistorialPagos()
        ]);

        showMessage('Datos actualizados correctamente', 'success');

    } catch (error) {
        console.error('Error al actualizar datos:', error);
        showMessage('Error al actualizar los datos', 'error');
    }
}

/**
 * Configurar todos los event listeners
 */
function setupEventListeners() {
    // Selector de cliente
    document.getElementById('clienteSelect').addEventListener('change', onClienteChange);
    
    // Selector de factura
    document.getElementById('facturaSelect').addEventListener('change', onFacturaChange);
    
    // Método de pago
    document.getElementById('metodoPago').addEventListener('change', onMetodoPagoChange);
    
    // Formulario de pago
    document.getElementById('paymentForm').addEventListener('submit', onPaymentSubmit);
    
    // Botón de refrescar
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshData);
    }
    
    // Filtros de búsqueda
    setupSearchAndFilters();
    
    // Controles de paginación
    setupPaginationControls();
    
    // Cerrar modales
    document.querySelectorAll('.close, .modal-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
}

// ===============================================
// FUNCIONES DE FILTRADO Y PAGINACIÓN
// ===============================================

/**
 * Configurar filtros de búsqueda
 */
function setupSearchAndFilters() {
    const searchInput = document.getElementById('searchPending');
    const projectFilter = document.getElementById('projectFilter');
    const statusFilter = document.getElementById('statusFilter');
    
    // Búsqueda con debounce
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1; // Resetear a primera página
            populatePendingInvoicesTable();
        }, 300);
    });
    
    // Filtros de proyecto y estado
    projectFilter.addEventListener('change', function() {
        currentPage = 1;
        populatePendingInvoicesTable();
    });
    
    statusFilter.addEventListener('change', function() {
        currentPage = 1;
        populatePendingInvoicesTable();
    });
}

/**
 * Aplicar filtros a las facturas
 */
function applyFilters() {
    const searchTerm = document.getElementById('searchPending').value.toLowerCase();
    const selectedProject = document.getElementById('projectFilter').value;
    const selectedStatus = document.getElementById('statusFilter').value;
    
    filteredFacturas = facturasPendientes.filter(factura => {
        const cliente = factura.clienteId;
        
        // Filtro de búsqueda
        const matchesSearch = !searchTerm || 
            (cliente?.nombres || '').toLowerCase().includes(searchTerm) ||
            (cliente?.apellidos || '').toLowerCase().includes(searchTerm) ||
            factura.numeroFactura.toLowerCase().includes(searchTerm) ||
            (cliente?.proyecto || '').toLowerCase().includes(searchTerm);
        
        // Filtro de proyecto
        const matchesProject = !selectedProject || 
            (cliente?.proyecto || '').toLowerCase().includes(selectedProject.toLowerCase());
        
        // Filtro de estado
        let matchesStatus = true;
        if (selectedStatus) {
            switch (selectedStatus) {
                case 'pendiente':
                    matchesStatus = factura.diasMora === 0;
                    break;
                case 'vencida':
                    matchesStatus = factura.diasMora > 0 && factura.diasMora <= 30;
                    break;
                case 'mora':
                    matchesStatus = factura.diasMora > 30;
                    break;
            }
        }
        
        return matchesSearch && matchesProject && matchesStatus;
    });
}

/**
 * Configurar controles de paginación
 */
function setupPaginationControls() {
    // Cambio de tamaño de página
    document.getElementById('pageSizeSelect').addEventListener('change', function() {
        pageSize = parseInt(this.value);
        currentPage = 1;
        populatePendingInvoicesTable();
    });
    
    // Botones de navegación
    document.getElementById('firstPageBtn').addEventListener('click', () => goToPage(1));
    document.getElementById('prevPageBtn').addEventListener('click', () => goToPage(currentPage - 1));
    document.getElementById('nextPageBtn').addEventListener('click', () => goToPage(currentPage + 1));
    document.getElementById('lastPageBtn').addEventListener('click', () => goToPage(totalPages));
}

/**
 * Ir a una página específica
 */
function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    populatePendingInvoicesTable();
}

/**
 * Actualizar controles de paginación
 */
function updatePaginationControls() {
    const paginationContainer = document.getElementById('paginationContainer');
    
    if (totalRecords === 0) {
        paginationContainer.classList.add('hidden');
        return;
    }
    
    paginationContainer.classList.remove('hidden');
    
    // Actualizar información
    const startRecord = Math.min((currentPage - 1) * pageSize + 1, totalRecords);
    const endRecord = Math.min(currentPage * pageSize, totalRecords);
    document.getElementById('paginationInfo').textContent = 
        `Mostrando ${startRecord}-${endRecord} de ${totalRecords} registros`;
    
    // Actualizar botones
    document.getElementById('firstPageBtn').disabled = currentPage === 1;
    document.getElementById('prevPageBtn').disabled = currentPage === 1;
    document.getElementById('nextPageBtn').disabled = currentPage === totalPages;
    document.getElementById('lastPageBtn').disabled = currentPage === totalPages;
    
    // Generar números de página
    generatePageNumbers();
}

/**
 * Generar números de página
 */
function generatePageNumbers() {
    const pageNumbers = document.getElementById('pageNumbers');
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
                    onclick="goToPage(${i})">${i}</button>
        `;
    }
    
    pageNumbers.innerHTML = html;
}

/**
 * Inicializar la aplicación
 */
async function initializeApp() {
    try {
        console.log('Inicializando sistema de pagos...');
        
        // Configurar event listeners
        setupEventListeners();
        
        // Cargar datos desde el backend
        await Promise.all([
            loadClientes(),
            loadFacturasPendientes(),
            loadHistorialPagos()
        ]);
        
        console.log('✅ Sistema de pagos inicializado correctamente');
        showMessage('Sistema de pagos cargado correctamente', 'success');

        // Verificar si mostrar botón de gestión de facturas
        await checkManageInvoicesButton();

    } catch (error) {
        console.error('❌ Error al inicializar la aplicación:', error);
        showMessage('Error al inicializar el sistema de pagos', 'error');
    }
}

/**
 * Verificar si mostrar el botón de gestión de facturas
 */
async function checkManageInvoicesButton() {
    try {
        const response = await apiRequest(`${API_BASE_URL}/facturas/admin/status`);
        const data = await response.json();

        const btnManage = document.getElementById('btnManageInvoices');

        if (data.success && data.data.enabled) {
            // Mostrar el botón si ENABLE_ADMIN_FUNCTIONS está activo
            btnManage.classList.remove('hidden');
        } else {
            // Ocultar el botón
            btnManage.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error al verificar estado admin:', error);
        // En caso de error, ocultar el botón por seguridad
        document.getElementById('btnManageInvoices').classList.add('hidden');
    }
}

