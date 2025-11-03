/**
 * Sistema de Facturación - Funciones Administrativas
 * Archivo: factura.admin.js
 *
 * Funcionalidades:
 * - Generar hash de contraseña administrativa
 * - Crear facturas con fechas personalizadas
 * - Modificar fechas de vencimiento
 * - Generar lotes de facturas de prueba
 */

// URLs de la API - usar variables existentes si ya están definidas
const ADMIN_API_BASE_URL = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : 'http://localhost:5000/api';
const ADMIN_API_ADMIN_BASE = 'http://localhost:5000/api/facturas/admin';
const ADMIN_API_CLIENTES_URL = typeof API_CLIENTES_URL !== 'undefined' ? API_CLIENTES_URL : 'http://localhost:5000/api/clientes';
const ADMIN_API_FACTURAS_URL = typeof API_FACTURAS_URL !== 'undefined' ? API_FACTURAS_URL : 'http://localhost:5000/api/facturas';

/**
 * Verificar estado de las funciones administrativas al cargar la página
 * Solo se ejecuta si los elementos necesarios existen (solo en factura.html)
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Todas estas funciones ahora verifican internamente si sus elementos existen
    // Así que es seguro llamarlas en cualquier página
    await checkAdminStatus();
    await checkDevModeButton();
    await loadClientesForAdmin();
});

/**
 * Verificar si las funciones administrativas están habilitadas
 */
async function checkAdminStatus() {
    const statusEl = document.getElementById('adminStatus');

    // Si el elemento no existe, salir silenciosamente (no estamos en factura.html)
    if (!statusEl) {
        return;
    }

    try {
        const response = await apiRequest(`${ADMIN_API_ADMIN_BASE}/status`);
        const data = await response.json();

        if (data.success && data.data.enabled) {
            statusEl.textContent = `✅ Habilitadas (${data.data.environment})`;
            statusEl.style.color = '#4CAF50';

            if (data.data.warning) {
                statusEl.textContent += ` - ${data.data.warning}`;
                statusEl.style.color = '#ff6b6b';
            }
        } else {
            statusEl.textContent = '❌ Deshabilitadas';
            statusEl.style.color = '#ff6b6b';
        }
    } catch (error) {
        console.error('Error al verificar estado admin:', error);
        statusEl.textContent = '❌ Error al verificar estado';
        statusEl.style.color = '#ff6b6b';
    }
}

/**
 * Cargar clientes para los selectores de los modales admin
 */
async function loadClientesForAdmin() {
    const selects = [
        document.getElementById('customClienteId'),
        document.getElementById('batchClienteId')
    ];

    // Si ningún selector existe, no hacer nada
    if (!selects.some(s => s !== null)) {
        return;
    }

    try {
        const response = await apiRequest(`${ADMIN_API_CLIENTES_URL}`);
        const data = await response.json();

        if (data.success) {
            selects.forEach(select => {
                if (select) {
                    select.innerHTML = '<option value="">Seleccionar cliente...</option>';
                    data.data.forEach(cliente => {
                        const option = document.createElement('option');
                        option.value = cliente._id;
                        option.textContent = `${cliente.nombres} ${cliente.apellidos} - Contador: ${cliente.contador}`;
                        select.appendChild(option);
                    });
                }
            });
        }
    } catch (error) {
        console.error('Error al cargar clientes:', error);
    }
}

// ============================================
// MODAL: GENERAR HASH DE CONTRASEÑA
// ============================================

function openGenerateHashModal() {
    document.getElementById('generateHashModal').style.display = 'flex';
    document.getElementById('hashResult').classList.add('hidden');
    document.getElementById('adminPassword').value = '';
}

function closeGenerateHashModal() {
    document.getElementById('generateHashModal').style.display = 'none';
}

async function generateHash() {
    const password = document.getElementById('adminPassword').value;

    if (!password) {
        showMessage('Por favor ingresa una contraseña', 'error');
        return;
    }

    if (password.length < 8) {
        showMessage('La contraseña debe tener al menos 8 caracteres', 'error');
        return;
    }

    try {
        const response = await apiRequest(`${ADMIN_API_ADMIN_BASE}/generar-hash`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('hashOutput').value = data.hash;
            document.getElementById('hashResult').classList.remove('hidden');
            showMessage('Hash generado exitosamente. Copia el hash y actualiza tu archivo .env', 'success');
        } else {
            showMessage(data.message || 'Error al generar hash', 'error');
        }
    } catch (error) {
        console.error('Error al generar hash:', error);
        showMessage('Error al conectar con el servidor', 'error');
    }
}

function copyHash() {
    const hashOutput = document.getElementById('hashOutput');
    hashOutput.select();
    document.execCommand('copy');
    showMessage('Hash copiado al portapapeles', 'success');
}

// ============================================
// MODAL: CREAR FACTURA CON FECHA PERSONALIZADA
// ============================================

function openCustomInvoiceModal() {
    document.getElementById('customInvoiceModal').style.display = 'flex';

    // Establecer fecha actual por defecto
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('customFechaEmision').value = today;
    document.getElementById('customFechaLectura').value = today;

    // Calcular período del mes anterior
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);

    document.getElementById('customPeriodoInicio').value = firstDay.toISOString().split('T')[0];
    document.getElementById('customPeriodoFin').value = lastDay.toISOString().split('T')[0];

    // Fecha de vencimiento en 30 días
    const vencimiento = new Date();
    vencimiento.setDate(vencimiento.getDate() + 30);
    document.getElementById('customFechaVencimiento').value = vencimiento.toISOString().split('T')[0];
}

function closeCustomInvoiceModal() {
    document.getElementById('customInvoiceModal').style.display = 'none';
}

function setQuickDate(tipo) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    let emision, vencimiento;

    switch (tipo) {
        case 'vencida30':
            // Factura vencida hace 30 días
            emision = new Date();
            emision.setDate(emision.getDate() - 60); // Emitida hace 60 días
            vencimiento = new Date();
            vencimiento.setDate(vencimiento.getDate() - 30); // Vence hace 30 días
            break;

        case 'vencida60':
            // Factura vencida hace 60 días
            emision = new Date();
            emision.setDate(emision.getDate() - 90);
            vencimiento = new Date();
            vencimiento.setDate(vencimiento.getDate() - 60);
            break;

        case 'venceManana':
            // Factura que vence mañana
            emision = new Date();
            emision.setDate(emision.getDate() - 29); // Emitida hace 29 días
            vencimiento = new Date();
            vencimiento.setDate(vencimiento.getDate() + 1); // Vence mañana
            break;
    }

    document.getElementById('customFechaEmision').value = emision.toISOString().split('T')[0];
    document.getElementById('customFechaVencimiento').value = vencimiento.toISOString().split('T')[0];

    // Ajustar período y fecha de lectura
    const periodoInicio = new Date(emision);
    periodoInicio.setDate(periodoInicio.getDate() - 15);
    const periodoFin = new Date(emision);
    periodoFin.setDate(periodoFin.getDate() - 1);

    document.getElementById('customPeriodoInicio').value = periodoInicio.toISOString().split('T')[0];
    document.getElementById('customPeriodoFin').value = periodoFin.toISOString().split('T')[0];
    document.getElementById('customFechaLectura').value = emision.toISOString().split('T')[0];

    showMessage(`Fechas configuradas para: ${tipo}`, 'info');
}

async function createCustomInvoice() {
    const clienteId = document.getElementById('customClienteId').value;
    const lecturaAnterior = parseInt(document.getElementById('customLecturaAnterior').value);
    const lecturaActual = parseInt(document.getElementById('customLecturaActual').value);
    const fechaEmision = document.getElementById('customFechaEmision').value;
    const fechaVencimiento = document.getElementById('customFechaVencimiento').value;
    const periodoInicio = document.getElementById('customPeriodoInicio').value;
    const periodoFin = document.getElementById('customPeriodoFin').value;
    const fechaLectura = document.getElementById('customFechaLectura').value;

    // Validaciones
    if (!clienteId) {
        showMessage('Por favor selecciona un cliente', 'error');
        return;
    }

    if (lecturaActual < lecturaAnterior) {
        showMessage('La lectura actual no puede ser menor a la anterior', 'error');
        return;
    }

    if (new Date(fechaVencimiento) <= new Date(fechaEmision)) {
        showMessage('La fecha de vencimiento debe ser posterior a la de emisión', 'error');
        return;
    }

    const data = {
        clienteId,
        lecturaAnterior,
        lecturaActual,
        fechaLectura,
        periodoInicio,
        periodoFin,
        fechaEmision,
        fechaVencimiento,
        modoPrueba: true
    };

    try {
        const response = await apiRequest(`${ADMIN_API_ADMIN_BASE}/crear-con-fecha`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showMessage(`Factura creada exitosamente: ${result.data.numeroFactura}`, 'success');
            closeCustomInvoiceModal();

            // Mostrar detalles de la factura
            setTimeout(() => {
                alert(`
Factura Creada Exitosamente

Número: ${result.data.numeroFactura}
Cliente: ${result.data.clienteId?.nombres || 'N/A'}
Monto Total: Q ${result.data.montoTotal}
Fecha Vencimiento: ${new Date(result.data.fechaVencimiento).toLocaleDateString('es-GT')}
Días de Mora: ${result.data.diasMora || 0}
Monto Mora: Q ${result.data.montoMora || 0}

Esta factura está marcada como MODO PRUEBA
                `.trim());
            }, 500);
        } else {
            showMessage(result.message || 'Error al crear factura', 'error');
        }
    } catch (error) {
        console.error('Error al crear factura personalizada:', error);
        showMessage('Error al conectar con el servidor', 'error');
    }
}

// ============================================
// MODAL: MODIFICAR FECHA DE VENCIMIENTO
// ============================================

function openModifyDateModal() {
    document.getElementById('modifyDateModal').style.display = 'flex';
}

function closeModifyDateModal() {
    document.getElementById('modifyDateModal').style.display = 'none';
}

async function modifyInvoiceDate() {
    const facturaNumero = document.getElementById('modifyFacturaId').value.trim();
    const nuevaFecha = document.getElementById('modifyNuevaFecha').value;
    const password = document.getElementById('modifyPassword').value;
    const motivo = document.getElementById('modifyMotivo').value.trim();

    // Validaciones
    if (!facturaNumero || !nuevaFecha || !password || !motivo) {
        showMessage('Por favor completa todos los campos', 'error');
        return;
    }

    try {
        // Primero buscar la factura por número
        const searchResponse = await apiRequest(`${ADMIN_API_FACTURAS_URL}?numeroFactura=${facturaNumero}`);
        const searchData = await searchResponse.json();

        if (!searchData.success || !searchData.data || searchData.data.length === 0) {
            showMessage('Factura no encontrada', 'error');
            return;
        }

        const factura = searchData.data[0];
        const facturaId = factura._id;

        // Modificar la fecha
        const response = await apiRequest(`${ADMIN_API_ADMIN_BASE}/${facturaId}/modificar-fecha`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nuevaFechaVencimiento: nuevaFecha,
                password,
                motivo
            })
        });

        const result = await response.json();

        if (result.success) {
            showMessage('Fecha de vencimiento modificada exitosamente', 'success');
            closeModifyDateModal();

            // Mostrar detalles
            setTimeout(() => {
                alert(`
Fecha Modificada Exitosamente

Factura: ${result.data.numeroFactura}
Fecha Anterior: ${new Date(result.data.fechaAnterior).toLocaleDateString('es-GT')}
Fecha Nueva: ${new Date(result.data.fechaNueva).toLocaleDateString('es-GT')}
Días de Mora: ${result.data.diasMora}
Monto Mora: Q ${result.data.montoMora}
Modificado por: ${result.data.modificadoPor}
Motivo: ${result.data.motivo}
                `.trim());
            }, 500);

            // Limpiar formulario
            document.getElementById('modifyFacturaId').value = '';
            document.getElementById('modifyNuevaFecha').value = '';
            document.getElementById('modifyPassword').value = '';
            document.getElementById('modifyMotivo').value = '';
        } else {
            showMessage(result.message || 'Error al modificar fecha', 'error');
        }
    } catch (error) {
        console.error('Error al modificar fecha:', error);
        showMessage('Error al conectar con el servidor', 'error');
    }
}

// ============================================
// MODAL: GENERAR LOTE DE PRUEBA
// ============================================

function openBatchModal() {
    document.getElementById('batchModal').style.display = 'flex';
}

function closeBatchModal() {
    document.getElementById('batchModal').style.display = 'none';
}

async function generateBatch() {
    const clienteId = document.getElementById('batchClienteId').value;
    const cantidad = parseInt(document.getElementById('batchCantidad').value);

    if (!clienteId) {
        showMessage('Por favor selecciona un cliente', 'error');
        return;
    }

    if (!cantidad || cantidad < 1 || cantidad > 10) {
        showMessage('La cantidad debe estar entre 1 y 10', 'error');
        return;
    }

    try {
        const response = await apiRequest(`${ADMIN_API_ADMIN_BASE}/crear-lote-prueba`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clienteId,
                cantidadFacturas: cantidad
            })
        });

        const result = await response.json();

        if (result.success) {
            showMessage(`${cantidad} facturas de prueba creadas exitosamente`, 'success');
            closeBatchModal();

            // Mostrar detalles de las facturas creadas
            setTimeout(() => {
                let detalles = 'Facturas Creadas:\n\n';
                result.data.forEach((factura, index) => {
                    detalles += `${index + 1}. ${factura.numeroFactura}\n`;
                    detalles += `   Vencimiento: ${new Date(factura.fechaVencimiento).toLocaleDateString('es-GT')}\n`;
                    detalles += `   Mora: ${factura.diasMora} días - Q ${factura.montoMora}\n`;
                    detalles += `   Total: Q ${factura.montoTotalConMora}\n\n`;
                });

                alert(detalles);
            }, 500);
        } else {
            showMessage(result.message || 'Error al crear lote de facturas', 'error');
        }
    } catch (error) {
        console.error('Error al generar lote:', error);
        showMessage('Error al conectar con el servidor', 'error');
    }
}

// ============================================
// CONTROLAR BOTÓN DE DESARROLLO
// ============================================

/**
 * Verificar si mostrar el botón de pruebas de desarrollo
 */
async function checkDevModeButton() {
    const devButtonHeader = document.getElementById('devButtonHeader');

    // Si el elemento no existe, salir silenciosamente (no estamos en factura.html)
    if (!devButtonHeader) {
        return;
    }

    try {
        const response = await apiRequest(`${ADMIN_API_ADMIN_BASE}/status`);
        const data = await response.json();

        if (data.success && data.data.enabled) {
            // Mostrar el botón si ENABLE_ADMIN_FUNCTIONS está activo
            devButtonHeader.classList.remove('hidden');
        } else {
            // Ocultar el botón
            devButtonHeader.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error al verificar modo desarrollo:', error);
        // En caso de error, ocultar el botón por seguridad
        devButtonHeader.classList.add('hidden');
    }
}

/**
 * Abrir modal de pruebas de desarrollo
 */
function openDevModal() {
    document.getElementById('devModal').style.display = 'flex';
    // Actualizar estado en el modal
    const adminStatus = document.getElementById('adminStatus').textContent;
    document.getElementById('adminStatusModal').textContent = adminStatus;
    document.getElementById('adminStatusModal').style.color = document.getElementById('adminStatus').style.color;
}

/**
 * Cerrar modal de pruebas de desarrollo
 */
function closeDevModal() {
    document.getElementById('devModal').style.display = 'none';
}

// ============================================
// GESTIONAR FACTURAS DEL CLIENTE
// ============================================

let selectedClient = null;
let clientInvoices = [];
let selectedInvoices = [];

/**
 * Abrir modal de gestionar facturas
 */
function openManageInvoicesModal() {
    document.getElementById('manageInvoicesModal').style.display = 'flex';
    document.getElementById('manageClientSearch').value = '';
    document.getElementById('manageSearchResults').classList.add('hidden');
    document.getElementById('manageClientInfo').classList.add('hidden');
    document.getElementById('manageInvoicesTable').classList.add('hidden');
    document.getElementById('manageNoResults').classList.remove('hidden');
    selectedClient = null;
    clientInvoices = [];
    selectedInvoices = [];
}

/**
 * Cerrar modal de gestionar facturas
 */
function closeManageInvoicesModal() {
    document.getElementById('manageInvoicesModal').style.display = 'none';
}

/**
 * Buscar cliente de forma incremental
 */
let searchTimeout = null;
async function searchClientForManage() {
    const searchText = document.getElementById('manageClientSearch').value.trim();

    // Limpiar timeout anterior
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }

    if (searchText.length < 2) {
        document.getElementById('manageSearchResults').classList.add('hidden');
        document.getElementById('manageNoResults').classList.remove('hidden');
        return;
    }

    // Esperar 300ms antes de buscar (debounce)
    searchTimeout = setTimeout(async () => {
        try {
            // Buscar clientes
            const response = await apiRequest(`${ADMIN_API_CLIENTES_URL}?search=${encodeURIComponent(searchText)}`);
            const data = await response.json();

            if (data.success && data.data.length > 0) {
                displaySearchResults(data.data);
            } else {
                document.getElementById('manageSearchResults').innerHTML = '<p style="padding: 16px; text-align: center; color: #999;">No se encontraron clientes</p>';
                document.getElementById('manageSearchResults').classList.remove('hidden');
            }

            document.getElementById('manageNoResults').classList.add('hidden');
        } catch (error) {
            console.error('Error al buscar clientes:', error);
            showMessage('Error al buscar clientes', 'error');
        }
    }, 300);
}

/**
 * Mostrar resultados de búsqueda
 */
function displaySearchResults(clients) {
    const resultsContainer = document.getElementById('manageSearchResults');
    resultsContainer.innerHTML = '';

    clients.forEach(client => {
        const item = document.createElement('div');
        item.className = 'client-result-item';
        item.onclick = () => selectClientForManage(client);

        item.innerHTML = `
            <div class="client-result-name">
                👤 ${client.nombres} ${client.apellidos}
            </div>
            <div class="client-result-details">
                DPI: ${client.dpi} | Contador: ${client.contador} | Proyecto: ${client.proyecto || 'N/A'}
            </div>
        `;

        resultsContainer.appendChild(item);
    });

    resultsContainer.classList.remove('hidden');
}

/**
 * Seleccionar cliente y cargar sus facturas
 */
async function selectClientForManage(client) {
    selectedClient = client;

    // Mostrar información del cliente
    const clientDetails = document.getElementById('manageClientDetails');
    clientDetails.innerHTML = `
        <p><strong>Nombre:</strong> ${client.nombres} ${client.apellidos}</p>
        <p><strong>DPI:</strong> ${client.dpi}</p>
        <p><strong>Contador:</strong> ${client.contador}</p>
        <p><strong>Proyecto:</strong> ${client.proyecto || 'N/A'}</p>
        <p><strong>Lote:</strong> ${client.lote || 'N/A'}</p>
    `;

    document.getElementById('manageClientInfo').classList.remove('hidden');
    document.getElementById('manageSearchResults').classList.add('hidden');

    // Cargar facturas del cliente
    await loadClientInvoices(client._id);
}

/**
 * Cargar facturas del cliente
 */
async function loadClientInvoices(clientId) {
    try {
        const response = await apiRequest(`${ADMIN_API_FACTURAS_URL}?clienteId=${clientId}`);
        const data = await response.json();

        if (data.success) {
            clientInvoices = data.data;
            displayInvoicesTable(clientInvoices);
            document.getElementById('manageInvoicesTable').classList.remove('hidden');
            document.getElementById('manageNoResults').classList.add('hidden');
        } else {
            showMessage('Error al cargar facturas', 'error');
        }
    } catch (error) {
        console.error('Error al cargar facturas:', error);
        showMessage('Error al cargar facturas del cliente', 'error');
    }
}

/**
 * Mostrar tabla de facturas
 */
function displayInvoicesTable(invoices) {
    const tbody = document.getElementById('invoicesTableBody');
    tbody.innerHTML = '';

    if (invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: #999;">Este cliente no tiene facturas registradas</td></tr>';
        return;
    }

    invoices.forEach(factura => {
        const tr = document.createElement('tr');
        tr.dataset.invoiceId = factura._id;

        // Determinar estado
        let estado = factura.estado;
        if (factura.estado === 'pendiente') {
            const vencimiento = new Date(factura.fechaVencimiento);
            const hoy = new Date();
            if (vencimiento < hoy) {
                estado = 'vencida';
            }
        }

        tr.innerHTML = `
            <td>
                <input type="checkbox" class="invoice-checkbox" data-invoice-id="${factura._id}" onchange="updateSelectedCount()">
            </td>
            <td>${factura.numeroFactura}</td>
            <td>${new Date(factura.fechaEmision).toLocaleDateString('es-GT')}</td>
            <td>${new Date(factura.fechaVencimiento).toLocaleDateString('es-GT')}</td>
            <td><span class="invoice-status ${estado}">${estado}</span></td>
            <td>Q ${factura.montoTotal.toFixed(2)}</td>
            <td>${factura.montoMora ? 'Q ' + factura.montoMora.toFixed(2) : 'Q 0.00'}</td>
            <td>${factura.tipoFactura === 'reconexion' ? 'Reconexión' : 'Normal'}</td>
        `;

        tbody.appendChild(tr);
    });

    updateSelectedCount();
}

/**
 * Seleccionar/deseleccionar todas las facturas
 */
function toggleSelectAll() {
    const selectAll = document.getElementById('selectAllInvoices').checked;
    const checkboxes = document.querySelectorAll('.invoice-checkbox');

    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll;
    });

    updateSelectedCount();
}

/**
 * Actualizar contador de facturas seleccionadas
 */
function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('.invoice-checkbox:checked');
    const count = checkboxes.length;

    document.getElementById('selectedCount').textContent = `${count} seleccionadas`;
    document.getElementById('deleteCount').textContent = count;

    // Habilitar/deshabilitar botón de eliminar
    const btnDelete = document.getElementById('btnDeleteSelected');
    btnDelete.disabled = count === 0;

    // Resaltar filas seleccionadas
    document.querySelectorAll('.invoice-checkbox').forEach(checkbox => {
        const row = checkbox.closest('tr');
        if (checkbox.checked) {
            row.classList.add('selected');
        } else {
            row.classList.remove('selected');
        }
    });

    // Actualizar estado del checkbox "Seleccionar todas"
    const totalCheckboxes = document.querySelectorAll('.invoice-checkbox').length;
    const selectAllCheckbox = document.getElementById('selectAllInvoices');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = count > 0 && count === totalCheckboxes;
    }
}

/**
 * Confirmar eliminación (1ra confirmación)
 */
function confirmDeleteInvoices() {
    const checkboxes = document.querySelectorAll('.invoice-checkbox:checked');

    if (checkboxes.length === 0) {
        showMessage('Selecciona al menos una factura', 'warning');
        return;
    }

    // Obtener información de las facturas seleccionadas
    selectedInvoices = [];
    checkboxes.forEach(checkbox => {
        const invoiceId = checkbox.dataset.invoiceId;
        const invoice = clientInvoices.find(inv => inv._id === invoiceId);
        if (invoice) {
            selectedInvoices.push(invoice);
        }
    });

    // Mostrar detalles en la confirmación
    const details = document.getElementById('deleteConfirmDetails');
    details.innerHTML = `
        <p><strong>Cliente:</strong> ${selectedClient.nombres} ${selectedClient.apellidos}</p>
        <p><strong>Facturas a eliminar:</strong> ${selectedInvoices.length}</p>
        <ul>
            ${selectedInvoices.slice(0, 5).map(inv => `<li>${inv.numeroFactura} - Q ${inv.montoTotal.toFixed(2)}</li>`).join('')}
            ${selectedInvoices.length > 5 ? `<li>... y ${selectedInvoices.length - 5} más</li>` : ''}
        </ul>
    `;

    // Mostrar modal de confirmación
    document.getElementById('deleteConfirmModal1').style.display = 'flex';
}

/**
 * Cerrar modal de confirmación 1
 */
function closeDeleteConfirmModal1() {
    document.getElementById('deleteConfirmModal1').style.display = 'none';
}

/**
 * Mostrar segunda confirmación
 */
function showDeleteConfirmModal2() {
    document.getElementById('deleteConfirmModal1').style.display = 'none';
    document.getElementById('finalDeleteCount').textContent = selectedInvoices.length;
    document.getElementById('deletePassword').value = '';
    document.getElementById('deleteMotivo').value = '';
    document.getElementById('deleteConfirmModal2').style.display = 'flex';
}

/**
 * Cerrar modal de confirmación 2
 */
function closeDeleteConfirmModal2() {
    document.getElementById('deleteConfirmModal2').style.display = 'none';
}

/**
 * Ejecutar eliminación de facturas
 */
async function executeDeleteInvoices() {
    const password = document.getElementById('deletePassword').value.trim();
    const motivo = document.getElementById('deleteMotivo').value.trim();

    // Validaciones
    if (!password) {
        showMessage('Ingresa la contraseña administrativa', 'error');
        return;
    }

    if (!motivo) {
        showMessage('Ingresa el motivo de la eliminación', 'error');
        return;
    }

    if (selectedInvoices.length === 0) {
        showMessage('No hay facturas seleccionadas', 'error');
        return;
    }

    try {
        const invoicesIds = selectedInvoices.map(inv => inv._id);

        const response = await apiRequest(`${ADMIN_API_ADMIN_BASE}/eliminar-selectivas`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clienteId: selectedClient._id,
                facturasIds: invoicesIds,
                password: password,
                motivo: motivo
            })
        });

        const result = await response.json();

        if (result.success) {
            showMessage(`${result.data.cantidadEliminada} facturas eliminadas exitosamente`, 'success');

            // Cerrar modales
            closeDeleteConfirmModal2();

            // Recargar facturas del cliente
            await loadClientInvoices(selectedClient._id);

            // Limpiar selección
            selectedInvoices = [];
            updateSelectedCount();

            // Actualizar estadísticas del dashboard en tiempo real
            if (typeof window.refreshDashboardStats === 'function') {
                window.refreshDashboardStats();
            }

            // Mostrar mensaje de éxito
            setTimeout(() => {
                alert(`
✅ Eliminación Exitosa

Facturas eliminadas: ${result.data.cantidadEliminada}
Cliente: ${selectedClient.nombres} ${selectedClient.apellidos}
Motivo: ${motivo}

Esta acción ha sido registrada en el sistema de auditoría.
                `.trim());
            }, 500);
        } else {
            showMessage(result.message || 'Error al eliminar facturas', 'error');
        }
    } catch (error) {
        console.error('Error al eliminar facturas:', error);
        showMessage('Error al conectar con el servidor', 'error');
    }
}

// ============================================
// GESTIONAR PAGOS DEL CLIENTE
// ============================================

let selectedClientForPayments = null;
let clientPayments = [];
let selectedPayments = [];

/**
 * Abrir modal de gestión de pagos
 */
function openManagePaymentsModal() {
    document.getElementById('managePaymentsModal').style.display = 'flex';
    document.getElementById('searchClientForPayments').value = '';
    document.getElementById('paymentSearchResults').innerHTML = '';
    document.getElementById('paymentClientInfo').classList.add('hidden');
    document.getElementById('paymentsTableSection').classList.add('hidden');
    selectedClientForPayments = null;
    clientPayments = [];
    selectedPayments = [];
}

/**
 * Cerrar modal de gestión de pagos
 */
function closeManagePaymentsModal() {
    document.getElementById('managePaymentsModal').style.display = 'none';
}

/**
 * Buscar cliente para gestión de pagos
 */
async function searchClientForPayments() {
    const searchText = document.getElementById('searchClientForPayments').value.trim();
    const resultsDiv = document.getElementById('paymentSearchResults');

    if (searchText.length < 2) {
        resultsDiv.innerHTML = '';
        return;
    }

    try {
        const response = await apiRequest(`${ADMIN_API_CLIENTES_URL}?search=${encodeURIComponent(searchText)}`);
        const data = await response.json();

        if (data.success && data.data.length > 0) {
            resultsDiv.innerHTML = data.data.map(cliente => `
                <div class="search-result-item" onclick="selectClientForPayments('${cliente._id}')">
                    <strong>${cliente.nombres} ${cliente.apellidos}</strong>
                    <small>DPI: ${cliente.dpi} | Contador: ${cliente.contador}</small>
                </div>
            `).join('');
        } else {
            resultsDiv.innerHTML = '<div class="search-no-results">No se encontraron clientes</div>';
        }
    } catch (error) {
        console.error('Error al buscar clientes:', error);
        resultsDiv.innerHTML = '<div class="search-error">Error al buscar clientes</div>';
    }
}

/**
 * Seleccionar cliente y cargar sus pagos
 */
async function selectClientForPayments(clienteId) {
    try {
        // Obtener información del cliente
        const clienteResponse = await apiRequest(`${ADMIN_API_CLIENTES_URL}/${clienteId}`);
        const clienteData = await clienteResponse.json();

        if (!clienteData.success) {
            throw new Error('No se pudo obtener información del cliente');
        }

        selectedClientForPayments = clienteData.data;

        // Mostrar información del cliente
        document.getElementById('paymentClientName').textContent = `${selectedClientForPayments.nombres} ${selectedClientForPayments.apellidos}`;
        document.getElementById('paymentClientDPI').textContent = selectedClientForPayments.dpi;
        document.getElementById('paymentClientCounter').textContent = selectedClientForPayments.contador;
        document.getElementById('paymentClientInfo').classList.remove('hidden');
        document.getElementById('paymentSearchResults').innerHTML = '';

        // Cargar pagos del cliente
        await loadClientPayments(clienteId);

    } catch (error) {
        console.error('Error al seleccionar cliente:', error);
        showMessage('Error al cargar información del cliente', 'error');
    }
}

/**
 * Cargar pagos del cliente
 */
async function loadClientPayments(clienteId) {
    try {
        const response = await apiRequest(`${API_BASE_URL}/pagos?clienteId=${clienteId}`);
        const data = await response.json();

        if (data.success) {
            clientPayments = data.data;
            displayPaymentsTable();
            document.getElementById('paymentsTableSection').classList.remove('hidden');
        } else {
            throw new Error(data.message || 'Error al cargar pagos');
        }
    } catch (error) {
        console.error('Error al cargar pagos:', error);
        showMessage('Error al cargar pagos del cliente', 'error');
    }
}

/**
 * Mostrar tabla de pagos
 */
function displayPaymentsTable() {
    const tbody = document.getElementById('paymentsTableBody');

    if (clientPayments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay pagos registrados para este cliente</td></tr>';
        return;
    }

    tbody.innerHTML = clientPayments.map(pago => {
        const isCertified = pago.fel?.generado === true;
        const felStatus = isCertified ? '✅ Certificado' : '❌ No certificado';
        const disabledAttr = isCertified ? 'disabled' : '';
        const rowClass = isCertified ? 'disabled-row' : '';

        return `
            <tr class="${rowClass}">
                <td>
                    <input
                        type="checkbox"
                        class="payment-checkbox"
                        data-payment-id="${pago._id}"
                        ${disabledAttr}
                        onchange="updateSelectedPaymentsCount()"
                    >
                </td>
                <td>${pago.numeroPago}</td>
                <td>${pago.facturaSnapshot?.numeroFactura || 'N/A'}</td>
                <td>${new Date(pago.fechaPago).toLocaleDateString('es-GT')}</td>
                <td>Q${pago.montoPagado.toFixed(2)}</td>
                <td>${pago.metodoPago}</td>
                <td>${felStatus}</td>
            </tr>
        `;
    }).join('');

    selectedPayments = [];
    updateSelectedPaymentsCount();
}

/**
 * Marcar/desmarcar todos los pagos
 */
function toggleAllPayments() {
    const selectAllCheckbox = document.getElementById('selectAllPayments');
    const checkboxes = document.querySelectorAll('.payment-checkbox:not([disabled])');

    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });

    updateSelectedPaymentsCount();
}

/**
 * Actualizar contador de pagos seleccionados
 */
function updateSelectedPaymentsCount() {
    const checkboxes = document.querySelectorAll('.payment-checkbox:checked:not([disabled])');
    selectedPayments = Array.from(checkboxes).map(cb => {
        const paymentId = cb.getAttribute('data-payment-id');
        return clientPayments.find(p => p._id === paymentId);
    });

    const count = selectedPayments.length;
    document.getElementById('selectedPaymentsCount').textContent = `${count} seleccionados`;

    const deleteBtn = document.getElementById('btnDeletePayments');
    if (deleteBtn) {
        deleteBtn.disabled = count === 0;
    }
}

/**
 * Confirmar eliminación de pagos (modal 1)
 */
function confirmDeletePayments() {
    if (selectedPayments.length === 0) {
        showMessage('No hay pagos seleccionados', 'error');
        return;
    }

    document.getElementById('paymentsDeleteCount1').textContent = selectedPayments.length;
    document.getElementById('paymentsClientName1').textContent = `${selectedClientForPayments.nombres} ${selectedClientForPayments.apellidos}`;
    document.getElementById('deletePaymentsConfirmModal1').style.display = 'flex';
}

/**
 * Cerrar modal de confirmación 1
 */
function closeDeletePaymentsConfirmModal1() {
    document.getElementById('deletePaymentsConfirmModal1').style.display = 'none';
}

/**
 * Abrir modal de confirmación 2
 */
function openDeletePaymentsConfirmModal2() {
    document.getElementById('finalPaymentsDeleteCount').textContent = selectedPayments.length;
    document.getElementById('deletePaymentsConfirmModal1').style.display = 'none';
    document.getElementById('deletePaymentsPassword').value = '';
    document.getElementById('deletePaymentsMotivo').value = '';
    document.getElementById('deletePaymentsConfirmModal2').style.display = 'flex';
}

/**
 * Cerrar modal de confirmación 2
 */
function closeDeletePaymentsConfirmModal2() {
    document.getElementById('deletePaymentsConfirmModal2').style.display = 'none';
}

/**
 * Ejecutar eliminación de pagos
 */
async function executeDeletePayments() {
    const password = document.getElementById('deletePaymentsPassword').value.trim();
    const motivo = document.getElementById('deletePaymentsMotivo').value.trim();

    if (!password) {
        showMessage('Ingresa la contraseña administrativa', 'error');
        return;
    }

    if (!motivo) {
        showMessage('Ingresa el motivo de la eliminación', 'error');
        return;
    }

    if (selectedPayments.length === 0) {
        showMessage('No hay pagos seleccionados', 'error');
        return;
    }

    try {
        const pagosIds = selectedPayments.map(pago => pago._id);

        const response = await apiRequest(`${ADMIN_API_ADMIN_BASE}/eliminar-pagos-selectivos`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clienteId: selectedClientForPayments._id,
                pagosIds: pagosIds,
                password: password,
                motivo: motivo
            })
        });

        const result = await response.json();

        if (result.success) {
            showMessage(`${result.data.cantidadEliminada} pagos eliminados exitosamente`, 'success');

            // Cerrar modales
            closeDeletePaymentsConfirmModal2();
            closeManagePaymentsModal();

            // Actualizar estadísticas
            if (typeof window.refreshDashboardStats === 'function') {
                window.refreshDashboardStats();
            }

            // Mostrar mensaje de éxito
            setTimeout(() => {
                alert(`
✅ Eliminación Exitosa

Pagos eliminados: ${result.data.cantidadEliminada}
Facturas actualizadas: ${result.data.facturasActualizadas}
Cliente: ${selectedClientForPayments.nombres} ${selectedClientForPayments.apellidos}
Motivo: ${motivo}

Esta acción ha sido registrada en el sistema de auditoría.
                `.trim());
            }, 500);
        } else {
            showMessage(result.message || 'Error al eliminar pagos', 'error');
        }
    } catch (error) {
        console.error('Error al eliminar pagos:', error);
        showMessage('Error al conectar con el servidor', 'error');
    }
}

// ============================================
// ANULAR FACTURA CERTIFICADA FEL
// ============================================

let selectedCertifiedInvoice = null;

/**
 * Abrir modal de anulación de factura certificada
 */
function openCancelCertifiedModal() {
    document.getElementById('cancelCertifiedModal').style.display = 'flex';
    document.getElementById('searchCertifiedInvoice').value = '';
    document.getElementById('certifiedSearchResults').innerHTML = '';
    document.getElementById('certifiedInvoiceInfo').classList.add('hidden');
    document.getElementById('cancelCertifiedForm').classList.add('hidden');
    selectedCertifiedInvoice = null;
}

/**
 * Cerrar modal de anulación
 */
function closeCancelCertifiedModal() {
    document.getElementById('cancelCertifiedModal').style.display = 'none';
}

/**
 * Buscar facturas certificadas
 */
async function searchCertifiedInvoice() {
    const searchText = document.getElementById('searchCertifiedInvoice').value.trim();
    const resultsDiv = document.getElementById('certifiedSearchResults');

    if (searchText.length < 2) {
        resultsDiv.innerHTML = '';
        return;
    }

    try {
        const response = await apiRequest(`${ADMIN_API_FACTURAS_URL}?search=${encodeURIComponent(searchText)}&certified=true`);
        const data = await response.json();

        if (data.success && data.data.length > 0) {
            const certifiedInvoices = data.data.filter(f => f.fel?.certificada === true);

            if (certifiedInvoices.length > 0) {
                resultsDiv.innerHTML = certifiedInvoices.map(factura => `
                    <div class="search-result-item" onclick="selectCertifiedInvoice('${factura._id}')">
                        <strong>${factura.numeroFactura}</strong>
                        <small>Cliente: ${factura.clienteId?.nombres} ${factura.clienteId?.apellidos}</small>
                        <small>UUID: ${factura.fel.uuid || 'N/A'}</small>
                        <small>Monto: Q${factura.montoTotal.toFixed(2)}</small>
                    </div>
                `).join('');
            } else {
                resultsDiv.innerHTML = '<div class="search-no-results">No se encontraron facturas certificadas</div>';
            }
        } else {
            resultsDiv.innerHTML = '<div class="search-no-results">No se encontraron facturas</div>';
        }
    } catch (error) {
        console.error('Error al buscar facturas:', error);
        resultsDiv.innerHTML = '<div class="search-error">Error al buscar facturas</div>';
    }
}

/**
 * Seleccionar factura certificada
 */
async function selectCertifiedInvoice(facturaId) {
    try {
        const response = await apiRequest(`${ADMIN_API_FACTURAS_URL}/${facturaId}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error('No se pudo obtener información de la factura');
        }

        const factura = data.data;

        // Validar que esté certificada
        if (!factura.fel || !factura.fel.certificada) {
            showMessage('Esta factura no está certificada. Use "Gestionar Facturas" para eliminarla.', 'error');
            return;
        }

        // Validar que no esté ya anulada
        if (factura.estado === 'anulada') {
            showMessage('Esta factura ya está anulada', 'warning');
            return;
        }

        selectedCertifiedInvoice = factura;

        // Mostrar información
        document.getElementById('certifiedInvoiceNumber').textContent = factura.numeroFactura;
        document.getElementById('certifiedInvoiceUUID').textContent = factura.fel.uuid || 'N/A';
        document.getElementById('certifiedInvoiceClient').textContent = `${factura.clienteId?.nombres} ${factura.clienteId?.apellidos}`;
        document.getElementById('certifiedInvoiceAmount').textContent = `Q${factura.montoTotal.toFixed(2)}`;
        document.getElementById('certifiedInvoiceDate').textContent = factura.fel.fechaCertificacion
            ? new Date(factura.fel.fechaCertificacion).toLocaleDateString('es-GT')
            : 'N/A';
        document.getElementById('certifiedInvoiceStatus').textContent = factura.estado.toUpperCase();

        document.getElementById('certifiedInvoiceInfo').classList.remove('hidden');
        document.getElementById('cancelCertifiedForm').classList.remove('hidden');
        document.getElementById('certifiedSearchResults').innerHTML = '';

    } catch (error) {
        console.error('Error al seleccionar factura:', error);
        showMessage('Error al cargar información de la factura', 'error');
    }
}

/**
 * Ejecutar anulación de factura certificada
 */
async function executeCancelCertified() {
    const password = document.getElementById('cancelPassword').value.trim();
    const motivo = document.getElementById('cancelMotivo').value.trim();

    if (!password) {
        showMessage('Ingresa la contraseña administrativa', 'error');
        return;
    }

    if (!motivo) {
        showMessage('Ingresa el motivo de la anulación', 'error');
        return;
    }

    if (!selectedCertifiedInvoice) {
        showMessage('No hay factura seleccionada', 'error');
        return;
    }

    try {
        const response = await apiRequest(`${ADMIN_API_ADMIN_BASE}/anular-factura-certificada`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                facturaId: selectedCertifiedInvoice._id,
                password: password,
                motivo: motivo
            })
        });

        const result = await response.json();

        if (result.success) {
            showMessage('Factura anulada exitosamente', 'success');

            // Cerrar modal
            closeCancelCertifiedModal();

            // Actualizar estadísticas
            if (typeof window.refreshDashboardStats === 'function') {
                window.refreshDashboardStats();
            }

            // Mostrar mensaje de éxito con próximos pasos
            setTimeout(() => {
                alert(`
✅ Factura Anulada Exitosamente

Factura: ${result.data.facturaAnulada.numeroFactura}
UUID: ${result.data.facturaAnulada.uuid}
Cliente: ${result.data.cliente.nombres} ${result.data.cliente.apellidos}
Motivo: ${motivo}

📝 PRÓXIMO PASO IMPORTANTE:
Debe generar la Nota de Crédito (NCRE) en el sistema de Infile para completar el proceso de anulación ante SAT.

Esta acción ha sido registrada en el sistema de auditoría.
                `.trim());
            }, 500);
        } else {
            showMessage(result.message || 'Error al anular factura', 'error');
        }
    } catch (error) {
        console.error('Error al anular factura:', error);
        showMessage('Error al conectar con el servidor', 'error');
    }
}

// ============================================
// CERRAR MODALES AL HACER CLICK FUERA
// ============================================

window.onclick = function(event) {
    const modals = [
        'generateHashModal',
        'customInvoiceModal',
        'modifyDateModal',
        'batchModal',
        'devModal',
        'manageInvoicesModal',
        'deleteConfirmModal1',
        'deleteConfirmModal2',
        'managePaymentsModal',
        'deletePaymentsConfirmModal1',
        'deletePaymentsConfirmModal2',
        'cancelCertifiedModal'
    ];

    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
};
