/**
 * Gestor de Reconexión de Servicio
 * Maneja la interacción con el API de reconexión
 */

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
     * Inicialización
     */
    init() {
        console.log('ReconexionManager inicializado');

        // Agregar enter en búsqueda
        const searchInput = document.getElementById('searchCliente');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.buscarCliente();
                }
            });
        }

        // Verificar si viene de otra página con clienteId
        const urlParams = new URLSearchParams(window.location.search);
        const clienteId = urlParams.get('clienteId');
        if (clienteId) {
            this.cargarClientePorId(clienteId);
        }
    }

    /**
     * Cargar cliente por ID (desde URL)
     */
    async cargarClientePorId(clienteId) {
        this.showLoading(true);
        try {
            const response = await AuthUtils.authenticatedFetch(
                `${this.API_BASE}/clientes/${clienteId}`
            );
            const data = await response.json();

            if (response.ok && data.data) {
                this.currentCliente = data.data;
                this.currentClienteId = clienteId;
                this.mostrarInfoCliente(data.data);
                // Automáticamente verificar reconexión
                await this.verificarReconexion();
            }
        } catch (error) {
            console.error('Error:', error);
            this.showMessage('Error al cargar información del cliente', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Buscar cliente
     */
    async buscarCliente() {
        const searchTerm = document.getElementById('searchCliente').value.trim();

        if (!searchTerm) {
            this.showMessage('Por favor ingresa un término de búsqueda', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const response = await AuthUtils.authenticatedFetch(
                `${this.API_BASE}/clientes?buscar=${encodeURIComponent(searchTerm)}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al buscar cliente');
            }

            if (!data.data || data.data.length === 0) {
                this.showMessage('No se encontró ningún cliente', 'error');
                this.hideAll();
                return;
            }

            const cliente = data.data[0];
            this.currentCliente = cliente;
            this.currentClienteId = cliente._id;

            this.mostrarInfoCliente(cliente);

        } catch (error) {
            console.error('Error:', error);
            this.showMessage(error.message, 'error');
            this.hideAll();
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Mostrar información del cliente
     */
    mostrarInfoCliente(cliente) {
        document.getElementById('clienteNombre').textContent =
            `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim();
        document.getElementById('clienteDPI').textContent = cliente.dpi || 'N/A';
        document.getElementById('clienteContador').textContent =
            cliente.contador || 'N/A';
        document.getElementById('numeroReconexiones').textContent =
            cliente.numeroReconexiones || 0;

        const estadoBadge = document.getElementById('clienteEstado');
        const estado = cliente.estadoServicio || 'activo';
        estadoBadge.textContent = estado.toUpperCase();
        estadoBadge.className = `badge ${estado}`;

        document.getElementById('clienteInfo').classList.add('visible');
        document.getElementById('opcionesReconexion').classList.remove('visible');
        document.getElementById('formularioPago').classList.remove('visible');
    }

    /**
     * Verificar opciones de reconexión
     */
    async verificarReconexion() {
        if (!this.currentClienteId) {
            this.showMessage('No hay cliente seleccionado', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const response = await AuthUtils.authenticatedFetch(
                `${this.API_BASE}/reconexion/opciones/${this.currentClienteId}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al obtener opciones');
            }

            if (!data.data.requiereReconexion) {
                this.showMessage(
                    'Este cliente no requiere reconexión. Tiene menos de 2 meses de atraso.',
                    'error'
                );
                return;
            }

            this.opcionesReconexion = data.data;
            this.mostrarOpciones(data.data);

        } catch (error) {
            console.error('Error:', error);
            this.showMessage(error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Mostrar opciones de reconexión
     */
    mostrarOpciones(opciones) {
        // Mostrar meses de atraso
        document.getElementById('mesesAtraso').textContent =
            `${opciones.mesesAtrasados} meses de atraso`;

        // Mostrar deuda total
        document.getElementById('deudaTotal').textContent =
            `Q${opciones.deudaTotal.toFixed(2)}`;

        // OPCIÓN PARCIAL (80%)
        const parcial = opciones.opcionParcial;
        document.getElementById('montoParcialDeuda').textContent =
            `Q${parcial.montoDeuda.toFixed(2)}`;
        document.getElementById('saldoPendiente80').textContent =
            `Q${parcial.saldoPendiente.toFixed(2)}`;
        document.getElementById('totalParcial').textContent =
            `Q${parcial.totalAPagar.toFixed(2)}`;

        // OPCIÓN TOTAL (100%)
        const total = opciones.opcionTotal;
        document.getElementById('montoTotalDeuda').textContent =
            `Q${total.montoDeuda.toFixed(2)}`;
        document.getElementById('montoDescuento').textContent =
            `-Q${total.descuento.montoDescuento.toFixed(2)}`;
        document.getElementById('totalCompleto').textContent =
            `Q${total.totalAPagar.toFixed(2)}`;

        // Mostrar detalle de facturas
        this.mostrarDetalleFacturas(opciones.detalleFacturas);

        // Mostrar sección
        document.getElementById('opcionesReconexion').classList.add('visible');

        // Scroll
        document.getElementById('opcionesReconexion').scrollIntoView({
            behavior: 'smooth'
        });
    }

    /**
     * Mostrar detalle de facturas
     */
    mostrarDetalleFacturas(facturas) {
        const container = document.getElementById('facturasDetalle');
        container.innerHTML = '';

        if (!facturas || facturas.length === 0) {
            container.innerHTML = '<p>No hay facturas para mostrar</p>';
            return;
        }

        facturas.forEach(factura => {
            const div = document.createElement('div');
            div.className = 'factura-item';
            div.innerHTML = `
                <span>${factura.numeroFactura}</span>
                <span>Q${factura.totalConMora.toFixed(2)}</span>
            `;
            container.appendChild(div);
        });
    }

    /**
     * Seleccionar opción de pago
     */
    seleccionarOpcion(tipo) {
        this.opcionSeleccionada = tipo;

        // Actualizar UI
        document.getElementById('option80').classList.remove('selected');
        document.getElementById('option100').classList.remove('selected');

        if (tipo === 'parcial') {
            document.getElementById('option80').classList.add('selected');
            document.getElementById('radioParcial').checked = true;
        } else {
            document.getElementById('option100').classList.add('selected');
            document.getElementById('radioTotal').checked = true;
        }

        // Habilitar botón continuar
        document.getElementById('btnContinuar').disabled = false;
    }

    /**
     * Mostrar formulario de pago
     */
    mostrarFormularioPago() {
        if (!this.opcionSeleccionada) {
            this.showMessage('Por favor selecciona una opción de pago', 'error');
            return;
        }

        const opcion = this.opcionSeleccionada === 'total'
            ? this.opcionesReconexion.opcionTotal
            : this.opcionesReconexion.opcionParcial;

        // Llenar resumen
        document.getElementById('resumenOpcion').textContent =
            this.opcionSeleccionada === 'total' ? 'Pago Total (100%)' : 'Pago Parcial (80%)';
        document.getElementById('resumenDeuda').textContent =
            `Q${opcion.montoDeuda.toFixed(2)}`;
        document.getElementById('resumenTotal').textContent =
            `Q${opcion.totalAPagar.toFixed(2)}`;

        // Pre-llenar monto
        document.getElementById('montoPago').value = opcion.totalAPagar.toFixed(2);

        // Mostrar formulario
        document.getElementById('opcionesReconexion').classList.remove('visible');
        document.getElementById('formularioPago').classList.add('visible');

        // Scroll
        document.getElementById('formularioPago').scrollIntoView({
            behavior: 'smooth'
        });
    }

    /**
     * Volver a opciones
     */
    volverOpciones() {
        document.getElementById('formularioPago').classList.remove('visible');
        document.getElementById('opcionesReconexion').classList.add('visible');
    }

    /**
     * Procesar pago de reconexión
     */
    async procesarPago(event) {
        event.preventDefault();

        const metodoPago = document.getElementById('metodoPago').value;
        const monto = parseFloat(document.getElementById('montoPago').value);
        const referencia = document.getElementById('referenciaPago').value;

        if (!metodoPago || !monto) {
            this.showMessage('Por favor completa todos los campos requeridos', 'error');
            return;
        }

        const opcion = this.opcionSeleccionada === 'total'
            ? this.opcionesReconexion.opcionTotal
            : this.opcionesReconexion.opcionParcial;

        // Validar monto
        if (Math.abs(monto - opcion.totalAPagar) > 0.01) {
            this.showMessage(
                `El monto debe ser Q${opcion.totalAPagar.toFixed(2)}`,
                'error'
            );
            return;
        }

        this.showLoading(true);

        try {
            const response = await AuthUtils.authenticatedFetch(
                `${this.API_BASE}/reconexion/procesar/${this.currentClienteId}`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        opcion: this.opcionSeleccionada,
                        metodoPago,
                        monto,
                        referencia: referencia || null
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al procesar reconexión');
            }

            // Mostrar confirmación
            this.mostrarConfirmacion(data.data);

        } catch (error) {
            console.error('Error:', error);
            this.showMessage(error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Mostrar modal de confirmación
     */
    mostrarConfirmacion(resultado) {
        document.getElementById('confirmCliente').textContent =
            `${this.currentCliente.nombres || ''} ${this.currentCliente.apellidos || ''}`.trim();
        document.getElementById('confirmMonto').textContent =
            `Q${resultado.montoPagado || '0.00'}`;
        document.getElementById('confirmFacturas').textContent =
            resultado.facturasPagadas || 0;
        document.getElementById('confirmSaldo').textContent =
            `Q${(resultado.saldoPendiente || 0).toFixed(2)}`;

        // Ocultar formulario
        document.getElementById('formularioPago').classList.remove('visible');

        // Mostrar modal
        document.getElementById('modalConfirmacion').classList.add('visible');
    }

    /**
     * Imprimir comprobante
     */
    imprimirComprobante() {
        window.print();
    }

    /**
     * Nueva reconexión
     */
    nuevaReconexion() {
        document.getElementById('modalConfirmacion').classList.remove('visible');
        this.hideAll();
        document.getElementById('searchCliente').value = '';
        this.currentCliente = null;
        this.currentClienteId = null;
        this.opcionesReconexion = null;
        this.opcionSeleccionada = null;
    }

    /**
     * Cancelar
     */
    cancelar() {
        if (confirm('¿Estás seguro de cancelar el proceso de reconexión?')) {
            this.nuevaReconexion();
        }
    }

    /**
     * Ocultar todas las secciones
     */
    hideAll() {
        document.getElementById('clienteInfo').classList.remove('visible');
        document.getElementById('opcionesReconexion').classList.remove('visible');
        document.getElementById('formularioPago').classList.remove('visible');
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
     * Mostrar mensaje
     */
    showMessage(text, type = 'success') {
        const messageEl = document.getElementById('message');
        if (!messageEl) return;

        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
        messageEl.classList.add('visible');

        setTimeout(() => {
            messageEl.classList.remove('visible');
        }, 5000);
    }

    /**
     * Formatear moneda
     */
    formatCurrency(amount) {
        return `Q${parseFloat(amount).toFixed(2)}`;
    }

    /**
     * Formatear fecha
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-GT', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }
}

// Inicializar cuando el DOM esté listo
let reconexionManager;
document.addEventListener('DOMContentLoaded', () => {
    reconexionManager = new ReconexionManager();
});
