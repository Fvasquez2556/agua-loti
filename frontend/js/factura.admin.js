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

// URLs de la API Admin
const API_ADMIN_BASE = 'http://localhost:5000/api/facturas/admin';

/**
 * Verificar estado de las funciones administrativas al cargar la página
 */
document.addEventListener('DOMContentLoaded', async () => {
    await checkAdminStatus();
    await loadClientesForAdmin();
});

/**
 * Verificar si las funciones administrativas están habilitadas
 */
async function checkAdminStatus() {
    try {
        const response = await apiRequest(`${API_ADMIN_BASE}/status`);
        const data = await response.json();

        const statusEl = document.getElementById('adminStatus');
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
        const statusEl = document.getElementById('adminStatus');
        statusEl.textContent = '❌ Error al verificar estado';
        statusEl.style.color = '#ff6b6b';
    }
}

/**
 * Cargar clientes para los selectores de los modales admin
 */
async function loadClientesForAdmin() {
    try {
        const response = await apiRequest(`${API_CLIENTES_URL}`);
        const data = await response.json();

        if (data.success) {
            const selects = [
                document.getElementById('customClienteId'),
                document.getElementById('batchClienteId')
            ];

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
        const response = await apiRequest(`${API_ADMIN_BASE}/generar-hash`, {
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
        const response = await apiRequest(`${API_ADMIN_BASE}/crear-con-fecha`, {
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
        const searchResponse = await apiRequest(`${API_FACTURAS_URL}?numeroFactura=${facturaNumero}`);
        const searchData = await searchResponse.json();

        if (!searchData.success || !searchData.data || searchData.data.length === 0) {
            showMessage('Factura no encontrada', 'error');
            return;
        }

        const factura = searchData.data[0];
        const facturaId = factura._id;

        // Modificar la fecha
        const response = await apiRequest(`${API_ADMIN_BASE}/${facturaId}/modificar-fecha`, {
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
        const response = await apiRequest(`${API_ADMIN_BASE}/crear-lote-prueba`, {
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
// CERRAR MODALES AL HACER CLICK FUERA
// ============================================

window.onclick = function(event) {
    const modals = [
        'generateHashModal',
        'customInvoiceModal',
        'modifyDateModal',
        'batchModal'
    ];

    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
};
