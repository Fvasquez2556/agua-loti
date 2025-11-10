/**
 * Gestor de Reconexión de Servicio - VERSIÓN MEJORADA
 * Con lista priorizada y búsqueda en tiempo real sin tildes
 */

// Variable global para almacenar la lista completa de clientes
let clientesPriorizados = [];

class ReconexionManager {
    constructor() {
        this.API_BASE = 'http://localhost:5000/api';
        this.currentClienteId = null;
        this.currentCliente = null;
        this.opcionesReconexion = null;
        this.opcionSeleccionada = null;
        this.init();
    }

    /**
     * INICIALIZACIÓN MEJORADA
     */
    async init() {
        console.log('🚀 ReconexionManager v2.0 inicializado');
        this.setupEventListeners();

        // Cargar la lista priorizada al iniciar
        await this.cargarListaPriorizada();

        // Verificar si viene de otra página con clienteId
        const urlParams = new URLSearchParams(window.location.search);
        const clienteId = urlParams.get('clienteId');
        if (clienteId) {
            console.log('📋 Cliente especificado en URL:', clienteId);
            this.seleccionarCliente(clienteId);
        }
    }

    /**
     * NUEVA: Configurar Event Listeners
     */
    setupEventListeners() {
        // Listener para la búsqueda en vivo
        const searchInput = document.getElementById('searchClienteInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filtrarTablaEnVivo(e.target.value);
            });
        }

        // Listener para cambio de método de pago
        const metodoPago = document.getElementById('metodoPago');
        if (metodoPago) {
            metodoPago.addEventListener('change', (e) => {
                this.toggleCamposCheque(e.target.value);
            });
        }
    }

    /**
     * NUEVA: Cargar la lista de clientes priorizados
     */
    async cargarListaPriorizada() {
        this.showLoading(true);
        try {
            console.log('📡 Solicitando lista priorizada al servidor...');

            const response = await AuthUtils.authenticatedFetch(
                `${this.API_BASE}/reconexion/lista-priorizada`
            );
            const data = await response.json();

            if (response.ok && data.success) {
                clientesPriorizados = data.data;
                console.log(`✅ Lista cargada: ${clientesPriorizados.length} clientes`);

                this.renderizarTablaPriorizada(clientesPriorizados);
            } else {
                throw new Error(data.message || 'Error al cargar lista');
            }
        } catch (error) {
            console.error('❌ Error:', error);
            this.showMessage('Error al cargar la lista de clientes pendientes', 'error');
            this.renderizarTablaVacia('Error al cargar datos');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * NUEVA: Renderizar la tabla de prioridad
     */
    renderizarTablaPriorizada(clientes) {
        const tbody = document.getElementById('priorityTableBody');
        tbody.innerHTML = '';

        if (clientes.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 30px; color: #6c757d;">
                        ✅ ¡Excelente! No hay clientes que requieran reconexión en este momento.
                    </td>
                </tr>`;
            return;
        }

        // Ordenar por meses de atraso (mayor a menor)
        clientes.sort((a, b) => b.mesesAtraso - a.mesesAtraso);

        clientes.forEach(cliente => {
            const tr = document.createElement('tr');

            // Determinar color según urgencia
            let colorUrgencia = '';
            if (cliente.mesesAtraso >= 4) {
                colorUrgencia = 'color: #c92a2a; font-weight: 700;';
            } else if (cliente.mesesAtraso >= 3) {
                colorUrgencia = 'color: #e03131; font-weight: 600;';
            } else {
                colorUrgencia = 'color: #f76707; font-weight: 600;';
            }

            tr.innerHTML = `
                <td>
                    <strong>${cliente.nombreCompleto}</strong><br>
                    <small>${cliente.dpi}</small>
                </td>
                <td>${cliente.proyecto}</td>
                <td style="${colorUrgencia}">${cliente.mesesAtraso}</td>
                <td style="font-weight: 600; color: #d6336c;">Q ${cliente.deudaTotal.toFixed(2)}</td>
                <td>
                    <button onclick="reconexionManager.seleccionarCliente('${cliente.clienteId}')">
                        Seleccionar
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    /**
     * NUEVA: Renderizar tabla vacía con mensaje
     */
    renderizarTablaVacia(mensaje) {
        const tbody = document.getElementById('priorityTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 30px; color: #6c757d;">
                    ${mensaje}
                </td>
            </tr>`;
    }

    /**
     * NUEVA: Normalizar texto (quitar tildes para búsqueda)
     */
    normalizarTexto(texto) {
        if (!texto) return '';
        return texto
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    /**
     * NUEVA: Filtrar la tabla en vivo (búsqueda en tiempo real)
     */
    filtrarTablaEnVivo(termino) {
        if (!termino || termino.trim() === '') {
            // Si está vacío, mostrar todos
            this.renderizarTablaPriorizada(clientesPriorizados);
            return;
        }

        const terminoNormalizado = this.normalizarTexto(termino);

        const clientesFiltrados = clientesPriorizados.filter(cliente => {
            const nombre = this.normalizarTexto(cliente.nombreCompleto);
            const dpi = this.normalizarTexto(cliente.dpi);
            const contador = this.normalizarTexto(cliente.contador || '');
            const proyecto = this.normalizarTexto(cliente.proyecto || '');

            return nombre.includes(terminoNormalizado) ||
                   dpi.includes(terminoNormalizado) ||
                   contador.includes(terminoNormalizado) ||
                   proyecto.includes(terminoNormalizado);
        });

        if (clientesFiltrados.length === 0) {
            this.renderizarTablaVacia(`No se encontraron clientes que coincidan con "${termino}"`);
        } else {
            this.renderizarTablaPriorizada(clientesFiltrados);
        }
    }

    /**
     * NUEVA: Acción unificada para seleccionar un cliente
     */
    async seleccionarCliente(clienteId) {
        console.log('🔍 Seleccionando cliente:', clienteId);

        // Ocultar placeholder y mostrar loading
        this.ocultarPlaceholder();
        this.hideAllActionPanels();
        this.showLoading(true);

        try {
            // Buscar el cliente en la lista
            let cliente = clientesPriorizados.find(c => c.clienteId === clienteId);

            if (cliente) {
                this.currentCliente = cliente.clienteData || cliente;
                this.currentClienteId = clienteId;
                this.mostrarInfoCliente(cliente);
            } else {
                // Si no está en la lista, cargar desde API
                await this.cargarClientePorId(clienteId);
            }

            // Verificar opciones de reconexión
            await this.verificarReconexion();

        } catch (error) {
            console.error('❌ Error al seleccionar cliente:', error);
            this.showMessage('Error al cargar datos del cliente', 'error');
            this.mostrarPlaceholder();
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Cargar cliente por ID desde API
     */
    async cargarClientePorId(clienteId) {
        const response = await AuthUtils.authenticatedFetch(
            `${this.API_BASE}/clientes/${clienteId}`
        );
        const data = await response.json();

        if (response.ok && data.data) {
            this.currentCliente = data.data;
            this.currentClienteId = clienteId;
            this.mostrarInfoCliente(data.data);
        } else {
            throw new Error(data.message || 'Cliente no encontrado');
        }
    }

    /**
     * MODIFICADA: Mostrar información del cliente
     */
    mostrarInfoCliente(cliente) {
        const clienteInfo = document.getElementById('clienteInfo');

        // Poblar información
        document.getElementById('clienteNombre').textContent =
            cliente.nombreCompleto || `${cliente.nombres} ${cliente.apellidos}`;
        document.getElementById('clienteDPI').textContent = cliente.dpi;
        document.getElementById('clienteContador').textContent = cliente.contador;
        document.getElementById('clienteLote').textContent = cliente.lote || 'N/A';
        document.getElementById('clienteProyecto').textContent = cliente.proyecto || 'Sin proyecto';

        const estadoBadge = document.getElementById('clienteEstado');
        estadoBadge.textContent = cliente.estadoServicio || cliente.estado;
        estadoBadge.className = `badge ${cliente.estadoServicio || cliente.estado}`;

        // Mostrar el panel
        clienteInfo.classList.remove('hidden');
        clienteInfo.classList.add('visible');
    }

    /**
     * Verificar opciones de reconexión
     */
    async verificarReconexion() {
        try {
            const response = await AuthUtils.authenticatedFetch(
                `${this.API_BASE}/reconexion/opciones/${this.currentClienteId}`
            );
            const data = await response.json();

            if (response.ok && data.success) {
                this.opcionesReconexion = data.data;
                this.mostrarOpciones(data.data);
            } else {
                throw new Error(data.message || 'Error al verificar reconexión');
            }
        } catch (error) {
            console.error('❌ Error:', error);
            this.showMessage('Error al calcular opciones de reconexión', 'error');
        }
    }

    /**
     * Mostrar opciones de reconexión
     */
    mostrarOpciones(opciones) {
        const opcionesSection = document.getElementById('opcionesReconexion');

        // Actualizar alerta
        document.getElementById('mesesAtrasadosAlert').textContent = opciones.mesesAtrasados;

        // Opción Parcial (80%)
        document.getElementById('montoParcialDeuda').textContent =
            `Q ${opciones.opcionParcial.montoDeuda.toFixed(2)}`;
        document.getElementById('saldoParcialPendiente').textContent =
            `Q ${opciones.opcionParcial.saldoPendiente.toFixed(2)}`;
        document.getElementById('totalParcial').textContent =
            `Q ${opciones.opcionParcial.totalAPagar.toFixed(2)}`;

        // Opción Total (100%)
        document.getElementById('montoTotalDeuda').textContent =
            `Q ${opciones.opcionTotal.montoDeuda.toFixed(2)}`;
        document.getElementById('totalTotal').textContent =
            `Q ${opciones.opcionTotal.totalAPagar.toFixed(2)}`;

        // Mostrar el panel
        opcionesSection.classList.remove('hidden');
        opcionesSection.classList.add('visible');
    }

    /**
     * Seleccionar opción de pago
     */
    seleccionarOpcion(tipo) {
        if (tipo === 'parcial') {
            this.opcionSeleccionada = this.opcionesReconexion.opcionParcial;
        } else {
            this.opcionSeleccionada = this.opcionesReconexion.opcionTotal;
        }

        // Mostrar formulario de pago
        this.mostrarFormularioPago(tipo);
    }

    /**
     * Mostrar formulario de pago
     */
    mostrarFormularioPago(tipoOpcion) {
        const formularioSection = document.getElementById('formularioPago');

        // Actualizar resumen
        const textoOpcion = tipoOpcion === 'parcial'
            ? '80% de Deuda (Opción Parcial)'
            : '100% de Deuda (Opción Total)';

        document.getElementById('opcionSeleccionadaTexto').textContent = textoOpcion;
        document.getElementById('montoAPagarTexto').textContent =
            `Q ${this.opcionSeleccionada.totalAPagar.toFixed(2)}`;
        document.getElementById('monto').value = this.opcionSeleccionada.totalAPagar.toFixed(2);

        // Limpiar campos
        document.getElementById('formPago').reset();
        document.getElementById('monto').value = this.opcionSeleccionada.totalAPagar.toFixed(2);

        // Mostrar el panel
        formularioSection.classList.remove('hidden');
        formularioSection.classList.add('visible');

        // Scroll suave al formulario
        formularioSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /**
     * Mostrar/ocultar campos de cheque
     */
    toggleCamposCheque(metodoPago) {
        const camposCheque = document.getElementById('camposCheque');
        const bancoCheque = document.getElementById('bancoCheque');
        const numeroCheque = document.getElementById('numeroCheque');

        if (metodoPago === 'cheque') {
            camposCheque.classList.remove('hidden');
            bancoCheque.required = true;
            numeroCheque.required = true;
        } else {
            camposCheque.classList.add('hidden');
            bancoCheque.required = false;
            numeroCheque.required = false;
        }
    }

    /**
     * Procesar pago de reconexión
     */
    async procesarPago(event) {
        event.preventDefault();

        const form = document.getElementById('formPago');
        const formData = new FormData(form);

        const datosPago = {
            opcion: this.opcionSeleccionada === this.opcionesReconexion.opcionParcial
                ? 'parcial'
                : 'total',
            metodoPago: formData.get('metodoPago'),
            monto: parseFloat(formData.get('monto')),
            referencia: formData.get('referencia') || null
        };

        // Si es cheque, agregar datos adicionales
        if (datosPago.metodoPago === 'cheque') {
            datosPago.bancoCheque = formData.get('bancoCheque');
            datosPago.numeroCheque = formData.get('numeroCheque');
        }

        try {
            this.showLoading(true);
            console.log('💳 Procesando pago:', datosPago);

            const response = await AuthUtils.authenticatedFetch(
                `${this.API_BASE}/reconexion/procesar/${this.currentClienteId}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datosPago)
                }
            );

            const data = await response.json();

            if (response.ok && data.success) {
                console.log('✅ Reconexión procesada exitosamente');

                // Descargar ticket automáticamente
                if (data.data.pagoId) {
                    console.log('📄 Descargando ticket automáticamente...');
                    try {
                        await this.descargarTicketPago(data.data.pagoId);
                        console.log('✅ Ticket descargado exitosamente');
                    } catch (ticketError) {
                        console.error('⚠️ Error al descargar ticket:', ticketError);
                        this.showMessage('Pago registrado exitosamente. El ticket se puede descargar desde el módulo de Pagos.', 'warning');
                    }
                }

                this.showMessage(
                    `✅ Reconexión procesada exitosamente. Factura: ${data.data.facturaConsolidada}`,
                    'success'
                );

                // Limpiar vista y recargar lista
                this.limpiarVista();
                setTimeout(() => {
                    this.cargarListaPriorizada();
                }, 2000);

            } else {
                throw new Error(data.message || 'Error al procesar pago');
            }
        } catch (error) {
            console.error('❌ Error:', error);
            this.showMessage(`Error al procesar pago: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Cancelar proceso de pago
     */
    cancelarPago() {
        const formularioSection = document.getElementById('formularioPago');
        formularioSection.classList.add('hidden');
        formularioSection.classList.remove('visible');

        // Limpiar formulario
        document.getElementById('formPago').reset();
    }

    /**
     * NUEVA: Limpiar toda la vista
     */
    limpiarVista() {
        this.hideAllActionPanels();
        this.mostrarPlaceholder();
        this.currentClienteId = null;
        this.currentCliente = null;
        this.opcionesReconexion = null;
        this.opcionSeleccionada = null;

        // Limpiar búsqueda
        const searchInput = document.getElementById('searchClienteInput');
        if (searchInput) searchInput.value = '';
    }

    /**
     * NUEVA: Ocultar todos los paneles de acción
     */
    hideAllActionPanels() {
        document.getElementById('clienteInfo').classList.remove('visible');
        document.getElementById('clienteInfo').classList.add('hidden');
        document.getElementById('opcionesReconexion').classList.remove('visible');
        document.getElementById('opcionesReconexion').classList.add('hidden');
        document.getElementById('formularioPago').classList.remove('visible');
        document.getElementById('formularioPago').classList.add('hidden');
    }

    /**
     * NUEVA: Mostrar placeholder
     */
    mostrarPlaceholder() {
        document.getElementById('actionPlaceholder').classList.remove('hidden');
    }

    /**
     * NUEVA: Ocultar placeholder
     */
    ocultarPlaceholder() {
        document.getElementById('actionPlaceholder').classList.add('hidden');
    }

    /**
     * Mostrar indicador de carga
     */
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Mostrar mensaje al usuario
     */
    showMessage(message, type = 'info') {
        // Si existe PageUtils, usar su método
        if (typeof PageUtils !== 'undefined' && PageUtils.showMessage) {
            PageUtils.showMessage(message, type);
        } else {
            // Fallback simple
            alert(message);
        }
    }

    /**
     * Descargar ticket de pago en PDF
     * @param {string} pagoId - ID del pago
     */
    async descargarTicketPago(pagoId) {
        try {
            const response = await AuthUtils.authenticatedFetch(
                `${this.API_BASE}/pagos/${pagoId}/ticket`,
                {
                    method: 'GET'
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al descargar ticket');
            }

            // Obtener el blob del PDF
            const blob = await response.blob();

            // Obtener el nombre del archivo desde el header Content-Disposition
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'ticket-reconexion.pdf';

            if (contentDisposition) {
                // Extraer nombre del archivo
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

                // Limpiar caracteres no deseados
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
}

// Inicializar el gestor cuando cargue la página
let reconexionManager;
document.addEventListener('DOMContentLoaded', () => {
    reconexionManager = new ReconexionManager();
});
