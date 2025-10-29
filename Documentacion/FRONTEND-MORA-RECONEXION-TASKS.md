# 🎨 TASKS FOR CLAUDE CODE - Frontend Mora & Reconexión

## 📖 HOW TO USE THIS FILE

### Preparation

1. Save this file as `FRONTEND-MORA-RECONEXION-TASKS.md` in the project root
2. Make sure the backend is running (`npm start`)
3. Open terminal in the project folder
4. Execute: `claude-code`
5. Follow the instructions phase by phase

### Workflow

```
YOU say → "Read FRONTEND-MORA-RECONEXION-TASKS.md and execute Phase 1"
       ↓
CLAUDE CODE → Creates/modifies files
       ↓
YOU review → Verify everything works
       ↓
YOU say → "Now execute Phase 2"
       ↓
And so on...
```

### ⚠️ IMPORTANT NOTES

1. **Backend must be running** - The frontend connects to the API
2. **Keep existing styles** - Use the same design system as other pages
3. **Test in browser** - Open with Live Server or similar after each phase

---

## 🎯 PHASE 1: ADD MODULE CARDS TO MAIN PAGE

### Objective

Add two new module cards (Mora and Reconexión) to the main page grid.

### Instruction for Claude Code

```
"Open frontend/pages/mainPage.html and locate the section with class 'modules-grid'. Add these two new module cards AFTER the existing ones, BEFORE the closing </section> tag:"
```

### Code to add

```html
                <!-- Módulo de Mora -->
                <a href="mora.html" class="module-card mora">
                    <div>
                        <div class="module-icon">⚠️</div>
                        <h3 class="module-title">Control de Mora</h3>
                        <p class="module-description">
                            Monitorea y gestiona la mora acumulada de clientes con 
                            pagos vencidos.
                        </p>
                    </div>
                    <ul class="module-features">
                        <li>Cálculo automático de mora</li>
                        <li>Identificación de clientes críticos</li>
                        <li>Historial de pagos vencidos</li>
                        <li>Alertas de corte de servicio</li>
                        <li>Reportes de mora mensual</li>
                    </ul>
                </a>

                <!-- Módulo de Reconexión -->
                <a href="reconexion.html" class="module-card reconexion">
                    <div>
                        <div class="module-icon">🔌</div>
                        <h3 class="module-title">Reconexión de Servicio</h3>
                        <p class="module-description">
                            Gestiona el proceso de reconexión para clientes 
                            con servicio suspendido.
                        </p>
                    </div>
                    <ul class="module-features">
                        <li>Opciones de pago (80% y 100%)</li>
                        <li>Cálculo de costos de reconexión</li>
                        <li>Historial de reconexiones</li>
                        <li>Estados de servicio</li>
                        <li>Procesamiento automático</li>
                    </ul>
                </a>
```

### Also add CSS for the new cards

```
"In the same file mainPage.html, locate the <style> section and add these styles at the end, before </style>:"
```

```css
        /* Estilos para módulos de Mora y Reconexión */
        .module-card.mora {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
        }

        .module-card.reconexion {
            background: linear-gradient(135deg, #51cf66 0%, #37b24d 100%);
        }
```

### ✅ Validation

- Open `frontend/pages/mainPage.html` in browser
- Should see 2 new cards: "Control de Mora" and "Reconexión de Servicio"
- Cards should have red gradient (mora) and green gradient (reconexión)
- Cards should be clickable (will show 404 for now, that's OK)

---

## 🎯 PHASE 2: CREATE MORA PAGE HTML

### Objective

Create the complete HTML page for late fee management.

### Instruction for Claude Code

```
"Create a new file frontend/pages/mora.html with this complete code:"
```

### Complete code

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Control de Mora - Sistema Agua LOTI</title>
    <link rel="stylesheet" href="../css/styles.css">
    <link rel="stylesheet" href="../css/mora.css">
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <button class="back-btn" onclick="window.location.href='mainPage.html'">
                ← Volver al Menú Principal
            </button>
            <h1 class="page-title">⚠️ Control de Mora Acumulada</h1>
            <button class="logout-btn" onclick="AuthUtils.logout()">
                Cerrar Sesión 🔐
            </button>
        </div>

        <!-- Buscador de Cliente -->
        <div class="search-section">
            <h3>Buscar Cliente</h3>
            <div class="search-box">
                <input 
                    type="text" 
                    id="searchCliente" 
                    placeholder="Buscar por nombre, DPI o número de contador..."
                    class="search-input">
                <button class="btn-primary" onclick="moraManager.buscarCliente()">
                    🔍 Buscar
                </button>
            </div>
        </div>

        <!-- Resultado de Búsqueda -->
        <div id="clienteInfo" class="cliente-info" style="display: none;">
            <h3>Información del Cliente</h3>
            <div class="info-grid">
                <div class="info-item">
                    <strong>Nombre:</strong>
                    <span id="clienteNombre"></span>
                </div>
                <div class="info-item">
                    <strong>DPI:</strong>
                    <span id="clienteDPI"></span>
                </div>
                <div class="info-item">
                    <strong>Contador:</strong>
                    <span id="clienteContador"></span>
                </div>
                <div class="info-item">
                    <strong>Estado de Servicio:</strong>
                    <span id="clienteEstado" class="badge"></span>
                </div>
            </div>
            <button class="btn-primary" onclick="moraManager.calcularMora()">
                📊 Calcular Mora
            </button>
        </div>

        <!-- Resultado de Mora -->
        <div id="moraResult" class="mora-result" style="display: none;">
            <div class="mora-header">
                <h3>Resumen de Mora</h3>
                <span id="criticidadBadge" class="criticidad-badge"></span>
            </div>

            <!-- Resumen -->
            <div class="mora-summary">
                <div class="summary-card">
                    <div class="summary-label">Facturas Pendientes</div>
                    <div class="summary-value" id="facturasPendientes">0</div>
                </div>
                <div class="summary-card">
                    <div class="summary-label">Meses Atrasados</div>
                    <div class="summary-value" id="mesesAtrasados">0</div>
                </div>
                <div class="summary-card">
                    <div class="summary-label">Monto Original</div>
                    <div class="summary-value" id="montoOriginal">Q0.00</div>
                </div>
                <div class="summary-card highlight">
                    <div class="summary-label">Mora Acumulada</div>
                    <div class="summary-value" id="moraTotal">Q0.00</div>
                </div>
                <div class="summary-card total">
                    <div class="summary-label">Total a Pagar</div>
                    <div class="summary-value" id="totalAPagar">Q0.00</div>
                </div>
            </div>

            <!-- Alerta de Reconexión -->
            <div id="reconexionAlert" class="reconexion-alert" style="display: none;">
                <div class="alert-icon">🔌</div>
                <div class="alert-content">
                    <strong>⚠️ Cliente Requiere Reconexión</strong>
                    <p>Este cliente tiene más de 2 meses de atraso y requiere proceso de reconexión.</p>
                    <p><strong>Costo de Reconexión: Q<span id="costoReconexion">125.00</span></strong></p>
                </div>
                <button class="btn-reconexion" onclick="window.location.href='reconexion.html?clienteId=' + moraManager.currentClienteId">
                    Ir a Reconexión →
                </button>
            </div>

            <!-- Detalle de Facturas -->
            <div class="facturas-detail">
                <h4>Detalle de Facturas Vencidas</h4>
                <div class="table-responsive">
                    <table class="facturas-table">
                        <thead>
                            <tr>
                                <th>No. Factura</th>
                                <th>Fecha Emisión</th>
                                <th>Fecha Vencimiento</th>
                                <th>Días Vencidos</th>
                                <th>Meses Completos</th>
                                <th>Monto Original</th>
                                <th>% Mora</th>
                                <th>Mora</th>
                                <th>Total con Mora</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody id="facturasTableBody">
                            <!-- Se llenará dinámicamente -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Botones de Acción -->
            <div class="actions-section">
                <button class="btn-secondary" onclick="moraManager.exportarReporte()">
                    📄 Exportar Reporte
                </button>
                <button class="btn-secondary" onclick="moraManager.imprimirEstadoCuenta()">
                    🖨️ Imprimir Estado de Cuenta
                </button>
            </div>
        </div>

        <!-- Lista de Clientes con Mora -->
        <div class="clientes-mora-section">
            <div class="section-header">
                <h3>Clientes con Mora Crítica</h3>
                <button class="btn-secondary" onclick="moraManager.cargarClientesCriticos()">
                    🔄 Actualizar
                </button>
            </div>
            <div class="table-responsive">
                <table class="clientes-table">
                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Contador</th>
                            <th>Meses Atrasados</th>
                            <th>Deuda Total</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="clientesCriticosBody">
                        <!-- Se llenará dinámicamente -->
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Loading -->
        <div id="loading" class="loading" style="display: none;">
            <div class="spinner"></div>
            <p>Cargando...</p>
        </div>

        <!-- Message Display -->
        <div id="message" class="message" style="display: none;"></div>
    </div>

    <!-- Scripts -->
    <script src="../js/auth.js"></script>
    <script src="../js/pageProtection.js"></script>
    <script src="../js/mora.js"></script>
</body>
</html>
```

### ✅ Validation

- File `frontend/pages/mora.html` should exist
- Open in browser (will show layout but no functionality yet)
- Should see search box, empty tables, and styled sections

---

## 🎯 PHASE 3: CREATE MORA CSS

### Objective

Create the stylesheet for the mora page.

### Instruction for Claude Code

```
"Create a new file frontend/css/mora.css with this complete code:"
```

### Complete code

```css
/* ===============================================
   MORA PAGE STYLES
   ============================================= */

/* Search Section */
.search-section {
    background: white;
    padding: 25px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    margin-bottom: 25px;
}

.search-section h3 {
    margin-top: 0;
    margin-bottom: 15px;
    color: #2d3748;
}

.search-box {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 15px;
    align-items: center;
}

.search-input {
    width: 100%;
    padding: 12px 15px;
    border: 2px solid #e1e5e9;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.3s ease;
}

.search-input:focus {
    outline: none;
    border-color: #ff6b6b;
    box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

/* Cliente Info */
.cliente-info {
    background: white;
    padding: 25px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    margin-bottom: 25px;
}

.cliente-info h3 {
    margin-top: 0;
    margin-bottom: 20px;
    color: #2d3748;
}

.info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 15px;
    margin-bottom: 20px;
}

.info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: #f7fafc;
    border-radius: 8px;
    border-left: 4px solid #ff6b6b;
}

.info-item strong {
    color: #4a5568;
    font-weight: 600;
}

.badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
}

.badge.activo {
    background: #c6f6d5;
    color: #22543d;
}

.badge.suspendido {
    background: #fed7d7;
    color: #742a2a;
}

.badge.cortado {
    background: #feebc8;
    color: #7c2d12;
}

/* Mora Result */
.mora-result {
    background: white;
    padding: 25px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    margin-bottom: 25px;
}

.mora-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
    padding-bottom: 15px;
    border-bottom: 2px solid #e2e8f0;
}

.mora-header h3 {
    margin: 0;
    color: #2d3748;
}

.criticidad-badge {
    padding: 8px 20px;
    border-radius: 25px;
    font-weight: 700;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.criticidad-badge.bajo {
    background: #c6f6d5;
    color: #22543d;
}

.criticidad-badge.medio {
    background: #feebc8;
    color: #7c2d12;
}

.criticidad-badge.alto {
    background: #fed7d7;
    color: #742a2a;
}

.criticidad-badge.critico {
    background: #fc8181;
    color: #742a2a;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

/* Mora Summary */
.mora-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 15px;
    margin-bottom: 25px;
}

.summary-card {
    background: #f7fafc;
    padding: 20px;
    border-radius: 10px;
    text-align: center;
    border: 2px solid #e2e8f0;
    transition: all 0.3s ease;
}

.summary-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.summary-card.highlight {
    background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%);
    border-color: #fc8181;
}

.summary-card.total {
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
    color: white;
    border: none;
}

.summary-label {
    font-size: 0.85rem;
    color: #718096;
    margin-bottom: 8px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.summary-card.total .summary-label {
    color: rgba(255,255,255,0.9);
}

.summary-value {
    font-size: 1.8rem;
    font-weight: 700;
    color: #2d3748;
}

.summary-card.total .summary-value {
    color: white;
}

/* Reconexión Alert */
.reconexion-alert {
    background: linear-gradient(135deg, #fef5e7 0%, #fdebd0 100%);
    border: 2px solid #f39c12;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 25px;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 20px;
    align-items: center;
}

.alert-icon {
    font-size: 3rem;
}

.alert-content {
    flex: 1;
}

.alert-content strong {
    display: block;
    color: #c0392b;
    margin-bottom: 8px;
    font-size: 1.1rem;
}

.alert-content p {
    margin: 5px 0;
    color: #7f6000;
}

.btn-reconexion {
    background: linear-gradient(135deg, #51cf66 0%, #37b24d 100%);
    color: white;
    border: none;
    padding: 12px 25px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
}

.btn-reconexion:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(55, 178, 77, 0.4);
}

/* Facturas Detail */
.facturas-detail {
    margin-bottom: 25px;
}

.facturas-detail h4 {
    margin-top: 0;
    margin-bottom: 15px;
    color: #2d3748;
}

.table-responsive {
    overflow-x: auto;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.facturas-table {
    width: 100%;
    border-collapse: collapse;
    background: white;
}

.facturas-table thead {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.facturas-table th {
    padding: 15px 12px;
    text-align: left;
    font-weight: 600;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.facturas-table td {
    padding: 12px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 0.9rem;
}

.facturas-table tbody tr:hover {
    background: #f7fafc;
}

.facturas-table .estado-badge {
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
}

.estado-badge.vigente {
    background: #c6f6d5;
    color: #22543d;
}

.estado-badge.vencido {
    background: #feebc8;
    color: #7c2d12;
}

.estado-badge.critico {
    background: #fc8181;
    color: #742a2a;
}

/* Actions Section */
.actions-section {
    display: flex;
    gap: 15px;
    justify-content: flex-end;
    margin-top: 20px;
}

/* Clientes Mora Section */
.clientes-mora-section {
    background: white;
    padding: 25px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    margin-top: 30px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.section-header h3 {
    margin: 0;
    color: #2d3748;
}

.clientes-table {
    width: 100%;
    border-collapse: collapse;
    background: white;
}

.clientes-table thead {
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
    color: white;
}

.clientes-table th {
    padding: 15px 12px;
    text-align: left;
    font-weight: 600;
    font-size: 0.85rem;
    text-transform: uppercase;
}

.clientes-table td {
    padding: 12px;
    border-bottom: 1px solid #e2e8f0;
}

.clientes-table tbody tr:hover {
    background: #f7fafc;
}

.btn-ver-detalle {
    background: #667eea;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-ver-detalle:hover {
    background: #5568d3;
    transform: translateY(-1px);
}

/* Buttons */
.btn-primary {
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
    color: white;
    border: none;
    padding: 12px 25px;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
}

.btn-secondary {
    background: #718096;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-secondary:hover {
    background: #4a5568;
}

/* Loading */
.loading {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 9999;
}

.spinner {
    border: 4px solid rgba(255,255,255,0.3);
    border-top: 4px solid white;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.loading p {
    color: white;
    margin-top: 15px;
    font-size: 1.1rem;
}

/* Message */
.message {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    border-radius: 8px;
    font-weight: 600;
    z-index: 10000;
    animation: slideIn 0.3s ease;
}

@keyframes slideIn {
    from {
        transform: translateX(400px);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.message.success {
    background: #c6f6d5;
    color: #22543d;
    border: 2px solid #48bb78;
}

.message.error {
    background: #fed7d7;
    color: #742a2a;
    border: 2px solid #fc8181;
}

/* Responsive */
@media (max-width: 768px) {
    .search-box {
        grid-template-columns: 1fr;
    }

    .mora-summary {
        grid-template-columns: 1fr;
    }

    .reconexion-alert {
        grid-template-columns: 1fr;
        text-align: center;
    }

    .alert-icon {
        font-size: 2rem;
    }

    .actions-section {
        flex-direction: column;
    }

    .btn-reconexion {
        width: 100%;
    }

    .facturas-table,
    .clientes-table {
        font-size: 0.75rem;
    }

    .facturas-table th,
    .facturas-table td,
    .clientes-table th,
    .clientes-table td {
        padding: 8px 6px;
    }
}
```

### ✅ Validation

- File `frontend/css/mora.css` should exist
- Refresh `mora.html` in browser
- Page should look properly styled with colors and layout

---

## 🎯 PHASE 4: CREATE MORA JAVASCRIPT

### Objective

Create the JavaScript functionality to interact with the mora API.

### Instruction for Claude Code

```
"Create a new file frontend/js/mora.js with this complete code:"
```

### Complete code

```javascript
/**
 * Gestor de Mora Acumulada
 * Maneja la interacción con el API de mora
 */

class MoraManager {
    constructor() {
        this.API_BASE = 'http://localhost:5000/api';
        this.currentClienteId = null;
        this.currentCliente = null;
        this.init();
    }

    /**
     * Inicialización
     */
    init() {
        console.log('MoraManager inicializado');
        this.cargarClientesCriticos();
        
        // Agregar enter en búsqueda
        const searchInput = document.getElementById('searchCliente');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.buscarCliente();
                }
            });
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

        this.showLoading(true);

        try {
            const response = await AuthUtils.authenticatedFetch(
                `${this.API_BASE}/clientes?search=${encodeURIComponent(searchTerm)}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al buscar cliente');
            }

            if (!data.data || data.data.length === 0) {
                this.showMessage('No se encontró ningún cliente con ese criterio', 'error');
                this.hideClienteInfo();
                return;
            }

            // Si hay múltiples resultados, tomar el primero
            const cliente = data.data[0];
            this.currentCliente = cliente;
            this.currentClienteId = cliente._id;

            this.mostrarInfoCliente(cliente);

        } catch (error) {
            console.error('Error al buscar cliente:', error);
            this.showMessage(error.message, 'error');
            this.hideClienteInfo();
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Mostrar información del cliente
     */
    mostrarInfoCliente(cliente) {
        document.getElementById('clienteNombre').textContent = 
            `${cliente.nombre} ${cliente.apellido}`;
        document.getElementById('clienteDPI').textContent = cliente.dpi || 'N/A';
        document.getElementById('clienteContador').textContent = 
            cliente.numeroContador || 'N/A';
        
        const estadoBadge = document.getElementById('clienteEstado');
        const estado = cliente.estadoServicio || 'activo';
        estadoBadge.textContent = estado.toUpperCase();
        estadoBadge.className = `badge ${estado}`;

        document.getElementById('clienteInfo').style.display = 'block';
        document.getElementById('moraResult').style.display = 'none';
    }

    /**
     * Ocultar información del cliente
     */
    hideClienteInfo() {
        document.getElementById('clienteInfo').style.display = 'none';
        document.getElementById('moraResult').style.display = 'none';
        this.currentCliente = null;
        this.currentClienteId = null;
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
            const response = await AuthUtils.authenticatedFetch(
                `${this.API_BASE}/mora/cliente/${this.currentClienteId}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al calcular mora');
            }

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
            `Q${moraData.montoOriginalTotal.toFixed(2)}`;
        document.getElementById('moraTotal').textContent = 
            `Q${moraData.moraTotal.toFixed(2)}`;
        document.getElementById('totalAPagar').textContent = 
            `Q${moraData.totalAPagar.toFixed(2)}`;

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
            reconexionAlert.style.display = 'grid';
        } else {
            reconexionAlert.style.display = 'none';
        }

        // Llenar tabla de facturas
        this.llenarTablaFacturas(moraData.detalleFacturas);

        // Mostrar resultado
        document.getElementById('moraResult').style.display = 'block';

        // Scroll al resultado
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
                    <td colspan="10" style="text-align: center; padding: 30px;">
                        No hay facturas vencidas
                    </td>
                </tr>
            `;
            return;
        }

        facturas.forEach(factura => {
            const tr = document.createElement('tr');
            
            const fechaEmision = new Date(factura.fechaEmision).toLocaleDateString('es-GT');
            const fechaVencimiento = new Date(factura.fechaVencimiento).toLocaleDateString('es-GT');
            
            tr.innerHTML = `
                <td>${factura.numeroFactura}</td>
                <td>${fechaEmision}</td>
                <td>${fechaVencimiento}</td>
                <td>${factura.diasVencidos}</td>
                <td>${factura.mesesCompletos}</td>
                <td>Q${factura.montoOriginal.toFixed(2)}</td>
                <td>${factura.porcentajeMora.toFixed(2)}%</td>
                <td>Q${factura.montoMora.toFixed(2)}</td>
                <td><strong>Q${factura.totalConMora.toFixed(2)}</strong></td>
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
            // Obtener todos los clientes
            const response = await AuthUtils.authenticatedFetch(
                `${this.API_BASE}/clientes`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al cargar clientes');
            }

            // Filtrar y calcular mora para cada uno (esto es costoso, en producción
            // se debería hacer en el backend)
            this.mostrarClientesCriticos(data.data);

        } catch (error) {
            console.error('Error al cargar clientes críticos:', error);
        }
    }

    /**
     * Mostrar clientes críticos
     */
    mostrarClientesCriticos(clientes) {
        const tbody = document.getElementById('clientesCriticosBody');
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Cargando...</td></tr>';

        // Limitar a primeros 10 para no sobrecargar
        const clientesLimitados = clientes.slice(0, 10);

        tbody.innerHTML = '';

        if (clientesLimitados.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 30px;">
                        No hay clientes para mostrar
                    </td>
                </tr>
            `;
        } else {
            clientesLimitados.forEach(cliente => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${cliente.nombre} ${cliente.apellido}</td>
                    <td>${cliente.numeroContador || 'N/A'}</td>
                    <td>-</td>
                    <td>-</td>
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
        }
    }

    /**
     * Ver detalle de mora de un cliente específico
     */
    async verDetalleMora(clienteId) {
        this.currentClienteId = clienteId;
        
        // Cargar info del cliente primero
        this.showLoading(true);
        try {
            const response = await AuthUtils.authenticatedFetch(
                `${this.API_BASE}/clientes/${clienteId}`
            );
            const data = await response.json();
            
            if (response.ok && data.data) {
                this.currentCliente = data.data;
                this.mostrarInfoCliente(data.data);
                await this.calcularMora();
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
        if (!this.currentClienteId) return;

        this.showMessage('Función de exportación en desarrollo', 'error');
        // TODO: Implementar exportación a PDF/Excel
    }

    /**
     * Imprimir estado de cuenta
     */
    imprimirEstadoCuenta() {
        if (!this.currentClienteId) return;

        window.print();
    }

    /**
     * Mostrar/ocultar loading
     */
    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
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
        messageEl.style.display = 'block';

        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 4000);
    }
}

// Inicializar cuando el DOM esté listo
let moraManager;
document.addEventListener('DOMContentLoaded', () => {
    moraManager = new MoraManager();
});
```

### ✅ Validation

- File `frontend/js/mora.js` should exist
- Open `mora.html` in browser with backend running
- Try searching for a client
- Click "Calcular Mora" button
- Should see mora calculation with real data from backend

---

## 🎯 PHASE 5: TEST MORA FUNCTIONALITY

### Objective

Test the complete mora functionality end-to-end.

### Manual Testing Steps

1. **Start backend server:**

```bash
cd backend
npm start
```

2. **Open mora page:**
   - Navigate to `http://localhost:5500/pages/mainPage.html` (or your Live Server port)
   - Click on "Control de Mora" card
   - Should redirect to `mora.html`

3. **Test client search:**
   - Enter a client name, DPI, or counter number
   - Click "🔍 Buscar"
   - Should display client information

4. **Test mora calculation:**
   - Click "📊 Calcular Mora"
   - Should show:
     - Summary cards with totals
     - Criticality badge
     - Reconnection alert (if applicable)
     - Detailed table of overdue invoices

5. **Test critical clients list:**
   - Scroll to bottom
   - Click "🔄 Actualizar"
   - Should load list of clients
   - Click "Ver Detalle" on any client
   - Should show that client's mora details

### ✅ Validation Checklist

- [ ] Mora page loads without errors
- [ ] Client search works
- [ ] Mora calculation displays correctly
- [ ] Tables populate with data
- [ ] Buttons are functional
- [ ] Reconnection alert shows when applicable
- [ ] Styling looks good
- [ ] Responsive on mobile

---

## 🎯 NEXT STEPS

After completing Phase 5 and verifying mora works correctly:

1. **Phase 6-10 will cover:** Creating the Reconexión page
2. **Including:**
   - HTML page for reconnection
   - CSS styling
   - JavaScript functionality
   - Payment options (80% and 100%)
   - Processing reconnection requests

---

## 🎯 PHASE 6: CREATE RECONEXIÓN PAGE HTML

### Objective

Create the complete HTML page for service reconnection management.

### Instruction for Claude Code

```
"Create a new file frontend/pages/reconexion.html with this complete code:"
```

### Complete code

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reconexión de Servicio - Sistema Agua LOTI</title>
    <link rel="stylesheet" href="../css/styles.css">
    <link rel="stylesheet" href="../css/reconexion.css">
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <button class="back-btn" onclick="window.location.href='mainPage.html'">
                ← Volver al Menú Principal
            </button>
            <h1 class="page-title">🔌 Reconexión de Servicio</h1>
            <button class="logout-btn" onclick="AuthUtils.logout()">
                Cerrar Sesión 🔐
            </button>
        </div>

        <!-- Buscador de Cliente -->
        <div class="search-section">
            <h3>Buscar Cliente para Reconexión</h3>
            <div class="search-box">
                <input 
                    type="text" 
                    id="searchCliente" 
                    placeholder="Buscar por nombre, DPI o número de contador..."
                    class="search-input">
                <button class="btn-primary" onclick="reconexionManager.buscarCliente()">
                    🔍 Buscar
                </button>
            </div>
        </div>

        <!-- Información del Cliente -->
        <div id="clienteInfo" class="cliente-info" style="display: none;">
            <h3>Información del Cliente</h3>
            <div class="info-grid">
                <div class="info-item">
                    <strong>Nombre:</strong>
                    <span id="clienteNombre"></span>
                </div>
                <div class="info-item">
                    <strong>DPI:</strong>
                    <span id="clienteDPI"></span>
                </div>
                <div class="info-item">
                    <strong>Contador:</strong>
                    <span id="clienteContador"></span>
                </div>
                <div class="info-item">
                    <strong>Estado de Servicio:</strong>
                    <span id="clienteEstado" class="badge"></span>
                </div>
                <div class="info-item">
                    <strong>Reconexiones Previas:</strong>
                    <span id="numeroReconexiones">0</span>
                </div>
            </div>
            <button class="btn-primary" onclick="reconexionManager.verificarReconexion()">
                🔍 Verificar Opciones de Reconexión
            </button>
        </div>

        <!-- Opciones de Reconexión -->
        <div id="opcionesReconexion" class="opciones-section" style="display: none;">
            <div class="opciones-header">
                <h3>Opciones de Reconexión Disponibles</h3>
                <span id="mesesAtraso" class="meses-badge"></span>
            </div>

            <!-- Resumen de Deuda -->
            <div class="deuda-summary">
                <div class="summary-item">
                    <div class="summary-label">Deuda Total</div>
                    <div class="summary-value" id="deudaTotal">Q0.00</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Costo de Reconexión</div>
                    <div class="summary-value fixed">Q125.00</div>
                </div>
            </div>

            <!-- Opciones de Pago -->
            <div class="payment-options">
                <!-- Opción 80% -->
                <div class="option-card" id="option80" onclick="reconexionManager.seleccionarOpcion('parcial')">
                    <div class="option-header">
                        <input type="radio" name="paymentOption" value="parcial" id="radioParcial">
                        <label for="radioParcial">
                            <h4>Opción 80% - Pago Parcial</h4>
                        </label>
                    </div>
                    <div class="option-body">
                        <div class="option-detail">
                            <span>Pago de Deuda (80%):</span>
                            <strong id="montoParcialDeuda">Q0.00</strong>
                        </div>
                        <div class="option-detail">
                            <span>Costo de Reconexión:</span>
                            <strong>Q125.00</strong>
                        </div>
                        <div class="option-detail highlight">
                            <span>Saldo Pendiente (20%):</span>
                            <strong id="saldoPendiente80">Q0.00</strong>
                        </div>
                        <div class="option-total">
                            <span>Total a Pagar Ahora:</span>
                            <strong id="totalParcial">Q0.00</strong>
                        </div>
                        <div class="option-info">
                            <p>✓ Reconexión inmediata</p>
                            <p>✓ Pagas el 80% de la deuda</p>
                            <p>⚠️ Quedarás con saldo pendiente</p>
                        </div>
                    </div>
                </div>

                <!-- Opción 100% -->
                <div class="option-card recommended" id="option100" onclick="reconexionManager.seleccionarOpcion('total')">
                    <div class="recommended-badge">⭐ Recomendado</div>
                    <div class="option-header">
                        <input type="radio" name="paymentOption" value="total" id="radioTotal">
                        <label for="radioTotal">
                            <h4>Opción 100% - Pago Total</h4>
                        </label>
                    </div>
                    <div class="option-body">
                        <div class="option-detail">
                            <span>Pago de Deuda (100%):</span>
                            <strong id="montoTotalDeuda">Q0.00</strong>
                        </div>
                        <div class="option-detail">
                            <span>Costo de Reconexión:</span>
                            <strong>Q125.00</strong>
                        </div>
                        <div class="option-detail success">
                            <span>Descuento (5%):</span>
                            <strong id="montoDescuento">-Q0.00</strong>
                        </div>
                        <div class="option-total">
                            <span>Total a Pagar:</span>
                            <strong id="totalCompleto">Q0.00</strong>
                        </div>
                        <div class="option-info">
                            <p>✓ Reconexión inmediata</p>
                            <p>✓ Liquidas toda la deuda</p>
                            <p>✓ 5% de descuento incluido</p>
                            <p>✓ Sin saldo pendiente</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Detalle de Facturas -->
            <div class="facturas-detalle">
                <h4>Facturas que se Pagarán</h4>
                <div id="facturasDetalle"></div>
            </div>

            <!-- Botón de Continuar -->
            <div class="action-buttons">
                <button class="btn-secondary" onclick="reconexionManager.cancelar()">
                    Cancelar
                </button>
                <button class="btn-primary" id="btnContinuar" disabled onclick="reconexionManager.mostrarFormularioPago()">
                    Continuar con Pago →
                </button>
            </div>
        </div>

        <!-- Formulario de Pago -->
        <div id="formularioPago" class="pago-section" style="display: none;">
            <h3>Confirmar Pago de Reconexión</h3>
            
            <div class="pago-resumen">
                <div class="resumen-item">
                    <span>Opción Seleccionada:</span>
                    <strong id="resumenOpcion"></strong>
                </div>
                <div class="resumen-item">
                    <span>Monto de Deuda:</span>
                    <strong id="resumenDeuda"></strong>
                </div>
                <div class="resumen-item">
                    <span>Costo de Reconexión:</span>
                    <strong>Q125.00</strong>
                </div>
                <div class="resumen-item total">
                    <span>Total a Pagar:</span>
                    <strong id="resumenTotal"></strong>
                </div>
            </div>

            <form id="formPago" onsubmit="reconexionManager.procesarPago(event)">
                <div class="form-group">
                    <label for="metodoPago">Método de Pago *</label>
                    <select id="metodoPago" required>
                        <option value="">Seleccione un método</option>
                        <option value="efectivo">Efectivo</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="transferencia">Transferencia Bancaria</option>
                        <option value="cheque">Cheque</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="montoPago">Monto Recibido *</label>
                    <input 
                        type="number" 
                        id="montoPago" 
                        step="0.01" 
                        min="0"
                        placeholder="0.00"
                        required>
                </div>

                <div class="form-group">
                    <label for="referenciaPago">Referencia / No. de Transacción</label>
                    <input 
                        type="text" 
                        id="referenciaPago" 
                        placeholder="Opcional">
                </div>

                <div class="form-group">
                    <label for="observaciones">Observaciones</label>
                    <textarea 
                        id="observaciones" 
                        rows="3"
                        placeholder="Comentarios adicionales (opcional)"></textarea>
                </div>

                <div class="action-buttons">
                    <button type="button" class="btn-secondary" onclick="reconexionManager.volverOpciones()">
                        ← Volver
                    </button>
                    <button type="submit" class="btn-success">
                        ✓ Procesar Reconexión
                    </button>
                </div>
            </form>
        </div>

        <!-- Modal de Confirmación -->
        <div id="modalConfirmacion" class="modal" style="display: none;">
            <div class="modal-content success">
                <div class="modal-icon">✓</div>
                <h2>¡Reconexión Exitosa!</h2>
                <div class="modal-body">
                    <p>La reconexión ha sido procesada correctamente.</p>
                    <div class="confirmacion-detalle">
                        <div class="detalle-item">
                            <span>Cliente:</span>
                            <strong id="confirmCliente"></strong>
                        </div>
                        <div class="detalle-item">
                            <span>Monto Pagado:</span>
                            <strong id="confirmMonto"></strong>
                        </div>
                        <div class="detalle-item">
                            <span>Facturas Pagadas:</span>
                            <strong id="confirmFacturas"></strong>
                        </div>
                        <div class="detalle-item">
                            <span>Saldo Pendiente:</span>
                            <strong id="confirmSaldo"></strong>
                        </div>
                        <div class="detalle-item">
                            <span>Estado del Servicio:</span>
                            <strong class="estado-activo">ACTIVO</strong>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="reconexionManager.imprimirComprobante()">
                        🖨️ Imprimir Comprobante
                    </button>
                    <button class="btn-primary" onclick="reconexionManager.nuevaReconexion()">
                        Nueva Reconexión
                    </button>
                </div>
            </div>
        </div>

        <!-- Loading -->
        <div id="loading" class="loading" style="display: none;">
            <div class="spinner"></div>
            <p>Procesando...</p>
        </div>

        <!-- Message Display -->
        <div id="message" class="message" style="display: none;"></div>
    </div>

    <!-- Scripts -->
    <script src="../js/auth.js"></script>
    <script src="../js/pageProtection.js"></script>
    <script src="../js/reconexion.js"></script>
</body>
</html>
```

### ✅ Validation

- File `frontend/pages/reconexion.html` should exist
- Open in browser (will show layout but no functionality yet)
- Should see search box, payment options cards, and form sections

---

## 🎯 PHASE 7: CREATE RECONEXIÓN CSS

### Objective

Create the stylesheet for the reconnection page with modern design.

### Instruction for Claude Code

```
"Create a new file frontend/css/reconexion.css with this complete code:"
```

### Complete code

```css
/* ===============================================
   RECONEXIÓN PAGE STYLES
   ============================================= */

/* Search Section */
.search-section {
    background: white;
    padding: 25px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    margin-bottom: 25px;
}

.search-section h3 {
    margin-top: 0;
    margin-bottom: 15px;
    color: #2d3748;
}

.search-box {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 15px;
    align-items: center;
}

.search-input {
    width: 100%;
    padding: 12px 15px;
    border: 2px solid #e1e5e9;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.3s ease;
}

.search-input:focus {
    outline: none;
    border-color: #51cf66;
    box-shadow: 0 0 0 3px rgba(81, 207, 102, 0.1);
}

/* Cliente Info */
.cliente-info {
    background: white;
    padding: 25px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    margin-bottom: 25px;
}

.cliente-info h3 {
    margin-top: 0;
    margin-bottom: 20px;
    color: #2d3748;
}

.info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 15px;
    margin-bottom: 20px;
}

.info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: #f7fafc;
    border-radius: 8px;
    border-left: 4px solid #51cf66;
}

.info-item strong {
    color: #4a5568;
    font-weight: 600;
}

.badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
}

.badge.activo {
    background: #c6f6d5;
    color: #22543d;
}

.badge.suspendido {
    background: #fed7d7;
    color: #742a2a;
}

.badge.cortado {
    background: #feebc8;
    color: #7c2d12;
}

/* Opciones Section */
.opciones-section {
    background: white;
    padding: 25px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    margin-bottom: 25px;
}

.opciones-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
    padding-bottom: 15px;
    border-bottom: 2px solid #e2e8f0;
}

.opciones-header h3 {
    margin: 0;
    color: #2d3748;
}

.meses-badge {
    padding: 8px 20px;
    border-radius: 25px;
    font-weight: 700;
    font-size: 0.9rem;
    background: #fc8181;
    color: white;
}

/* Deuda Summary */
.deuda-summary {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 30px;
}

.summary-item {
    background: #f7fafc;
    padding: 20px;
    border-radius: 10px;
    text-align: center;
    border: 2px solid #e2e8f0;
}

.summary-item.fixed {
    background: linear-gradient(135deg, #fef5e7 0%, #fdebd0 100%);
    border-color: #f39c12;
}

.summary-label {
    font-size: 0.85rem;
    color: #718096;
    margin-bottom: 8px;
    font-weight: 600;
    text-transform: uppercase;
}

.summary-value {
    font-size: 2rem;
    font-weight: 700;
    color: #2d3748;
}

.summary-item.fixed .summary-value {
    color: #c0392b;
}

/* Payment Options */
.payment-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 25px;
    margin-bottom: 30px;
}

.option-card {
    background: white;
    border: 3px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
}

.option-card:hover {
    border-color: #51cf66;
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(81, 207, 102, 0.2);
}

.option-card.selected {
    border-color: #51cf66;
    background: linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%);
    box-shadow: 0 8px 20px rgba(81, 207, 102, 0.3);
}

.option-card.recommended {
    border-color: #4299e1;
}

.option-card.recommended.selected {
    border-color: #51cf66;
    background: linear-gradient(135deg, #f0fff4 0%, #c6f6d5 100%);
}

.recommended-badge {
    position: absolute;
    top: -12px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
}

.option-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 15px;
    padding-bottom: 15px;
    border-bottom: 2px solid #e2e8f0;
}

.option-header input[type="radio"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
}

.option-header h4 {
    margin: 0;
    color: #2d3748;
    font-size: 1.2rem;
}

.option-body {
    padding: 10px 0;
}

.option-detail {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #f1f3f4;
}

.option-detail span {
    color: #718096;
    font-size: 0.9rem;
}

.option-detail strong {
    color: #2d3748;
    font-size: 1.1rem;
}

.option-detail.highlight {
    background: #fff5f5;
    padding: 10px;
    border-radius: 6px;
    margin: 10px 0;
    border: 1px solid #fc8181;
}

.option-detail.highlight strong {
    color: #c53030;
}

.option-detail.success {
    background: #f0fff4;
    padding: 10px;
    border-radius: 6px;
    margin: 10px 0;
    border: 1px solid #48bb78;
}

.option-detail.success strong {
    color: #22543d;
}

.option-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    background: linear-gradient(135deg, #51cf66 0%, #37b24d 100%);
    color: white;
    border-radius: 8px;
    margin: 15px 0;
}

.option-total span {
    font-size: 1rem;
    font-weight: 600;
}

.option-total strong {
    font-size: 1.5rem;
    font-weight: 700;
}

.option-info {
    margin-top: 15px;
    padding: 15px;
    background: #f7fafc;
    border-radius: 8px;
}

.option-info p {
    margin: 5px 0;
    font-size: 0.9rem;
    color: #4a5568;
}

/* Facturas Detalle */
.facturas-detalle {
    margin: 25px 0;
    padding: 20px;
    background: #f7fafc;
    border-radius: 10px;
}

.facturas-detalle h4 {
    margin-top: 0;
    margin-bottom: 15px;
    color: #2d3748;
}

#facturasDetalle {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.factura-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: white;
    border-radius: 6px;
    border-left: 4px solid #51cf66;
}

.factura-item.parcial {
    border-left-color: #f39c12;
    background: #fef5e7;
}

.factura-item.pendiente {
    border-left-color: #e74c3c;
    background: #fadbd8;
}

/* Pago Section */
.pago-section {
    background: white;
    padding: 25px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    margin-bottom: 25px;
}

.pago-section h3 {
    margin-top: 0;
    margin-bottom: 20px;
    color: #2d3748;
}

.pago-resumen {
    background: #f7fafc;
    padding: 20px;
    border-radius: 10px;
    margin-bottom: 25px;
    border: 2px solid #e2e8f0;
}

.resumen-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #e2e8f0;
}

.resumen-item:last-child {
    border-bottom: none;
}

.resumen-item span {
    color: #718096;
    font-weight: 500;
}

.resumen-item strong {
    color: #2d3748;
    font-size: 1.1rem;
}

.resumen-item.total {
    background: linear-gradient(135deg, #51cf66 0%, #37b24d 100%);
    color: white;
    padding: 15px;
    border-radius: 8px;
    margin-top: 10px;
}

.resumen-item.total span,
.resumen-item.total strong {
    color: white;
}

.resumen-item.total strong {
    font-size: 1.5rem;
}

/* Form */
.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    color: #2d3748;
    font-weight: 600;
}

.form-group input,
.form-group select,
.form-group textarea {
    width: 100%;
    padding: 12px 15px;
    border: 2px solid #e1e5e9;
    border-radius: 8px;
    font-size: 1rem;
    font-family: inherit;
    transition: all 0.3s ease;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
    outline: none;
    border-color: #51cf66;
    box-shadow: 0 0 0 3px rgba(81, 207, 102, 0.1);
}

.form-group textarea {
    resize: vertical;
}

/* Action Buttons */
.action-buttons {
    display: flex;
    gap: 15px;
    justify-content: flex-end;
    margin-top: 25px;
}

/* Buttons */
.btn-primary {
    background: linear-gradient(135deg, #51cf66 0%, #37b24d 100%);
    color: white;
    border: none;
    padding: 12px 25px;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(81, 207, 102, 0.4);
}

.btn-primary:disabled {
    background: #cbd5e0;
    cursor: not-allowed;
}

.btn-secondary {
    background: #718096;
    color: white;
    border: none;
    padding: 12px 25px;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-secondary:hover {
    background: #4a5568;
}

.btn-success {
    background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
    color: white;
    border: none;
    padding: 15px 30px;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-success:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(72, 187, 120, 0.4);
}

/* Modal */
.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.modal-content {
    background: white;
    padding: 40px;
    border-radius: 16px;
    max-width: 600px;
    width: 90%;
    animation: slideUp 0.3s ease;
}

@keyframes slideUp {
    from {
        transform: translateY(50px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.modal-content.success {
    border-top: 6px solid #48bb78;
}

.modal-icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 20px;
    background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
    color: white;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 3rem;
    font-weight: 700;
}

.modal-content h2 {
    text-align: center;
    color: #2d3748;
    margin-bottom: 25px;
}

.modal-body {
    margin-bottom: 25px;
}

.modal-body p {
    text-align: center;
    color: #718096;
    margin-bottom: 20px;
}

.confirmacion-detalle {
    background: #f7fafc;
    padding: 20px;
    border-radius: 10px;
}

.detalle-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #e2e8f0;
}

.detalle-item:last-child {
    border-bottom: none;
}

.detalle-item span {
    color: #718096;
}

.detalle-item strong {
    color: #2d3748;
    font-size: 1.1rem;
}

.estado-activo {
    color: #22543d !important;
    background: #c6f6d5;
    padding: 4px 12px;
    border-radius: 20px;
    font-weight: 600;
}

.modal-actions {
    display: flex;
    gap: 15px;
    justify-content: center;
    margin-top: 25px;
}

/* Loading */
.loading {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 9999;
}

.spinner {
    border: 4px solid rgba(255,255,255,0.3);
    border-top: 4px solid white;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.loading p {
    color: white;
    margin-top: 15px;
    font-size: 1.1rem;
}

/* Message */
.message {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    border-radius: 8px;
    font-weight: 600;
    z-index: 10000;
    animation: slideIn 0.3s ease;
}

@keyframes slideIn {
    from {
        transform: translateX(400px);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.message.success {
    background: #c6f6d5;
    color: #22543d;
    border: 2px solid #48bb78;
}

.message.error {
    background: #fed7d7;
    color: #742a2a;
    border: 2px solid #fc8181;
}

/* Responsive */
@media (max-width: 968px) {
    .payment-options {
        grid-template-columns: 1fr;
    }

    .deuda-summary {
        grid-template-columns: 1fr;
    }

    .search-box {
        grid-template-columns: 1fr;
    }

    .action-buttons {
        flex-direction: column;
    }

    .modal-content {
        padding: 25px;
    }

    .modal-icon {
        width: 60px;
        height: 60px;
        font-size: 2rem;
    }
}
```

### ✅ Validation

- File `frontend/css/reconexion.css` should exist
- Refresh `reconexion.html` in browser
- Page should look properly styled with green theme
- Payment option cards should be visible

---

## 🎯 PHASE 8: CREATE RECONEXIÓN JAVASCRIPT

### Objective

Create the JavaScript functionality to interact with the reconnection API.

### Instruction for Claude Code

```
"Create a new file frontend/js/reconexion.js with this complete code:"
```

### Complete code

```javascript
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
                `${this.API_BASE}/clientes?search=${encodeURIComponent(searchTerm)}`
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
            `${cliente.nombre} ${cliente.apellido}`;
        document.getElementById('clienteDPI').textContent = cliente.dpi || 'N/A';
        document.getElementById('clienteContador').textContent = 
            cliente.numeroContador || 'N/A';
        document.getElementById('numeroReconexiones').textContent = 
            cliente.numeroReconexiones || 0;
        
        const estadoBadge = document.getElementById('clienteEstado');
        const estado = cliente.estadoServicio || 'activo';
        estadoBadge.textContent = estado.toUpperCase();
        estadoBadge.className = `badge ${estado}`;

        document.getElementById('clienteInfo').style.display = 'block';
        document.getElementById('opcionesReconexion').style.display = 'none';
        document.getElementById('formularioPago').style.display = 'none';
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
        document.getElementById('opcionesReconexion').style.display = 'block';
        
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
        document.getElementById('opcionesReconexion').style.display = 'none';
        document.getElementById('formularioPago').style.display = 'block';

        // Scroll
        document.getElementById('formularioPago').scrollIntoView({ 
            behavior: 'smooth' 
        });
    }

    /**
     * Volver a opciones
     */
    volverOpciones() {
        document.getElementById('formularioPago').style.display = 'none';
        document.getElementById('opcionesReconexion').style.display = 'block';
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
            `${this.currentCliente.nombre} ${this.currentCliente.apellido}`;
        document.getElementById('confirmMonto').textContent = 
            `Q${resultado.montoPagado || '0.00'}`;
        document.getElementById('confirmFacturas').textContent = 
            resultado.facturasPagadas || 0;
        document.getElementById('confirmSaldo').textContent = 
            `Q${(resultado.saldoPendiente || 0).toFixed(2)}`;

        // Ocultar formulario
        document.getElementById('formularioPago').style.display = 'none';

        // Mostrar modal
        document.getElementById('modalConfirmacion').style.display = 'flex';
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
        document.getElementById('modalConfirmacion').style.display = 'none';
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
        document.getElementById('clienteInfo').style.display = 'none';
        document.getElementById('opcionesReconexion').style.display = 'none';
        document.getElementById('formularioPago').style.display = 'none';
    }

    /**
     * Mostrar/ocultar loading
     */
    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
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
        messageEl.style.display = 'block';

        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 5000);
    }
}

// Inicializar cuando el DOM esté listo
let reconexionManager;
document.addEventListener('DOMContentLoaded', () => {
    reconexionManager = new ReconexionManager();
});
```

### ✅ Validation

- File `frontend/js/reconexion.js` should exist
- Open `reconexion.html` in browser with backend running
- Test all functionality:
  - Search client
  - View reconnection options
  - Select payment option
  - Fill payment form
  - Process reconnection

---

## 🎯 PHASE 9: INTEGRATION AND TESTING

### Objective

Test the complete reconnection flow end-to-end.

### Manual Testing Checklist

#### **1. Test Client Search:**

- [ ] Open `reconexion.html`
- [ ] Search for a client with 2+ months overdue
- [ ] Verify client information displays correctly

#### **2. Test Reconnection Options:**

- [ ] Click "Verificar Opciones de Reconexión"
- [ ] Verify both payment options display:
  - [ ] 80% option shows correct calculations
  - [ ] 100% option shows correct calculations + discount
  - [ ] Total amounts are correct
- [ ] Verify invoice details table shows

#### **3. Test Option Selection:**

- [ ] Click on 80% option card
- [ ] Verify card highlights/selects
- [ ] Verify "Continuar" button enables
- [ ] Click on 100% option card
- [ ] Verify selection changes

#### **4. Test Payment Form:**

- [ ] Click "Continuar con Pago"
- [ ] Verify form displays with correct summary
- [ ] Verify amount pre-filled
- [ ] Try submitting without filling required fields
- [ ] Verify validation works

#### **5. Test Reconnection Processing:**

- [ ] Fill all required fields correctly
- [ ] Click "Procesar Reconexión"
- [ ] Verify loading shows
- [ ] Verify success modal displays
- [ ] Verify all confirmation details are correct

#### **6. Test Navigation:**

- [ ] Test "Volver" buttons work
- [ ] Test "Cancelar" with confirmation
- [ ] Test "Nueva Reconexión" resets form
- [ ] Test navigation from mora page with URL parameter

#### **7. Test Edge Cases:**

- [ ] Search for client with <2 months overdue
- [ ] Verify proper error message
- [ ] Test with invalid amount
- [ ] Test network error handling

### ✅ Validation

- [ ] All searches work correctly
- [ ] Calculations are accurate
- [ ] Payment options display properly
- [ ] Form validation works
- [ ] Reconnection processes successfully
- [ ] Client status updates to "activo"
- [ ] Invoices marked as paid
- [ ] UI is responsive on mobile
- [ ] No console errors

---

## 🎯 PHASE 10: FINAL INTEGRATION AND DOCUMENTATION

### Objective

Ensure all modules work together and document the complete system.

### Integration Points to Verify

#### **1. Navigation Flow:**

```
Main Page → Mora → Reconexión
Main Page → Reconexión (direct)
```

- [ ] Verify both cards in main page work
- [ ] Verify "Ir a Reconexión" button in mora page passes clienteId
- [ ] Verify reconexion loads client automatically from URL parameter

#### **2. Data Consistency:**

- [ ] Create invoice in Facturas module
- [ ] Let it expire (2+ months)
- [ ] Verify appears in Mora module
- [ ] Verify appears in Reconexión options
- [ ] Process reconnection
- [ ] Verify invoice status updates in Facturas module
- [ ] Verify client service status updates

#### **3. Backend Integration:**

- [ ] All API endpoints working
- [ ] Proper error handling
- [ ] JWT authentication working
- [ ] Transactions rollback on error

### Create Documentation File

### Instruction for Claude Code

```
"Create a new file MANUAL-USO-MORA-RECONEXION.md in the project root with this content:"
```

### Complete documentation

```markdown
# 📖 Manual de Uso - Módulos de Mora y Reconexión

## 🎯 Propósito del Sistema

Los módulos de **Mora** y **Reconexión** permiten:
- Calcular mora acumulada para clientes morosos
- Identificar clientes críticos que requieren reconexión
- Procesar pagos con opciones flexibles (80% y 100%)
- Restablecer servicio de agua para clientes suspendidos

---

## 🚀 Flujo de Trabajo

### **Escenario 1: Cliente con 1 mes de atraso**
1. Ir a módulo **Mora**
2. Buscar cliente
3. Ver deuda con mora calculada (7% mensual)
4. Cliente puede pagar normalmente en módulo **Pagos**

### **Escenario 2: Cliente con 2+ meses de atraso (CRÍTICO)**
1. Ir a módulo **Mora**
2. Buscar cliente
3. Sistema muestra alerta: "⚠️ Requiere Reconexión"
4. Clic en "Ir a Reconexión"
5. Ver opciones de pago:
   - **Opción 80%:** Paga 80% + Q125 reconexión
   - **Opción 100%:** Paga 100% + Q125 reconexión (5% descuento)
6. Seleccionar opción
7. Completar formulario de pago
8. Procesar reconexión
9. Servicio restablecido automáticamente

---

## 📊 Módulo de Mora

### **Funciones:**
- Buscar clientes por nombre, DPI o contador
- Calcular mora acumulada (7% mensual)
- Ver detalle de facturas vencidas
- Identificar nivel de criticidad (bajo, medio, alto, crítico)
- Detectar automáticamente quién requiere reconexión

### **Cómo usar:**
1. Abrir **Control de Mora** desde el menú principal
2. Buscar cliente en el buscador
3. Clic en "Calcular Mora"
4. Revisar resumen y detalle de facturas
5. Si aparece alerta de reconexión, seguir a ese módulo

### **Niveles de Criticidad:**
- **Bajo:** <1 mes de atraso
- **Medio:** 1 mes de atraso
- **Alto:** Casi 2 meses
- **Crítico:** 2+ meses (requiere reconexión)

---

## 🔌 Módulo de Reconexión

### **Funciones:**
- Verificar opciones de pago para reconexión
- Calcular costos con costo de reconexión (Q125)
- Procesar pago con dos opciones:
  - **80%:** Opción económica con saldo pendiente
  - **100%:** Liquida toda la deuda con 5% descuento
- Actualizar automáticamente estado de servicio a "activo"

### **Cómo usar:**
1. Abrir **Reconexión de Servicio** desde el menú
2. Buscar cliente
3. Clic en "Verificar Opciones de Reconexión"
4. Seleccionar opción de pago (80% o 100%)
5. Clic en "Continuar con Pago"
6. Completar formulario:
   - Método de pago
   - Monto (pre-llenado)
   - Referencia (opcional)
7. Clic en "Procesar Reconexión"
8. Confirmar reconexión exitosa

### **Diferencias entre Opciones:**

| Característica | Opción 80% | Opción 100% |
|----------------|------------|-------------|
| Deuda a pagar | 80% | 100% |
| Costo reconexión | Q125 | Q125 |
| Descuento | No | 5% |
| Saldo pendiente | Sí (20%) | No |
| Recomendación | Emergencias | Liquidación total |

---

## ⚠️ Puntos Importantes

### **Cuándo NO usar Reconexión:**
- Cliente tiene menos de 2 meses de atraso
- Cliente ya está con servicio activo
- Deuda puede pagarse normalmente

### **Validaciones del Sistema:**
- No permite reconexión si <2 meses de atraso
- Verifica que el monto sea exacto
- Valida método de pago
- Usa transacciones para garantizar integridad

### **Después de Reconexión:**
- Estado del servicio cambia a "ACTIVO"
- Facturas marcadas como "PAGADAS"
- Contador de reconexiones incrementa
- Si eligió 80%, queda saldo pendiente visible

---

## 🧪 Casos de Prueba

### **Caso 1: Reconexión Exitosa (100%)**
```

Cliente: Juan Pérez
Deuda: Q150.00
Mora: Q31.50
Total: Q181.50

Opción: 100%
Costo: Q181.50 + Q125 = Q306.50
Descuento 5%: -Q9.08
TOTAL: Q297.42

Resultado: Servicio reconectado, sin saldo pendiente

```

### **Caso 2: Reconexión Parcial (80%)**
```

Cliente: María López
Deuda: Q200.00
Mora: Q42.00
Total: Q242.00

Opción: 80%
Costo: Q193.60 (80%) + Q125 = Q318.60
Saldo pendiente: Q48.40

Resultado: Servicio reconectado, con saldo Q48.40

```

---

## 🔧 Solución de Problemas

### **"Cliente no requiere reconexión"**
→ El cliente tiene menos de 2 meses de atraso
→ Puede pagar normalmente en módulo de Pagos

### **"Error al procesar reconexión"**
→ Verificar que backend esté corriendo
→ Verificar conexión a MongoDB
→ Revisar que el monto sea exacto

### **"No se encontró el cliente"**
→ Verificar ortografía en la búsqueda
→ Intentar buscar por DPI o número de contador

---

## 📞 Soporte

Para dudas o problemas técnicos:
1. Verificar que backend esté corriendo: `npm start`
2. Revisar consola del navegador (F12) para errores
3. Verificar logs del servidor
4. Consultar documentación técnica

---

**Sistema Agua LOTI - Huehuetenango, Guatemala**
**Versión 2.0 - Módulos de Mora y Reconexión**
```

### ✅ Final Validation

- [ ] Documentation file created
- [ ] All modules tested end-to-end
- [ ] Navigation between modules works
- [ ] Data persists correctly in database
- [ ] Client service status updates properly
- [ ] System ready for production use

---

## 🎉 IMPLEMENTATION COMPLETE

You have successfully implemented:

- ✅ Mora calculation module (frontend + backend)
- ✅ Reconnection module with payment options (frontend + backend)
- ✅ Integration with existing system
- ✅ Complete documentation

### 📊 Summary

**Files Created:**

- `frontend/pages/mora.html`
- `frontend/pages/reconexion.html`
- `frontend/css/mora.css`
- `frontend/css/reconexion.css`
- `frontend/js/mora.js`
- `frontend/js/reconexion.js`
- `MANUAL-USO-MORA-RECONEXION.md`

**Files Modified:**

- `frontend/pages/mainPage.html` (added 2 module cards)

**Backend Already Created (Phases 1-10 from first task file):**

- Models, services, controllers, and routes for mora and reconnection

### 🚀 Next Steps

1. Test thoroughly with real data
2. Train users on new modules
3. Monitor for any issues
4. Consider adding:
   - PDF export for reports
   - Email notifications for critical clients
   - Automatic suspension for 2+ months overdue
   - Dashboard metrics for mora and reconnections

## Congratulations! Your water management system is now complete! 🎊
