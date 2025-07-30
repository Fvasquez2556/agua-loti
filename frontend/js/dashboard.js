/**
 * Sistema de Dashboard y Reportes - Lógica Principal
 * Archivo: dashboard.js
 */

// Variables globales
let clientes = [];
let facturas = [];
let pagos = [];
let lecturas = [];
let chartsInstances = {};

/**
 * Función para cargar todos los datos desde localStorage
 */
function loadAllData() {
    // Cargar datos existentes
    clientes = JSON.parse(localStorage.getItem('clientes') || '[]');
    facturas = JSON.parse(localStorage.getItem('facturas') || '[]');
    pagos = JSON.parse(localStorage.getItem('pagos') || '[]');
    lecturas = JSON.parse(localStorage.getItem('lecturas') || '[]');
    
    // Crear datos de ejemplo si están vacíos
    if (clientes.length === 0 || facturas.length === 0) {
        createSampleData();
    }
}

/**
 * Función para crear datos de ejemplo más completos
 */
function createSampleData() {
    // Crear clientes de ejemplo
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
            },
            {
                id: 'demo4',
                nombres: 'Ana Sofía',
                apellidos: 'Herrera González',
                dpi: '4567890123456',
                contador: 'CTR-004',
                lote: 'LT-004',
                proyecto: 'santa-clara-2'
            },
            {
                id: 'demo5',
                nombres: 'Luis Miguel',
                apellidos: 'Castillo Ruiz',
                dpi: '5678901234567',
                contador: 'CTR-005',
                lote: 'LT-005',
                proyecto: 'cabanas-2'
            }
        ];
        
        clientes = sampleClients;
        localStorage.setItem('clientes', JSON.stringify(clientes));
    }
    
    // Crear facturas de ejemplo con datos más realistas
    if (facturas.length === 0) {
        const now = new Date();
        const sampleInvoices = [];
        
        // Generar facturas para los últimos 6 meses
        for (let mes = 0; mes < 6; mes++) {
            const fechaFactura = new Date(now.getFullYear(), now.getMonth() - mes, 1);
            
            clientes.forEach((cliente, index) => {
                const consumoBase = 15 + Math.random() * 20; // 15-35 m³
                const factura = {
                    id: `FAC-${fechaFactura.getFullYear()}${String(fechaFactura.getMonth() + 1).padStart(2, '0')}-${String(index + 1).padStart(4, '0')}`,
                    clienteId: cliente.id,
                    fecha: fechaFactura.toISOString(),
                    lecturaAnterior: 100 + (mes * 25) + (index * 10),
                    lecturaActual: 100 + (mes * 25) + (index * 10) + consumoBase,
                    consumo: consumoBase,
                    tarifaBase: 15.00,
                    precioPorM3: 2.50,
                    montoTotal: 15.00 + (consumoBase * 2.50),
                    periodoInicio: fechaFactura.toISOString().split('T')[0],
                    periodoFin: new Date(fechaFactura.getFullYear(), fechaFactura.getMonth() + 1, 0).toISOString().split('T')[0],
                    fechaLectura: fechaFactura.toISOString().split('T')[0],
                    estado: mes === 0 ? (Math.random() > 0.7 ? 'pendiente' : 'pagada') : 'pagada'
                };
                sampleInvoices.push(factura);
            });
        }
        
        facturas = sampleInvoices;
        localStorage.setItem('facturas', JSON.stringify(facturas));
    }
    
    // Crear pagos de ejemplo
    if (pagos.length === 0) {
        const samplePayments = [];
        const facturasPagadas = facturas.filter(f => f.estado === 'pagada');
        
        facturasPagadas.forEach(factura => {
            const fechaPago = new Date(factura.fecha);
            fechaPago.setDate(fechaPago.getDate() + Math.floor(Math.random() * 15) + 1);
            
            const pago = {
                id: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                facturaId: factura.id,
                clienteId: factura.clienteId,
                monto: factura.montoTotal,
                fechaPago: fechaPago.toISOString().split('T')[0],
                metodoPago: ['efectivo', 'transferencia', 'deposito'][Math.floor(Math.random() * 3)],
                referencia: `REF-${Math.floor(Math.random() * 10000)}`,
                observaciones: '',
                estado: 'completado',
                fechaRegistro: fechaPago.toISOString()
            };
            samplePayments.push(pago);
        });
        
        pagos = samplePayments;
        localStorage.setItem('pagos', JSON.stringify(pagos));
    }
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
 * Función para calcular días vencidos
 * @param {string} fechaFactura - Fecha de la factura
 * @returns {number} Días vencidos
 */
function calculateOverdueDays(fechaFactura) {
    const facturaDate = new Date(fechaFactura);
    const dueDate = new Date(facturaDate);
    dueDate.setDate(dueDate.getDate() + 30);
    
    const today = new Date();
    const diffTime = today - dueDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Función para actualizar estadísticas principales
 */
function updateMainStats() {
    // Total de clientes
    document.getElementById('totalClientes').textContent = clientes.length;
    
    // Ingresos del mes actual
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const pagosEsteMes = pagos.filter(p => {
        const fechaPago = new Date(p.fechaPago);
        return fechaPago.getMonth() === currentMonth && fechaPago.getFullYear() === currentYear;
    });
    
    const ingresosMes = pagosEsteMes.reduce((sum, p) => sum + p.monto, 0);
    document.getElementById('ingresosMes').textContent = `Q ${ingresosMes.toFixed(2)}`;
    
    // Facturas pendientes
    const facturasPendientes = facturas.filter(f => f.estado === 'pendiente');
    document.getElementById('facturasPendientes').textContent = facturasPendientes.length;
    
    const montoPendiente = facturasPendientes.reduce((sum, f) => sum + f.montoTotal, 0);
    document.getElementById('pendientesChange').textContent = `Q ${montoPendiente.toFixed(2)} por cobrar`;
    
    // Facturas vencidas
    const facturasVencidas = facturasPendientes.filter(f => calculateOverdueDays(f.fecha) > 0);
    document.getElementById('facturasVencidas').textContent = facturasVencidas.length;
    
    const promedioVencimiento = facturasVencidas.length > 0 
        ? facturasVencidas.reduce((sum, f) => sum + calculateOverdueDays(f.fecha), 0) / facturasVencidas.length
        : 0;
    document.getElementById('vencidasChange').textContent = `+${Math.round(promedioVencimiento)} días promedio`;
    
    // Actualizar gráfico de estado de pagos
    updatePaymentStatusChart();
}

/**
 * Función para crear gráfico de ingresos mensuales
 */
function createIngresosChart() {
    const ctx = document.getElementById('ingresosChart').getContext('2d');
    
    // Obtener datos de los últimos 6 meses
    const meses = [];
    const ingresos = [];
    
    for (let i = 5; i >= 0; i--) {
        const fecha = new Date();
        fecha.setMonth(fecha.getMonth() - i);
        
        const nombreMes = fecha.toLocaleDateString('es-GT', { month: 'short', year: '2-digit' });
        meses.push(nombreMes);
        
        const pagosMes = pagos.filter(p => {
            const fechaPago = new Date(p.fechaPago);
            return fechaPago.getMonth() === fecha.getMonth() && 
                   fechaPago.getFullYear() === fecha.getFullYear();
        });
        
        const ingresoMes = pagosMes.reduce((sum, p) => sum + p.monto, 0);
        ingresos.push(ingresoMes);
    }
    
    if (chartsInstances.ingresos) {
        chartsInstances.ingresos.destroy();
    }
    
    chartsInstances.ingresos = new Chart(ctx, {
        type: 'line',
        data: {
            labels: meses,
            datasets: [{
                label: 'Ingresos (Q)',
                data: ingresos,
                borderColor: '#f093fb',
                backgroundColor: 'rgba(240, 147, 251, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'Q ' + value.toFixed(0);
                        }
                    }
                }
            }
        }
    });
}

/**
 * Función para crear gráfico de consumo por proyecto
 */
function createProyectosChart() {
    const ctx = document.getElementById('proyectosChart').getContext('2d');
    
    // Agrupar consumo por proyecto
    const consumoPorProyecto = {};
    
    clientes.forEach(cliente => {
        const proyecto = getProjectName(cliente.proyecto);
        if (!consumoPorProyecto[proyecto]) {
            consumoPorProyecto[proyecto] = 0;
        }
        
        // Sumar consumo del último mes
        const facturasCliente = facturas.filter(f => f.clienteId === cliente.id);
        if (facturasCliente.length > 0) {
            const ultimaFactura = facturasCliente.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
            consumoPorProyecto[proyecto] += ultimaFactura.consumo;
        }
    });
    
    const proyectos = Object.keys(consumoPorProyecto);
    const consumos = Object.values(consumoPorProyecto);
    
    if (chartsInstances.proyectos) {
        chartsInstances.proyectos.destroy();
    }
    
    chartsInstances.proyectos = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: proyectos,
            datasets: [{
                data: consumos,
                backgroundColor: [
                    '#4facfe',
                    '#43e97b',
                    '#fa709a',
                    '#ff6b6b',
                    '#ffa726'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

/**
 * Función para actualizar gráfico de estado de pagos
 */
function updatePaymentStatusChart() {
    const facturasPagadas = facturas.filter(f => f.estado === 'pagada').length;
    const facturasPendientes = facturas.filter(f => f.estado === 'pendiente');
    const facturasVencidas = facturasPendientes.filter(f => calculateOverdueDays(f.fecha) > 0).length;
    const facturasPendientesActual = facturasPendientes.length - facturasVencidas;
    
    document.getElementById('facturasPagadas').textContent = facturasPagadas;
    document.getElementById('facturasPendientesChart').textContent = facturasPendientesActual;
    document.getElementById('facturasVencidasChart').textContent = facturasVencidas;
}

/**
 * Función para generar reportes rápidos
 */
function generateQuickReports() {
    // Top 5 Consumidores
    generateTopConsumidores();
    
    // Clientes Morosos
    generateClientesMorosos();
    
    // Consumo por Proyecto
    generateConsumoPorProyecto();
    
    // Pagos Recientes
    generatePagosRecientes();
}

/**
 * Función para generar top consumidores
 */
function generateTopConsumidores() {
    const consumoPorCliente = {};
    
    clientes.forEach(cliente => {
        const facturasCliente = facturas.filter(f => f.clienteId === cliente.id);
        const consumoTotal = facturasCliente.reduce((sum, f) => sum + f.consumo, 0);
        consumoPorCliente[cliente.id] = {
            nombre: `${cliente.nombres} ${cliente.apellidos}`,
            consumo: consumoTotal,
            contador: cliente.contador
        };
    });
    
    const topConsumidores = Object.values(consumoPorCliente)
        .sort((a, b) => b.consumo - a.consumo)
        .slice(0, 5);
    
    const container = document.getElementById('topConsumidores');
    
    if (topConsumidores.length === 0) {
        container.innerHTML = '<div class="loading">No hay datos disponibles</div>';
        return;
    }
    
    container.innerHTML = topConsumidores.map(cliente => `
        <div class="report-item">
            <div class="report-item-name">${cliente.nombre}</div>
            <div class="report-item-value">${cliente.consumo.toFixed(1)} m³</div>
        </div>
    `).join('');
}

/**
 * Función para generar clientes morosos
 */
function generateClientesMorosos() {
    const facturasPendientes = facturas.filter(f => f.estado === 'pendiente');
    const facturasVencidas = facturasPendientes.filter(f => calculateOverdueDays(f.fecha) > 0);
    
    const clientesMorosos = {};
    
    facturasVencidas.forEach(factura => {
        const cliente = clientes.find(c => c.id === factura.clienteId);
        if (cliente) {
            if (!clientesMorosos[cliente.id]) {
                clientesMorosos[cliente.id] = {
                    nombre: `${cliente.nombres} ${cliente.apellidos}`,
                    contador: cliente.contador,
                    facturas: 0,
                    monto: 0,
                    diasVencido: 0
                };
            }
            
            clientesMorosos[cliente.id].facturas++;
            clientesMorosos[cliente.id].monto += factura.montoTotal;
            const dias = calculateOverdueDays(factura.fecha);
            if (dias > clientesMorosos[cliente.id].diasVencido) {
                clientesMorosos[cliente.id].diasVencido = dias;
            }
        }
    });
    
    const container = document.getElementById('clientesMorosos');
    const morosos = Object.values(clientesMorosos).slice(0, 5);
    
    if (morosos.length === 0) {
        container.innerHTML = '<div class="loading">No hay clientes morosos</div>';
        return;
    }
    
    container.innerHTML = morosos.map(cliente => `
        <div class="report-item">
            <div class="report-item-name">
                ${cliente.nombre}<br>
                <small style="color: #666;">${cliente.facturas} factura(s) - ${cliente.diasVencido} días</small>
            </div>
            <div class="report-item-value">Q ${cliente.monto.toFixed(2)}</div>
        </div>
    `).join('');
}

/**
 * Función para generar consumo por proyecto
 */
function generateConsumoPorProyecto() {
    const consumoPorProyecto = {};
    
    clientes.forEach(cliente => {
        const proyecto = getProjectName(cliente.proyecto);
        if (!consumoPorProyecto[proyecto]) {
            consumoPorProyecto[proyecto] = { consumo: 0, clientes: 0 };
        }
        
        consumoPorProyecto[proyecto].clientes++;
        
        const facturasCliente = facturas.filter(f => f.clienteId === cliente.id);
        const consumoTotal = facturasCliente.reduce((sum, f) => sum + f.consumo, 0);
        consumoPorProyecto[proyecto].consumo += consumoTotal;
    });
    
    const container = document.getElementById('consumoPorProyecto');
    const proyectos = Object.entries(consumoPorProyecto);
    
    if (proyectos.length === 0) {
        container.innerHTML = '<div class="loading">No hay datos disponibles</div>';
        return;
    }
    
    container.innerHTML = proyectos.map(([proyecto, data]) => `
        <div class="report-item">
            <div class="report-item-name">
                ${proyecto}<br>
                <small style="color: #666;">${data.clientes} cliente(s)</small>
            </div>
            <div class="report-item-value">${data.consumo.toFixed(1)} m³</div>
        </div>
    `).join('');
}

/**
 * Función para generar pagos recientes
 */
function generatePagosRecientes() {
    const pagosRecientes = [...pagos]
        .sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro))
        .slice(0, 5);
    
    const container = document.getElementById('pagosRecientes');
    
    if (pagosRecientes.length === 0) {
        container.innerHTML = '<div class="loading">No hay pagos registrados</div>';
        return;
    }
    
    container.innerHTML = pagosRecientes.map(pago => {
        const cliente = clientes.find(c => c.id === pago.clienteId);
        const fechaPago = new Date(pago.fechaPago).toLocaleDateString('es-GT');
        
        return `
            <div class="report-item">
                <div class="report-item-name">
                    ${cliente ? `${cliente.nombres} ${cliente.apellidos}` : 'Cliente no encontrado'}<br>
                    <small style="color: #666;">${fechaPago} - ${pago.metodoPago}</small>
                </div>
                <div class="report-item-value">Q ${pago.monto.toFixed(2)}</div>
            </div>
        `;
    }).join('');
}

/**
 * Función para mostrar/ocultar tabs
 * @param {string} tabName - Nombre del tab a mostrar
 */
function showTab(tabName) {
    // Ocultar todos los tabs
    document.querySelectorAll('.data-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remover clase active de todos los botones
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar tab seleccionado
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    // Activar botón correspondiente
    event.target.classList.add('active');
    
    // Cargar datos del tab
    switch(tabName) {
        case 'clientes':
            loadClientesTab();
            break;
        case 'facturas':
            loadFacturasTab();
            break;
        case 'pagos':
            loadPagosTab();
            break;
    }
}

/**
 * Función para cargar datos en el tab de clientes
 */
function loadClientesTab() {
    const tbody = document.getElementById('clientesTableBody');
    
    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px; color: #666;">No hay clientes registrados</td></tr>';
        return;
    }
    
    tbody.innerHTML = clientes.map(cliente => {
        const facturasCliente = facturas.filter(f => f.clienteId === cliente.id);
        const pagosCliente = pagos.filter(p => p.clienteId === cliente.id);
        
        const totalFacturado = facturasCliente.reduce((sum, f) => sum + f.montoTotal, 0);
        const totalPagado = pagosCliente.reduce((sum, p) => sum + p.monto, 0);
        const pendiente = totalFacturado - totalPagado;
        
        return `
            <tr>
                <td>${cliente.nombres} ${cliente.apellidos}</td>
                <td>${cliente.dpi}</td>
                <td>${cliente.contador}</td>
                <td>${getProjectName(cliente.proyecto)}</td>
                <td>${facturasCliente.length}</td>
                <td>Q ${totalFacturado.toFixed(2)}</td>
                <td>Q ${totalPagado.toFixed(2)}</td>
                <td>Q ${pendiente.toFixed(2)}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Función para cargar datos en el tab de facturas
 */
function loadFacturasTab() {
    const tbody = document.getElementById('facturasTableBody');
    
    if (facturas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px; color: #666;">No hay facturas registradas</td></tr>';
        return;
    }
    
    const facturasOrdenadas = [...facturas].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    tbody.innerHTML = facturasOrdenadas.map(factura => {
        const cliente = clientes.find(c => c.id === factura.clienteId);
        const fechaFactura = new Date(factura.fecha).toLocaleDateString('es-GT');
        const diasVencimiento = factura.estado === 'pendiente' ? calculateOverdueDays(factura.fecha) : 0;
        
        return `
            <tr>
                <td>${factura.id}</td>
                <td>${cliente ? `${cliente.nombres} ${cliente.apellidos}` : 'Cliente no encontrado'}</td>
                <td>${fechaFactura}</td>
                <td>${factura.consumo.toFixed(2)}</td>
                <td>Q ${factura.montoTotal.toFixed(2)}</td>
                <td>
                    <span class="status-badge ${factura.estado}">
                        ${factura.estado === 'pagada' ? 'Pagada' : (diasVencimiento > 0 ? 'Vencida' : 'Pendiente')}
                    </span>
                </td>
                <td>${diasVencimiento > 0 ? `${diasVencimiento} días` : '-'}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Función para cargar datos en el tab de pagos
 */
function loadPagosTab() {
    const tbody = document.getElementById('pagosTableBody');
    
    if (pagos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: #666;">No hay pagos registrados</td></tr>';
        return;
    }
    
    const pagosOrdenados = [...pagos].sort((a, b) => new Date(b.fechaRegistro) - new Date(a.fechaRegistro));
    
    tbody.innerHTML = pagosOrdenados.map(pago => {
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
            </tr>
        `;
    }).join('');
}

/**
 * Función para aplicar filtros
 */
function applyFilters() {
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    const project = document.getElementById('projectFilter').value;
    
    console.log('Aplicando filtros:', { dateFrom, dateTo, project });
    // Aquí puedes implementar la lógica de filtrado
    // Por ahora solo mostramos un mensaje
    alert('Filtros aplicados. Esta funcionalidad se puede expandir según necesidades específicas.');
}

/**
 * Función para limpiar filtros
 */
function resetFilters() {
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    document.getElementById('projectFilter').value = '';
    
    // Recargar datos sin filtros
    updateMainStats();
    generateQuickReports();
}

/**
 * Función para exportar datos
 * @param {string} type - Tipo de datos a exportar
 */
function exportData(type) {
    let data = [];
    let filename = '';
    
    switch(type) {
        case 'clientes':
            data = clientes.map(c => ({
                'Nombres': c.nombres,
                'Apellidos': c.apellidos,
                'DPI': c.dpi,
                'Contador': c.contador,
                'Lote': c.lote,
                'Proyecto': getProjectName(c.proyecto)
            }));
            filename = 'clientes.csv';
            break;
            
        case 'facturas':
            data = facturas.map(f => {
                const cliente = clientes.find(c => c.id === f.clienteId);
                return {
                    'No. Factura': f.id,
                    'Cliente': cliente ? `${cliente.nombres} ${cliente.apellidos}` : 'No encontrado',
                    'Fecha': new Date(f.fecha).toLocaleDateString('es-GT'),
                    'Consumo (m³)': f.consumo,
                    'Monto': f.montoTotal,
                    'Estado': f.estado
                };
            });
            filename = 'facturas.csv';
            break;
            
        case 'pagos':
            data = pagos.map(p => {
                const cliente = clientes.find(c => c.id === p.clienteId);
                return {
                    'Fecha': new Date(p.fechaPago).toLocaleDateString('es-GT'),
                    'Cliente': cliente ? `${cliente.nombres} ${cliente.apellidos}` : 'No encontrado',
                    'No. Factura': p.facturaId,
                    'Monto': p.monto,
                    'Método': p.metodoPago,
                    'Referencia': p.referencia
                };
            });
            filename = 'pagos.csv';
            break;
            
        case 'completo':
            // Reporte completo combinando toda la información
            data = clientes.map(cliente => {
                const facturasCliente = facturas.filter(f => f.clienteId === cliente.id);
                const pagosCliente = pagos.filter(p => p.clienteId === cliente.id);
                
                return {
                    'Cliente': `${cliente.nombres} ${cliente.apellidos}`,
                    'DPI': cliente.dpi,
                    'Contador': cliente.contador,
                    'Proyecto': getProjectName(cliente.proyecto),
                    'Total Facturas': facturasCliente.length,
                    'Total Facturado': facturasCliente.reduce((sum, f) => sum + f.montoTotal, 0),
                    'Total Pagado': pagosCliente.reduce((sum, p) => sum + p.monto, 0),
                    'Pendiente': facturasCliente.reduce((sum, f) => sum + f.montoTotal, 0) - pagosCliente.reduce((sum, p) => sum + p.monto, 0),
                    'Consumo Total': facturasCliente.reduce((sum, f) => sum + f.consumo, 0)
                };
            });
            filename = 'reporte_completo.csv';
            break;
    }
    
    if (data.length === 0) {
        alert('No hay datos para exportar');
        return;
    }
    
    // Convertir a CSV
    const csvContent = convertToCSV(data);
    
    // Crear y descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert(`Archivo ${filename} descargado exitosamente`);
}

/**
 * Función para convertir array de objetos a CSV
 * @param {Array} data - Array de objetos a convertir
 * @returns {string} Contenido CSV
 */
function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => {
        return headers.map(header => {
            const value = row[header];
            // Escapar comillas y envolver en comillas si contiene coma
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(',');
    });
    
    return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Función para manejar búsqueda en las tablas
 */
function setupSearch() {
    const searchInput = document.getElementById('dataSearch');
    
    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const activeTab = document.querySelector('.data-tab.active');
        
        if (!activeTab) return;
        
        const rows = activeTab.querySelectorAll('tbody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });
}

/**
 * Función para configurar las fechas por defecto en los filtros
 */
function setupDefaultDates() {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    document.getElementById('dateFrom').valueAsDate = firstDayOfMonth;
    document.getElementById('dateTo').valueAsDate = lastDayOfMonth;
}

/**
 * Función para actualizar datos en tiempo real
 */
function refreshData() {
    // Recargar datos desde localStorage
    loadAllData();
    
    // Actualizar todas las estadísticas y gráficos
    updateMainStats();
    createIngresosChart();
    createProyectosChart();
    generateQuickReports();
    
    // Actualizar tab activo
    const activeTabBtn = document.querySelector('.tab-btn.active');
    if (activeTabBtn) {
        const tabName = activeTabBtn.textContent.toLowerCase();
        switch(tabName) {
            case 'clientes':
                loadClientesTab();
                break;
            case 'facturas':
                loadFacturasTab();
                break;
            case 'pagos':
                loadPagosTab();
                break;
        }
    }
}

/**
 * Función para mostrar estadísticas adicionales
 */
function showAdditionalStats() {
    // Calcular estadísticas adicionales
    const totalConsumo = facturas.reduce((sum, f) => sum + f.consumo, 0);
    const promedioConsumo = totalConsumo / facturas.length || 0;
    
    const ingresoTotal = pagos.reduce((sum, p) => sum + p.monto, 0);
    
    const clientesActivos = clientes.filter(c => {
        const facturasCliente = facturas.filter(f => f.clienteId === c.id);
        return facturasCliente.length > 0;
    }).length;
    
    console.log('Estadísticas adicionales:', {
        totalConsumo: totalConsumo.toFixed(2),
        promedioConsumo: promedioConsumo.toFixed(2),
        ingresoTotal: ingresoTotal.toFixed(2),
        clientesActivos
    });
}

/**
 * Función para configurar actualizaciones automáticas
 */
function setupAutoRefresh() {
    // Actualizar datos cada 30 segundos
    setInterval(() => {
        refreshData();
    }, 30000);
}

/**
 * Función para manejar errores de gráficos
 */
function handleChartErrors() {
    // Verificar si Chart.js está disponible
    if (typeof Chart === 'undefined') {
        console.error('Chart.js no está disponible');
        
        // Mostrar mensaje en lugar de gráficos
        const chartContainers = document.querySelectorAll('.chart-wrapper');
        chartContainers.forEach(container => {
            container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666;">Gráfico no disponible</div>';
        });
        
        return false;
    }
    return true;
}

/**
 * Función para inicializar tooltips y ayudas
 */
function initializeTooltips() {
    // Agregar tooltips a elementos importantes
    const statCards = document.querySelectorAll('.stat-card');
    
    statCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            const label = this.querySelector('.stat-label').textContent;
            const number = this.querySelector('.stat-number').textContent;
            
            // Aquí podrías mostrar información adicional
            this.title = `${label}: ${number}`;
        });
    });
}

/**
 * Función principal de inicialización
 */
function initializeDashboard() {
    try {
        // Cargar todos los datos
        loadAllData();
        
        // Verificar disponibilidad de Chart.js
        if (!handleChartErrors()) {
            console.warn('Continuando sin gráficos');
        }
        
        // Actualizar estadísticas principales
        updateMainStats();
        
        // Crear gráficos si Chart.js está disponible
        if (typeof Chart !== 'undefined') {
            createIngresosChart();
            createProyectosChart();
        }
        
        // Generar reportes rápidos
        generateQuickReports();
        
        // Configurar fechas por defecto
        setupDefaultDates();
        
        // Configurar búsqueda
        setupSearch();
        
        // Cargar tab inicial (clientes)
        loadClientesTab();
        
        // Configurar tooltips
        initializeTooltips();
        
        // Configurar actualización automática
        setupAutoRefresh();
        
        // Mostrar estadísticas adicionales en consola
        showAdditionalStats();
        
        console.log('Dashboard inicializado correctamente');
        
    } catch (error) {
        console.error('Error inicializando dashboard:', error);
        
        // Mostrar mensaje de error al usuario
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 400px; flex-direction: column; color: #666;">
                    <h3>Error cargando el dashboard</h3>
                    <p>Por favor, recarga la página o contacta al administrador.</p>
                    <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #f093fb; color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Recargar Página
                    </button>
                </div>
            `;
        }
    }
}

/**
 * Función para limpiar recursos al salir
 */
function cleanup() {
    // Destruir gráficos si existen
    Object.values(chartsInstances).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
    });
    
    chartsInstances = {};
}

// Event Listeners principales
document.addEventListener('DOMContentLoaded', initializeDashboard);

// Limpiar recursos al salir de la página
window.addEventListener('beforeunload', cleanup);

// Asegurar que la página se cargue correctamente desde arriba
window.addEventListener('load', function() {
    window.scrollTo(0, 0);
});

// Funciones globales para los botones del HTML
window.showTab = showTab;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.exportData = exportData;