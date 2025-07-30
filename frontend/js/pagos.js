/**
 * Sistema de Control de Pagos - Lógica Principal
 * Archivo: pagos.js
 */

// Variables globales
let clientes = [];
let facturas = [];
let pagos = [];
let currentSelectedInvoice = null;

/**
 * Funciones utilitarias para mostrar/ocultar elementos
 */
function showElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.remove('hidden');
        element.classList.add('visible');
    }
}

function hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.remove('visible');
        element.classList.add('hidden');
    }
}

function toggleElement(elementId, show) {
    if (show) {
        showElement(elementId);
    } else {
        hideElement(elementId);
    }
}

/**
 * Función para mostrar mensajes al usuario
 * @param {string} text - Texto del mensaje
 * @param {string} type - Tipo de mensaje (success, error, warning)
 */
function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.classList.remove('hidden');
    messageEl.classList.add('visible');
    
    setTimeout(() => {
        messageEl.classList.remove('visible');
        messageEl.classList.add('hidden');
    }, 5000);
}

/**
 * Función para generar ID único
 * @returns {string} ID único generado
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Función para obtener nombre legible del proyecto
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
 * Función para cargar datos desde localStorage
 */
function loadData() {
    // Cargar clientes
    const storedClientes = localStorage.getItem('clientes');
    clientes = storedClientes ? JSON.parse(storedClientes) : [];
    
    // Cargar facturas
    const storedFacturas = localStorage.getItem('facturas');
    facturas = storedFacturas ? JSON.parse(storedFacturas) : [];
    
    // Cargar pagos
    const storedPagos = localStorage.getItem('pagos');
    pagos = storedPagos ? JSON.parse(storedPagos) : [];
    
    // Crear datos de ejemplo si no existen
    if (clientes.length === 0 || facturas.length === 0) {
        createSampleData();
    }
}

/**
 * Función para crear datos de ejemplo
 */
function createSampleData() {
    // Crear clientes de ejemplo si no existen
    if (clientes.length === 0) {
        const sampleClients = [
            {
                id: 'demo1',
                nombres: 'Juan Carlos',
                apellidos: 'García López',
                dpi: '1234567890123',
                contador: 'CTR-001',
                lote: 'LT-001',
                proyecto: 'san-miguel'
            },
            {
                id: 'demo2',
                nombres: 'María Elena',
                apellidos: 'Rodríguez Pérez',
                dpi: '2345678901234',
                contador: 'CTR-002',
                lote: 'LT-002',
                proyecto: 'santa-clara-1'
            },
            {
                id: 'demo3',
                nombres: 'Carlos Antonio',
                apellidos: 'Morales Díaz',
                dpi: '3456789012345',
                contador: 'CTR-003',
                lote: 'LT-003',
                proyecto: 'cabanas-1'
            }
        ];
        
        clientes = sampleClients;
        localStorage.setItem('clientes', JSON.stringify(clientes));
    }
    
    // Crear facturas de ejemplo si no existen
    if (facturas.length === 0) {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        
        const sampleInvoices = [
            {
                id: 'FAC-202412-0001',
                clienteId: 'demo1',
                fecha: lastMonth.toISOString(),
                lecturaAnterior: 100,
                lecturaActual: 125,
                consumo: 25,
                tarifaBase: 15.00,
                precioPorM3: 2.50,
                montoTotal: 77.50,
                periodoInicio: '2024-12-01',
                periodoFin: '2024-12-31',
                fechaLectura: '2024-12-28',
                estado: 'pendiente'
            },
            {
                id: 'FAC-202412-0002',
                clienteId: 'demo2',
                fecha: lastMonth.toISOString(),
                lecturaAnterior: 200,
                lecturaActual: 220,
                consumo: 20,
                tarifaBase: 15.00,
                precioPorM3: 2.50,
                montoTotal: 65.00,
                periodoInicio: '2024-12-01',
                periodoFin: '2024-12-31',
                fechaLectura: '2024-12-28',
                estado: 'pendiente'
            },
            {
                id: 'FAC-202411-0001',
                clienteId: 'demo3',
                fecha: twoMonthsAgo.toISOString(),
                lecturaAnterior: 150,
                lecturaActual: 175,
                consumo: 25,
                tarifaBase: 15.00,
                precioPorM3: 2.50,
                montoTotal: 77.50,
                periodoInicio: '2024-11-01',
                periodoFin: '2024-11-30',
                fechaLectura: '2024-11-28',
                estado: 'pendiente'
            },
            {
                id: 'FAC-202410-0001',
                clienteId: 'demo1',
                fecha: new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString(),
                lecturaAnterior: 75,
                lecturaActual: 100,
                consumo: 25,
                tarifaBase: 15.00,
                precioPorM3: 2.50,
                montoTotal: 77.50,
                periodoInicio: '2024-10-01',
                periodoFin: '2024-10-31',
                fechaLectura: '2024-10-28',
                estado: 'pagada'
            }
        ];
        
        facturas = sampleInvoices;
        localStorage.setItem('facturas', JSON.stringify(facturas));
    }
}

/**
 * Función para cargar clientes en el select
 */
function loadClientesSelect() {
    const select = document.getElementById('clienteSelect');
    select.innerHTML = '<option value="">Seleccione un cliente</option>';
    
    clientes.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente.id;
        option.textContent = `${cliente.nombres} ${cliente.apellidos} - ${cliente.contador}`;
        select.appendChild(option);
    });
}

/**
 * Función para manejar el cambio de cliente seleccionado
 */
function handleClientChange() {
    const clienteId = document.getElementById('clienteSelect').value;
    const pendingSection = document.getElementById('pendingInvoicesSection');
    const facturaSelect = document.getElementById('facturaSelect');
    
    if (!clienteId) {
        hideElement('pendingInvoicesSection');
        hideInvoiceInfo();
        return;
    }
    
    // Mostrar sección de facturas pendientes
    showElement('pendingInvoicesSection');
    
    // Cargar facturas pendientes del cliente
    const facturasPendientes = facturas.filter(f => 
        f.clienteId === clienteId && f.estado === 'pendiente'
    );
    
    facturaSelect.innerHTML = '<option value="">Seleccione una factura</option>';
    
    if (facturasPendientes.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No hay facturas pendientes';
        option.disabled = true;
        facturaSelect.appendChild(option);
        return;
    }
    
    facturasPendientes.forEach(factura => {
        const option = document.createElement('option');
        option.value = factura.id;
        const fechaFactura = new Date(factura.fecha).toLocaleDateString('es-GT');
        option.textContent = `${factura.id} - ${fechaFactura} - Q${factura.montoTotal.toFixed(2)}`;
        facturaSelect.appendChild(option);
    });
}

/**
 * Función para manejar el cambio de factura seleccionada
 */
function handleInvoiceChange() {
    const facturaId = document.getElementById('facturaSelect').value;
    
    if (!facturaId) {
        hideInvoiceInfo();
        return;
    }
    
    const factura = facturas.find(f => f.id === facturaId);
    if (!factura) return;
    
    currentSelectedInvoice = factura;
    showInvoiceInfo(factura);
}

/**
 * Función para mostrar información de la factura seleccionada
 * @param {Object} factura - Objeto de la factura
 */
function showInvoiceInfo(factura) {
    // Calcular monto pendiente (total - pagos realizados)
    const pagosRealizados = pagos
        .filter(p => p.facturaId === factura.id && p.estado === 'completado')
        .reduce((sum, p) => sum + p.monto, 0);
    
    const montoPendiente = factura.montoTotal - pagosRealizados;
    
    // Llenar campos de información
    document.getElementById('facturaNumero').value = factura.id;
    document.getElementById('facturaFecha').value = new Date(factura.fecha).toLocaleDateString('es-GT');
    document.getElementById('montoTotal').value = `Q ${factura.montoTotal.toFixed(2)}`;
    document.getElementById('montoPendiente').value = `Q ${montoPendiente.toFixed(2)}`;
    
    // Establecer el monto máximo de pago
    document.getElementById('montoPago').max = montoPendiente;
    document.getElementById('montoPago').value = montoPendiente.toFixed(2);
    
    // Mostrar secciones
    showElement('invoiceInfo');
    showElement('paymentDetails');
    
    // Establecer fecha actual como fecha de pago
    document.getElementById('fechaPago').valueAsDate = new Date();
}

/**
 * Función para ocultar información de la factura
 */
function hideInvoiceInfo() {
    hideElement('invoiceInfo');
    hideElement('paymentDetails');
    currentSelectedInvoice = null;
}

/**
 * Función para manejar el envío del formulario de pago
 * @param {Event} e - Evento de envío del formulario
 */
function handlePaymentSubmit(e) {
    e.preventDefault();
    
    if (!currentSelectedInvoice) {
        showMessage('Por favor seleccione una factura', 'error');
        return;
    }
    
    const formData = new FormData(e.target);
    const paymentData = Object.fromEntries(formData);
    
    // Validaciones
    const montoPago = parseFloat(paymentData.montoPago);
    const montoPendiente = parseFloat(document.getElementById('montoPago').max);
    
    if (montoPago <= 0) {
        showMessage('El monto del pago debe ser mayor a 0', 'error');
        return;
    }
    
    if (montoPago > montoPendiente) {
        showMessage('El monto del pago no puede ser mayor al monto pendiente', 'error');
        return;
    }
    
    // Crear registro de pago
    const nuevoPago = {
        id: generateId(),
        facturaId: currentSelectedInvoice.id,
        clienteId: currentSelectedInvoice.clienteId,
        monto: montoPago,
        fechaPago: paymentData.fechaPago,
        metodoPago: paymentData.metodoPago,
        referencia: paymentData.referencia || '',
        observaciones: paymentData.observaciones || '',
        estado: 'completado',
        fechaRegistro: new Date().toISOString()
    };
    
    // Agregar pago al array
    pagos.push(nuevoPago);
    
    // Actualizar estado de la factura si está completamente pagada
    const totalPagado = pagos
        .filter(p => p.facturaId === currentSelectedInvoice.id && p.estado === 'completado')
        .reduce((sum, p) => sum + p.monto, 0);
    
    if (totalPagado >= currentSelectedInvoice.montoTotal) {
        const facturaIndex = facturas.findIndex(f => f.id === currentSelectedInvoice.id);
        if (facturaIndex !== -1) {
            facturas[facturaIndex].estado = 'pagada';
        }
    }
    
    // Guardar en localStorage
    localStorage.setItem('pagos', JSON.stringify(pagos));
    localStorage.setItem('facturas', JSON.stringify(facturas));
    
    showMessage('Pago registrado exitosamente', 'success');
    
    // Limpiar formulario y recargar datos
    e.target.reset();
    hideInvoiceInfo();
    document.getElementById('clienteSelect').value = '';
    hideElement('pendingInvoicesSection');
    
    // Actualizar tablas
    renderPendingInvoices();
    renderPaymentHistory();
    updateSummary();
}

/**
 * Función para calcular días vencidos
 * @param {string} fechaFactura - Fecha de la factura
 * @returns {number} Días vencidos (negativo si no está vencida)
 */
function calculateOverdueDays(fechaFactura) {
    const facturaDate = new Date(fechaFactura);
    const dueDate = new Date(facturaDate);
    dueDate.setDate(dueDate.getDate() + 30); // 30 días para pagar
    
    const today = new Date();
    const diffTime = today - dueDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Función para renderizar facturas pendientes
 * @param {Array} filteredInvoices - Facturas filtradas (opcional)
 */
function renderPendingInvoices(filteredInvoices = null) {
    const tbody = document.getElementById('pendingTableBody');
    
    // Obtener facturas pendientes
    let pendingInvoices = facturas.filter(f => f.estado === 'pendiente');
    
    if (filteredInvoices) {
        pendingInvoices = filteredInvoices;
    }
    
    if (pendingInvoices.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 30px; color: #666;">
                    No hay facturas pendientes
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = pendingInvoices.map(factura => {
        const cliente = clientes.find(c => c.id === factura.clienteId);
        const fechaFactura = new Date(factura.fecha).toLocaleDateString('es-GT');
        const fechaVencimiento = new Date(factura.fecha);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
        const fechaVencimientoStr = fechaVencimiento.toLocaleDateString('es-GT');
        
        const diasVencidos = calculateOverdueDays(factura.fecha);
        const isOverdue = diasVencidos > 0;
        
        // Calcular monto pendiente
        const pagosRealizados = pagos
            .filter(p => p.facturaId === factura.id && p.estado === 'completado')
            .reduce((sum, p) => sum + p.monto, 0);
        const montoPendiente = factura.montoTotal - pagosRealizados;
        
        return `
            <tr class="${isOverdue ? 'overdue' : ''}">
                <td>${cliente ? `${cliente.nombres} ${cliente.apellidos}` : 'Cliente no encontrado'}</td>
                <td>${factura.id}</td>
                <td>${fechaFactura}</td>
                <td>${fechaVencimientoStr}</td>
                <td>Q ${montoPendiente.toFixed(2)}</td>
                <td>${isOverdue ? diasVencidos : 0} días</td>
                <td>
                    <span class="status-badge ${isOverdue ? 'vencida' : 'pendiente'}">
                        ${isOverdue ? 'Vencida' : 'Pendiente'}
                    </span>
                </td>
                <td>
                    <button class="actions-btn pay" onclick="quickPay('${factura.id}')">
                        💰 Pagar
                    </button>
                    <button class="actions-btn view" onclick="viewInvoiceDetails('${factura.id}')">
                        👁️ Ver
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Función para renderizar historial de pagos
 * @param {Array} filteredPayments - Pagos filtrados (opcional)
 */
function renderPaymentHistory(filteredPayments = null) {
    const tbody = document.getElementById('paymentsTableBody');
    
    let paymentsToShow = [...pagos].sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));
    
    if (filteredPayments) {
        paymentsToShow = filteredPayments;
    }
    
    if (paymentsToShow.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 30px; color: #666;">
                    No hay pagos registrados
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = paymentsToShow.map(pago => {
        const cliente = clientes.find(c => c.id === pago.clienteId);
        const fechaPago = new Date(pago.fechaPago).toLocaleDateString('es-GT');
        
        return `
            <tr>
                <td>${fechaPago}</td>
                <td>${cliente ? `${cliente.nombres} ${cliente.apellidos}` : 'Cliente no encontrado'}</td>
                <td>${pago.facturaId}</td>
                <td>Q ${pago.monto.toFixed(2)}</td>
                <td>${pago.metodoPago}</td>
                <td>${pago.referencia || '-'}</td>
                <td>
                    <span class="status-badge ${pago.estado}">
                        ${pago.estado === 'completado' ? 'Completado' : 'Pendiente'}
                    </span>
                </td>
                <td>
                    <button class="actions-btn view" onclick="viewPaymentDetails('${pago.id}')">
                        👁️ Ver
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Función para actualizar el resumen de pendientes
 */
function updateSummary() {
    const facturasPendientes = facturas.filter(f => f.estado === 'pendiente');
    const totalPendiente = facturasPendientes.reduce((sum, f) => {
        const pagosRealizados = pagos
            .filter(p => p.facturaId === f.id && p.estado === 'completado')
            .reduce((sumPagos, p) => sumPagos + p.monto, 0);
        return sum + (f.montoTotal - pagosRealizados);
    }, 0);
    
    const facturasVencidas = facturasPendientes.filter(f => 
        calculateOverdueDays(f.fecha) > 0
    ).length;
    
    document.getElementById('totalPendingCount').textContent = facturasPendientes.length;
    document.getElementById('totalPendingAmount').textContent = `Q ${totalPendiente.toFixed(2)}`;
    document.getElementById('overdueCount').textContent = facturasVencidas;
}

/**
 * Función para pago rápido
 * @param {string} facturaId - ID de la factura
 */
function quickPay(facturaId) {
    const factura = facturas.find(f => f.id === facturaId);
    if (!factura) return;
    
    const cliente = clientes.find(c => c.id === factura.clienteId);
    
    // Llenar formulario automáticamente
    document.getElementById('clienteSelect').value = factura.clienteId;
    handleClientChange();
    
    setTimeout(() => {
        document.getElementById('facturaSelect').value = facturaId;
        handleInvoiceChange();
        
        // Scroll al formulario
        document.querySelector('.payment-form-section').scrollIntoView({ 
            behavior: 'smooth' 
        });
    }, 100);
}

/**
 * Función para ver detalles de factura
 * @param {string} facturaId - ID de la factura
 */
function viewInvoiceDetails(facturaId) {
    const factura = facturas.find(f => f.id === facturaId);
    if (!factura) return;
    
    const cliente = clientes.find(c => c.id === factura.clienteId);
    
    alert(`
Detalles de Factura
─────────────────────
No. Factura: ${factura.id}
Cliente: ${cliente ? `${cliente.nombres} ${cliente.apellidos}` : 'No encontrado'}
Fecha: ${new Date(factura.fecha).toLocaleDateString('es-GT')}
Consumo: ${factura.consumo} m³
Monto Total: Q ${factura.montoTotal.toFixed(2)}
Estado: ${factura.estado}
    `);
}

/**
 * Función para ver detalles de pago
 * @param {string} pagoId - ID del pago
 */
function viewPaymentDetails(pagoId) {
    const pago = pagos.find(p => p.id === pagoId);
    if (!pago) return;
    
    const cliente = clientes.find(c => c.id === pago.clienteId);
    
    const modalContent = `
        <div style="line-height: 1.6;">
            <h4 style="color: #45b7d1; margin-bottom: 15px;">Información del Pago</h4>
            <p><strong>Cliente:</strong> ${cliente ? `${cliente.nombres} ${cliente.apellidos}` : 'No encontrado'}</p>
            <p><strong>No. Factura:</strong> ${pago.facturaId}</p>
            <p><strong>Monto:</strong> Q ${pago.monto.toFixed(2)}</p>
            <p><strong>Fecha de Pago:</strong> ${new Date(pago.fechaPago).toLocaleDateString('es-GT')}</p>
            <p><strong>Método:</strong> ${pago.metodoPago}</p>
            <p><strong>Referencia:</strong> ${pago.referencia || 'N/A'}</p>
            <p><strong>Estado:</strong> ${pago.estado}</p>
            ${pago.observaciones ? `<p><strong>Observaciones:</strong> ${pago.observaciones}</p>` : ''}
            <p><strong>Registrado:</strong> ${new Date(pago.fechaRegistro).toLocaleString('es-GT')}</p>
        </div>
    `;
    
    document.getElementById('paymentDetails-modal').innerHTML = modalContent;
    showElement('paymentModal');
}

/**
 * Función para manejar búsqueda en facturas pendientes
 * @param {Event} e - Evento de input
 */
function handleSearchPending(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    if (!searchTerm) {
        renderPendingInvoices();
        return;
    }
    
    const filtered = facturas.filter(factura => {
        if (factura.estado !== 'pendiente') return false;
        
        const cliente = clientes.find(c => c.id === factura.clienteId);
        const clienteNombre = cliente ? `${cliente.nombres} ${cliente.apellidos}`.toLowerCase() : '';
        const proyecto = cliente ? getProjectName(cliente.proyecto).toLowerCase() : '';
        
        return (
            clienteNombre.includes(searchTerm) ||
            factura.id.toLowerCase().includes(searchTerm) ||
            proyecto.includes(searchTerm)
        );
    });
    
    renderPendingInvoices(filtered);
}

/**
 * Función para manejar búsqueda en historial de pagos
 * @param {Event} e - Evento de input
 */
function handleSearchPayments(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    if (!searchTerm) {
        renderPaymentHistory();
        return;
    }
    
    const filtered = pagos.filter(pago => {
        const cliente = clientes.find(c => c.id === pago.clienteId);
        const clienteNombre = cliente ? `${cliente.nombres} ${cliente.apellidos}`.toLowerCase() : '';
        
        return (
            clienteNombre.includes(searchTerm) ||
            pago.facturaId.toLowerCase().includes(searchTerm) ||
            pago.metodoPago.toLowerCase().includes(searchTerm) ||
            (pago.referencia && pago.referencia.toLowerCase().includes(searchTerm))
        );
    });
    
    renderPaymentHistory(filtered);
}

/**
 * Función para configurar los event listeners
 */
function setupEventListeners() {
    // Event listener para cambio de cliente
    document.getElementById('clienteSelect').addEventListener('change', handleClientChange);
    
    // Event listener para cambio de factura
    document.getElementById('facturaSelect').addEventListener('change', handleInvoiceChange);
    
    // Event listener para envío del formulario de pago
    document.getElementById('paymentForm').addEventListener('submit', handlePaymentSubmit);
    
    // Event listeners para búsqueda
    document.getElementById('searchPending').addEventListener('input', handleSearchPending);
    document.getElementById('searchPayments').addEventListener('input', handleSearchPayments);
    
    // Event listener para cerrar modal
    document.querySelector('.close').addEventListener('click', function() {
        hideElement('paymentModal');
    });
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('paymentModal');
        if (event.target === modal) {
            hideElement('paymentModal');
        }
    });
}

/**
 * Función principal de inicialización
 */
function initializeApp() {
    // Cargar datos
    loadData();
    
    // Cargar clientes en select
    loadClientesSelect();
    
    // Renderizar tablas
    renderPendingInvoices();
    renderPaymentHistory();
    updateSummary();
    
    // Configurar event listeners
    setupEventListeners();
}

// Event Listeners principales
document.addEventListener('DOMContentLoaded', initializeApp);

// Asegurar que la página se cargue correctamente desde arriba
window.addEventListener('load', function() {
    window.scrollTo(0, 0);
});