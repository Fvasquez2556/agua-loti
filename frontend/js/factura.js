/**
 * Sistema de Facturación de Agua - Lógica Principal
 * Archivo: factura.js
 */

// Variables globales
let clientes = [];
let facturas = [];
let lecturas = [];

/**
 * Función para mostrar mensajes al usuario
 * @param {string} text - Texto del mensaje
 * @param {string} type - Tipo de mensaje (success, error, warning)
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
 * Función para generar número de factura único
 * @returns {string} Número de factura en formato FAC-YYYYMM-0000
 */
function generateInvoiceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `FAC-${year}${month}-${random}`;
}

/**
 * Función para cargar clientes desde localStorage
 */
function loadClientes() {
    const stored = localStorage.getItem('clientes');
    clientes = stored ? JSON.parse(stored) : [];
    
    const select = document.getElementById('clienteSelect');
    select.innerHTML = '<option value="">Seleccione un cliente</option>';
    
    clientes.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente.id;
        option.textContent = `${cliente.nombres} ${cliente.apellidos} - ${cliente.contador}`;
        select.appendChild(option);
    });

    // Si no hay clientes, crear algunos de ejemplo
    if (clientes.length === 0) {
        createSampleClients();
    }
}

/**
 * Función para crear clientes de ejemplo si no existen
 */
function createSampleClients() {
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
        }
    ];

    clientes = sampleClients;
    localStorage.setItem('clientes', JSON.stringify(clientes));
    loadClientes(); // Recargar el select
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
 * Función para calcular consumo y monto total
 */
function calculateConsumption() {
    const lecturaAnterior = parseFloat(document.getElementById('lecturaAnterior').value) || 0;
    const lecturaActual = parseFloat(document.getElementById('lecturaActual').value) || 0;
    const tarifaBase = parseFloat(document.getElementById('tarifaBase').value) || 0;
    const precioPorM3 = parseFloat(document.getElementById('precioPorM3').value) || 0;

    const consumo = Math.max(0, lecturaActual - lecturaAnterior);
    const montoConsumo = consumo * precioPorM3;
    const montoTotal = tarifaBase + montoConsumo;

    document.getElementById('consumoCalculado').value = consumo.toFixed(2);
    document.getElementById('montoTotal').value = montoTotal.toFixed(2);

    updateInvoicePreview();
}

/**
 * Función para actualizar la vista previa de la factura
 */
function updateInvoicePreview() {
    const clienteId = document.getElementById('clienteSelect').value;
    if (!clienteId) return;

    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return;

    const lecturaAnterior = parseFloat(document.getElementById('lecturaAnterior').value) || 0;
    const lecturaActual = parseFloat(document.getElementById('lecturaActual').value) || 0;
    const consumo = parseFloat(document.getElementById('consumoCalculado').value) || 0;
    const tarifaBase = parseFloat(document.getElementById('tarifaBase').value) || 0;
    const precioPorM3 = parseFloat(document.getElementById('precioPorM3').value) || 0;
    const montoTotal = parseFloat(document.getElementById('montoTotal').value) || 0;

    // Actualizar datos del cliente
    document.getElementById('preview-nombre').textContent = `${cliente.nombres} ${cliente.apellidos}`;
    document.getElementById('preview-proyecto').textContent = getProjectName(cliente.proyecto);
    document.getElementById('preview-contador').textContent = cliente.contador;
    document.getElementById('preview-lote').textContent = cliente.lote;

    // Actualizar datos de facturación
    document.getElementById('preview-factura').textContent = generateInvoiceNumber();
    document.getElementById('preview-fecha').textContent = new Date().toLocaleDateString('es-GT');
    
    const periodoInicio = document.getElementById('periodoInicio').value;
    const periodoFin = document.getElementById('periodoFin').value;
    if (periodoInicio && periodoFin) {
        document.getElementById('preview-periodo').textContent = 
            `${new Date(periodoInicio).toLocaleDateString('es-GT')} - ${new Date(periodoFin).toLocaleDateString('es-GT')}`;
    }

    // Fecha límite (15 días después)
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + 15);
    document.getElementById('preview-limite').textContent = fechaLimite.toLocaleDateString('es-GT');

    // Actualizar tabla de items
    const tbody = document.getElementById('invoice-items');
    const montoConsumo = consumo * precioPorM3;

    tbody.innerHTML = `
        <tr>
            <td>Tarifa Base</td>
            <td>1</td>
            <td>Q ${tarifaBase.toFixed(2)}</td>
            <td>Q ${tarifaBase.toFixed(2)}</td>
        </tr>
        <tr>
            <td>Consumo de Agua (${lecturaAnterior.toFixed(2)} → ${lecturaActual.toFixed(2)})</td>
            <td>${consumo.toFixed(2)} m³</td>
            <td>Q ${precioPorM3.toFixed(2)}</td>
            <td>Q ${montoConsumo.toFixed(2)}</td>
        </tr>
    `;

    // Actualizar totales
    const totalsDiv = document.getElementById('invoice-totals');
    totalsDiv.innerHTML = `
        <div class="total-row">
            <span>Subtotal:</span>
            <span>Q ${montoTotal.toFixed(2)}</span>
        </div>
        <div class="total-row final">
            <span>TOTAL A PAGAR:</span>
            <span>Q ${montoTotal.toFixed(2)}</span>
        </div>
    `;
}

/**
 * Función para cargar el historial de lecturas de un cliente
 * @param {string} clienteId - ID del cliente
 */
function loadReadingHistory(clienteId) {
    const stored = localStorage.getItem('lecturas');
    lecturas = stored ? JSON.parse(stored) : [];

    const clienteLecturas = lecturas.filter(l => l.clienteId === clienteId)
                                   .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    const historyDiv = document.getElementById('historyList');
    
    if (clienteLecturas.length === 0) {
        historyDiv.innerHTML = '<p>No hay lecturas registradas para este cliente</p>';
        document.getElementById('lecturaAnterior').value = '0';
        return;
    }

    // Usar la última lectura como lectura anterior
    const ultimaLectura = clienteLecturas[0];
    document.getElementById('lecturaAnterior').value = ultimaLectura.lecturaActual;

    historyDiv.innerHTML = clienteLecturas.slice(0, 5).map(lectura => `
        <div class="reading-item">
            <span>${new Date(lectura.fecha).toLocaleDateString('es-GT')}</span>
            <span>${lectura.lecturaActual} m³</span>
            <span>Q ${lectura.monto}</span>
        </div>
    `).join('');
}

/**
 * Función para manejar el cambio de cliente seleccionado
 */
function handleClientChange() {
    const clienteId = document.getElementById('clienteSelect').value;
    if (!clienteId) {
        // Limpiar formulario
        document.getElementById('clienteNombre').value = '';
        document.getElementById('clienteProyecto').value = '';
        document.getElementById('clienteContador').value = '';
        document.getElementById('clienteLote').value = '';
        document.getElementById('lecturaAnterior').value = '';
        return;
    }

    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente) {
        document.getElementById('clienteNombre').value = `${cliente.nombres} ${cliente.apellidos}`;
        document.getElementById('clienteProyecto').value = getProjectName(cliente.proyecto);
        document.getElementById('clienteContador').value = cliente.contador;
        document.getElementById('clienteLote').value = cliente.lote;

        loadReadingHistory(clienteId);
        calculateConsumption();
    }
}

/**
 * Función para manejar el envío del formulario
 * @param {Event} e - Evento de envío del formulario
 */
function handleFormSubmit(e) {
    e.preventDefault();

    const clienteId = document.getElementById('clienteSelect').value;
    if (!clienteId) {
        showMessage('Por favor seleccione un cliente', 'error');
        return;
    }

    const lecturaActual = parseFloat(document.getElementById('lecturaActual').value);
    const lecturaAnterior = parseFloat(document.getElementById('lecturaAnterior').value);

    if (lecturaActual < lecturaAnterior) {
        showMessage('La lectura actual no puede ser menor a la anterior', 'error');
        return;
    }

    // Crear registro de factura
    const factura = {
        id: generateInvoiceNumber(),
        clienteId: clienteId,
        fecha: new Date().toISOString(),
        lecturaAnterior: lecturaAnterior,
        lecturaActual: lecturaActual,
        consumo: parseFloat(document.getElementById('consumoCalculado').value),
        tarifaBase: parseFloat(document.getElementById('tarifaBase').value),
        precioPorM3: parseFloat(document.getElementById('precioPorM3').value),
        montoTotal: parseFloat(document.getElementById('montoTotal').value),
        periodoInicio: document.getElementById('periodoInicio').value,
        periodoFin: document.getElementById('periodoFin').value,
        fechaLectura: document.getElementById('fechaLectura').value,
        estado: 'pendiente'
    };

    // Crear registro de lectura
    const lectura = {
        id: Date.now().toString(),
        clienteId: clienteId,
        fecha: document.getElementById('fechaLectura').value,
        lecturaActual: lecturaActual,
        consumo: factura.consumo,
        monto: factura.montoTotal.toFixed(2),
        facturaId: factura.id
    };

    // Guardar en localStorage
    facturas.push(factura);
    lecturas.push(lectura);
    
    localStorage.setItem('facturas', JSON.stringify(facturas));
    localStorage.setItem('lecturas', JSON.stringify(lecturas));

    showMessage('Factura generada exitosamente', 'success');
    
    // Actualizar vista previa con el número de factura correcto
    document.getElementById('preview-factura').textContent = factura.id;
}

/**
 * Función para imprimir la factura
 */
function printInvoice() {
    const clienteId = document.getElementById('clienteSelect').value;
    if (!clienteId) {
        showMessage('Por favor complete los datos de la factura', 'error');
        return;
    }
    window.print();
}

/**
 * Función para descargar PDF (simulada)
 */
function downloadPDF() {
    const clienteId = document.getElementById('clienteSelect').value;
    if (!clienteId) {
        showMessage('Por favor complete los datos de la factura', 'error');
        return;
    }
    
    showMessage('Función de descarga PDF en desarrollo', 'error');
    // Aquí se implementaría la generación real del PDF
}

/**
 * Función para configurar los event listeners
 */
function setupEventListeners() {
    // Event listener para cambio de cliente
    document.getElementById('clienteSelect').addEventListener('change', handleClientChange);

    // Event listeners para calcular automáticamente cuando cambien los valores
    ['lecturaActual', 'tarifaBase', 'precioPorM3'].forEach(id => {
        document.getElementById(id).addEventListener('input', calculateConsumption);
    });

    // Event listener para envío del formulario
    document.getElementById('invoiceForm').addEventListener('submit', handleFormSubmit);
}

/**
 * Función para inicializar valores por defecto
 */
function initializeDefaults() {
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
 * Función principal de inicialización
 */
function initializeApp() {
    loadClientes();
    
    // Cargar facturas y lecturas existentes
    const storedFacturas = localStorage.getItem('facturas');
    const storedLecturas = localStorage.getItem('lecturas');
    
    facturas = storedFacturas ? JSON.parse(storedFacturas) : [];
    lecturas = storedLecturas ? JSON.parse(storedLecturas) : [];

    // Configurar valores por defecto
    initializeDefaults();
    
    // Configurar event listeners
    setupEventListeners();
}

// Event Listeners principales
document.addEventListener('DOMContentLoaded', initializeApp);

// Asegurar que la página se cargue correctamente desde arriba
window.addEventListener('load', function() {
    window.scrollTo(0, 0);
});