\# 🎨 TASKS FOR CLAUDE CODE - Frontend Mora \& Reconexión



\## 📖 HOW TO USE THIS FILE



\### Preparation:

1\. Save this file as `FRONTEND-MORA-RECONEXION-TASKS.md` in the project root

2\. Make sure the backend is running (`npm start`)

3\. Open terminal in the project folder

4\. Execute: `claude-code`

5\. Follow the instructions phase by phase



\### Workflow:

```

YOU say → "Read FRONTEND-MORA-RECONEXION-TASKS.md and execute Phase 1"

&nbsp;      ↓

CLAUDE CODE → Creates/modifies files

&nbsp;      ↓

YOU review → Verify everything works

&nbsp;      ↓

YOU say → "Now execute Phase 2"

&nbsp;      ↓

And so on...

```



\### ⚠️ IMPORTANT NOTES:

1\. \*\*Backend must be running\*\* - The frontend connects to the API

2\. \*\*Keep existing styles\*\* - Use the same design system as other pages

3\. \*\*Test in browser\*\* - Open with Live Server or similar after each phase



---



\## 🎯 PHASE 1: ADD MODULE CARDS TO MAIN PAGE



\### Objective:

Add two new module cards (Mora and Reconexión) to the main page grid.



\### Instruction for Claude Code:

```

"Open frontend/pages/mainPage.html and locate the section with class 'modules-grid'. Add these two new module cards AFTER the existing ones, BEFORE the closing </section> tag:"

```



\### Code to add:

```html

&nbsp;               <!-- Módulo de Mora -->

&nbsp;               <a href="mora.html" class="module-card mora">

&nbsp;                   <div>

&nbsp;                       <div class="module-icon">⚠️</div>

&nbsp;                       <h3 class="module-title">Control de Mora</h3>

&nbsp;                       <p class="module-description">

&nbsp;                           Monitorea y gestiona la mora acumulada de clientes con 

&nbsp;                           pagos vencidos.

&nbsp;                       </p>

&nbsp;                   </div>

&nbsp;                   <ul class="module-features">

&nbsp;                       <li>Cálculo automático de mora</li>

&nbsp;                       <li>Identificación de clientes críticos</li>

&nbsp;                       <li>Historial de pagos vencidos</li>

&nbsp;                       <li>Alertas de corte de servicio</li>

&nbsp;                       <li>Reportes de mora mensual</li>

&nbsp;                   </ul>

&nbsp;               </a>



&nbsp;               <!-- Módulo de Reconexión -->

&nbsp;               <a href="reconexion.html" class="module-card reconexion">

&nbsp;                   <div>

&nbsp;                       <div class="module-icon">🔌</div>

&nbsp;                       <h3 class="module-title">Reconexión de Servicio</h3>

&nbsp;                       <p class="module-description">

&nbsp;                           Gestiona el proceso de reconexión para clientes 

&nbsp;                           con servicio suspendido.

&nbsp;                       </p>

&nbsp;                   </div>

&nbsp;                   <ul class="module-features">

&nbsp;                       <li>Opciones de pago (80% y 100%)</li>

&nbsp;                       <li>Cálculo de costos de reconexión</li>

&nbsp;                       <li>Historial de reconexiones</li>

&nbsp;                       <li>Estados de servicio</li>

&nbsp;                       <li>Procesamiento automático</li>

&nbsp;                   </ul>

&nbsp;               </a>

```



\### Also add CSS for the new cards:

```

"In the same file mainPage.html, locate the <style> section and add these styles at the end, before </style>:"

```



```css

&nbsp;       /\* Estilos para módulos de Mora y Reconexión \*/

&nbsp;       .module-card.mora {

&nbsp;           background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);

&nbsp;       }



&nbsp;       .module-card.reconexion {

&nbsp;           background: linear-gradient(135deg, #51cf66 0%, #37b24d 100%);

&nbsp;       }

```



\### ✅ Validation:

\- Open `frontend/pages/mainPage.html` in browser

\- Should see 2 new cards: "Control de Mora" and "Reconexión de Servicio"

\- Cards should have red gradient (mora) and green gradient (reconexión)

\- Cards should be clickable (will show 404 for now, that's OK)



---



\## 🎯 PHASE 2: CREATE MORA PAGE HTML



\### Objective:

Create the complete HTML page for late fee management.



\### Instruction for Claude Code:

```

"Create a new file frontend/pages/mora.html with this complete code:"

```



\### Complete code:

```html

<!DOCTYPE html>

<html lang="es">

<head>

&nbsp;   <meta charset="UTF-8">

&nbsp;   <meta name="viewport" content="width=device-width, initial-scale=1.0">

&nbsp;   <title>Control de Mora - Sistema Agua LOTI</title>

&nbsp;   <link rel="stylesheet" href="../css/styles.css">

&nbsp;   <link rel="stylesheet" href="../css/mora.css">

</head>

<body>

&nbsp;   <div class="container">

&nbsp;       <!-- Header -->

&nbsp;       <div class="header">

&nbsp;           <button class="back-btn" onclick="window.location.href='mainPage.html'">

&nbsp;               ← Volver al Menú Principal

&nbsp;           </button>

&nbsp;           <h1 class="page-title">⚠️ Control de Mora Acumulada</h1>

&nbsp;           <button class="logout-btn" onclick="AuthUtils.logout()">

&nbsp;               Cerrar Sesión 🔐

&nbsp;           </button>

&nbsp;       </div>



&nbsp;       <!-- Buscador de Cliente -->

&nbsp;       <div class="search-section">

&nbsp;           <h3>Buscar Cliente</h3>

&nbsp;           <div class="search-box">

&nbsp;               <input 

&nbsp;                   type="text" 

&nbsp;                   id="searchCliente" 

&nbsp;                   placeholder="Buscar por nombre, DPI o número de contador..."

&nbsp;                   class="search-input">

&nbsp;               <button class="btn-primary" onclick="moraManager.buscarCliente()">

&nbsp;                   🔍 Buscar

&nbsp;               </button>

&nbsp;           </div>

&nbsp;       </div>



&nbsp;       <!-- Resultado de Búsqueda -->

&nbsp;       <div id="clienteInfo" class="cliente-info" style="display: none;">

&nbsp;           <h3>Información del Cliente</h3>

&nbsp;           <div class="info-grid">

&nbsp;               <div class="info-item">

&nbsp;                   <strong>Nombre:</strong>

&nbsp;                   <span id="clienteNombre"></span>

&nbsp;               </div>

&nbsp;               <div class="info-item">

&nbsp;                   <strong>DPI:</strong>

&nbsp;                   <span id="clienteDPI"></span>

&nbsp;               </div>

&nbsp;               <div class="info-item">

&nbsp;                   <strong>Contador:</strong>

&nbsp;                   <span id="clienteContador"></span>

&nbsp;               </div>

&nbsp;               <div class="info-item">

&nbsp;                   <strong>Estado de Servicio:</strong>

&nbsp;                   <span id="clienteEstado" class="badge"></span>

&nbsp;               </div>

&nbsp;           </div>

&nbsp;           <button class="btn-primary" onclick="moraManager.calcularMora()">

&nbsp;               📊 Calcular Mora

&nbsp;           </button>

&nbsp;       </div>



&nbsp;       <!-- Resultado de Mora -->

&nbsp;       <div id="moraResult" class="mora-result" style="display: none;">

&nbsp;           <div class="mora-header">

&nbsp;               <h3>Resumen de Mora</h3>

&nbsp;               <span id="criticidadBadge" class="criticidad-badge"></span>

&nbsp;           </div>



&nbsp;           <!-- Resumen -->

&nbsp;           <div class="mora-summary">

&nbsp;               <div class="summary-card">

&nbsp;                   <div class="summary-label">Facturas Pendientes</div>

&nbsp;                   <div class="summary-value" id="facturasPendientes">0</div>

&nbsp;               </div>

&nbsp;               <div class="summary-card">

&nbsp;                   <div class="summary-label">Meses Atrasados</div>

&nbsp;                   <div class="summary-value" id="mesesAtrasados">0</div>

&nbsp;               </div>

&nbsp;               <div class="summary-card">

&nbsp;                   <div class="summary-label">Monto Original</div>

&nbsp;                   <div class="summary-value" id="montoOriginal">Q0.00</div>

&nbsp;               </div>

&nbsp;               <div class="summary-card highlight">

&nbsp;                   <div class="summary-label">Mora Acumulada</div>

&nbsp;                   <div class="summary-value" id="moraTotal">Q0.00</div>

&nbsp;               </div>

&nbsp;               <div class="summary-card total">

&nbsp;                   <div class="summary-label">Total a Pagar</div>

&nbsp;                   <div class="summary-value" id="totalAPagar">Q0.00</div>

&nbsp;               </div>

&nbsp;           </div>



&nbsp;           <!-- Alerta de Reconexión -->

&nbsp;           <div id="reconexionAlert" class="reconexion-alert" style="display: none;">

&nbsp;               <div class="alert-icon">🔌</div>

&nbsp;               <div class="alert-content">

&nbsp;                   <strong>⚠️ Cliente Requiere Reconexión</strong>

&nbsp;                   <p>Este cliente tiene más de 2 meses de atraso y requiere proceso de reconexión.</p>

&nbsp;                   <p><strong>Costo de Reconexión: Q<span id="costoReconexion">125.00</span></strong></p>

&nbsp;               </div>

&nbsp;               <button class="btn-reconexion" onclick="window.location.href='reconexion.html?clienteId=' + moraManager.currentClienteId">

&nbsp;                   Ir a Reconexión →

&nbsp;               </button>

&nbsp;           </div>



&nbsp;           <!-- Detalle de Facturas -->

&nbsp;           <div class="facturas-detail">

&nbsp;               <h4>Detalle de Facturas Vencidas</h4>

&nbsp;               <div class="table-responsive">

&nbsp;                   <table class="facturas-table">

&nbsp;                       <thead>

&nbsp;                           <tr>

&nbsp;                               <th>No. Factura</th>

&nbsp;                               <th>Fecha Emisión</th>

&nbsp;                               <th>Fecha Vencimiento</th>

&nbsp;                               <th>Días Vencidos</th>

&nbsp;                               <th>Meses Completos</th>

&nbsp;                               <th>Monto Original</th>

&nbsp;                               <th>% Mora</th>

&nbsp;                               <th>Mora</th>

&nbsp;                               <th>Total con Mora</th>

&nbsp;                               <th>Estado</th>

&nbsp;                           </tr>

&nbsp;                       </thead>

&nbsp;                       <tbody id="facturasTableBody">

&nbsp;                           <!-- Se llenará dinámicamente -->

&nbsp;                       </tbody>

&nbsp;                   </table>

&nbsp;               </div>

&nbsp;           </div>



&nbsp;           <!-- Botones de Acción -->

&nbsp;           <div class="actions-section">

&nbsp;               <button class="btn-secondary" onclick="moraManager.exportarReporte()">

&nbsp;                   📄 Exportar Reporte

&nbsp;               </button>

&nbsp;               <button class="btn-secondary" onclick="moraManager.imprimirEstadoCuenta()">

&nbsp;                   🖨️ Imprimir Estado de Cuenta

&nbsp;               </button>

&nbsp;           </div>

&nbsp;       </div>



&nbsp;       <!-- Lista de Clientes con Mora -->

&nbsp;       <div class="clientes-mora-section">

&nbsp;           <div class="section-header">

&nbsp;               <h3>Clientes con Mora Crítica</h3>

&nbsp;               <button class="btn-secondary" onclick="moraManager.cargarClientesCriticos()">

&nbsp;                   🔄 Actualizar

&nbsp;               </button>

&nbsp;           </div>

&nbsp;           <div class="table-responsive">

&nbsp;               <table class="clientes-table">

&nbsp;                   <thead>

&nbsp;                       <tr>

&nbsp;                           <th>Cliente</th>

&nbsp;                           <th>Contador</th>

&nbsp;                           <th>Meses Atrasados</th>

&nbsp;                           <th>Deuda Total</th>

&nbsp;                           <th>Estado</th>

&nbsp;                           <th>Acciones</th>

&nbsp;                       </tr>

&nbsp;                   </thead>

&nbsp;                   <tbody id="clientesCriticosBody">

&nbsp;                       <!-- Se llenará dinámicamente -->

&nbsp;                   </tbody>

&nbsp;               </table>

&nbsp;           </div>

&nbsp;       </div>



&nbsp;       <!-- Loading -->

&nbsp;       <div id="loading" class="loading" style="display: none;">

&nbsp;           <div class="spinner"></div>

&nbsp;           <p>Cargando...</p>

&nbsp;       </div>



&nbsp;       <!-- Message Display -->

&nbsp;       <div id="message" class="message" style="display: none;"></div>

&nbsp;   </div>



&nbsp;   <!-- Scripts -->

&nbsp;   <script src="../js/auth.js"></script>

&nbsp;   <script src="../js/pageProtection.js"></script>

&nbsp;   <script src="../js/mora.js"></script>

</body>

</html>

```



\### ✅ Validation:

\- File `frontend/pages/mora.html` should exist

\- Open in browser (will show layout but no functionality yet)

\- Should see search box, empty tables, and styled sections



---



\## 🎯 PHASE 3: CREATE MORA CSS



\### Objective:

Create the stylesheet for the mora page.



\### Instruction for Claude Code:

```

"Create a new file frontend/css/mora.css with this complete code:"

```



\### Complete code:

```css

/\* ===============================================

&nbsp;  MORA PAGE STYLES

&nbsp;  ============================================= \*/



/\* Search Section \*/

.search-section {

&nbsp;   background: white;

&nbsp;   padding: 25px;

&nbsp;   border-radius: 12px;

&nbsp;   box-shadow: 0 2px 8px rgba(0,0,0,0.08);

&nbsp;   margin-bottom: 25px;

}



.search-section h3 {

&nbsp;   margin-top: 0;

&nbsp;   margin-bottom: 15px;

&nbsp;   color: #2d3748;

}



.search-box {

&nbsp;   display: grid;

&nbsp;   grid-template-columns: 1fr auto;

&nbsp;   gap: 15px;

&nbsp;   align-items: center;

}



.search-input {

&nbsp;   width: 100%;

&nbsp;   padding: 12px 15px;

&nbsp;   border: 2px solid #e1e5e9;

&nbsp;   border-radius: 8px;

&nbsp;   font-size: 1rem;

&nbsp;   transition: all 0.3s ease;

}



.search-input:focus {

&nbsp;   outline: none;

&nbsp;   border-color: #ff6b6b;

&nbsp;   box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);

}



/\* Cliente Info \*/

.cliente-info {

&nbsp;   background: white;

&nbsp;   padding: 25px;

&nbsp;   border-radius: 12px;

&nbsp;   box-shadow: 0 2px 8px rgba(0,0,0,0.08);

&nbsp;   margin-bottom: 25px;

}



.cliente-info h3 {

&nbsp;   margin-top: 0;

&nbsp;   margin-bottom: 20px;

&nbsp;   color: #2d3748;

}



.info-grid {

&nbsp;   display: grid;

&nbsp;   grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));

&nbsp;   gap: 15px;

&nbsp;   margin-bottom: 20px;

}



.info-item {

&nbsp;   display: flex;

&nbsp;   justify-content: space-between;

&nbsp;   align-items: center;

&nbsp;   padding: 12px;

&nbsp;   background: #f7fafc;

&nbsp;   border-radius: 8px;

&nbsp;   border-left: 4px solid #ff6b6b;

}



.info-item strong {

&nbsp;   color: #4a5568;

&nbsp;   font-weight: 600;

}



.badge {

&nbsp;   padding: 4px 12px;

&nbsp;   border-radius: 20px;

&nbsp;   font-size: 0.85rem;

&nbsp;   font-weight: 600;

}



.badge.activo {

&nbsp;   background: #c6f6d5;

&nbsp;   color: #22543d;

}



.badge.suspendido {

&nbsp;   background: #fed7d7;

&nbsp;   color: #742a2a;

}



.badge.cortado {

&nbsp;   background: #feebc8;

&nbsp;   color: #7c2d12;

}



/\* Mora Result \*/

.mora-result {

&nbsp;   background: white;

&nbsp;   padding: 25px;

&nbsp;   border-radius: 12px;

&nbsp;   box-shadow: 0 2px 8px rgba(0,0,0,0.08);

&nbsp;   margin-bottom: 25px;

}



.mora-header {

&nbsp;   display: flex;

&nbsp;   justify-content: space-between;

&nbsp;   align-items: center;

&nbsp;   margin-bottom: 25px;

&nbsp;   padding-bottom: 15px;

&nbsp;   border-bottom: 2px solid #e2e8f0;

}



.mora-header h3 {

&nbsp;   margin: 0;

&nbsp;   color: #2d3748;

}



.criticidad-badge {

&nbsp;   padding: 8px 20px;

&nbsp;   border-radius: 25px;

&nbsp;   font-weight: 700;

&nbsp;   font-size: 0.9rem;

&nbsp;   text-transform: uppercase;

&nbsp;   letter-spacing: 0.5px;

}



.criticidad-badge.bajo {

&nbsp;   background: #c6f6d5;

&nbsp;   color: #22543d;

}



.criticidad-badge.medio {

&nbsp;   background: #feebc8;

&nbsp;   color: #7c2d12;

}



.criticidad-badge.alto {

&nbsp;   background: #fed7d7;

&nbsp;   color: #742a2a;

}



.criticidad-badge.critico {

&nbsp;   background: #fc8181;

&nbsp;   color: #742a2a;

&nbsp;   animation: pulse 2s infinite;

}



@keyframes pulse {

&nbsp;   0%, 100% { opacity: 1; }

&nbsp;   50% { opacity: 0.7; }

}



/\* Mora Summary \*/

.mora-summary {

&nbsp;   display: grid;

&nbsp;   grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));

&nbsp;   gap: 15px;

&nbsp;   margin-bottom: 25px;

}



.summary-card {

&nbsp;   background: #f7fafc;

&nbsp;   padding: 20px;

&nbsp;   border-radius: 10px;

&nbsp;   text-align: center;

&nbsp;   border: 2px solid #e2e8f0;

&nbsp;   transition: all 0.3s ease;

}



.summary-card:hover {

&nbsp;   transform: translateY(-3px);

&nbsp;   box-shadow: 0 4px 12px rgba(0,0,0,0.1);

}



.summary-card.highlight {

&nbsp;   background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%);

&nbsp;   border-color: #fc8181;

}



.summary-card.total {

&nbsp;   background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);

&nbsp;   color: white;

&nbsp;   border: none;

}



.summary-label {

&nbsp;   font-size: 0.85rem;

&nbsp;   color: #718096;

&nbsp;   margin-bottom: 8px;

&nbsp;   font-weight: 600;

&nbsp;   text-transform: uppercase;

&nbsp;   letter-spacing: 0.5px;

}



.summary-card.total .summary-label {

&nbsp;   color: rgba(255,255,255,0.9);

}



.summary-value {

&nbsp;   font-size: 1.8rem;

&nbsp;   font-weight: 700;

&nbsp;   color: #2d3748;

}



.summary-card.total .summary-value {

&nbsp;   color: white;

}



/\* Reconexión Alert \*/

.reconexion-alert {

&nbsp;   background: linear-gradient(135deg, #fef5e7 0%, #fdebd0 100%);

&nbsp;   border: 2px solid #f39c12;

&nbsp;   border-radius: 12px;

&nbsp;   padding: 20px;

&nbsp;   margin-bottom: 25px;

&nbsp;   display: grid;

&nbsp;   grid-template-columns: auto 1fr auto;

&nbsp;   gap: 20px;

&nbsp;   align-items: center;

}



.alert-icon {

&nbsp;   font-size: 3rem;

}



.alert-content {

&nbsp;   flex: 1;

}



.alert-content strong {

&nbsp;   display: block;

&nbsp;   color: #c0392b;

&nbsp;   margin-bottom: 8px;

&nbsp;   font-size: 1.1rem;

}



.alert-content p {

&nbsp;   margin: 5px 0;

&nbsp;   color: #7f6000;

}



.btn-reconexion {

&nbsp;   background: linear-gradient(135deg, #51cf66 0%, #37b24d 100%);

&nbsp;   color: white;

&nbsp;   border: none;

&nbsp;   padding: 12px 25px;

&nbsp;   border-radius: 8px;

&nbsp;   font-weight: 600;

&nbsp;   cursor: pointer;

&nbsp;   transition: all 0.3s ease;

&nbsp;   white-space: nowrap;

}



.btn-reconexion:hover {

&nbsp;   transform: translateY(-2px);

&nbsp;   box-shadow: 0 6px 20px rgba(55, 178, 77, 0.4);

}



/\* Facturas Detail \*/

.facturas-detail {

&nbsp;   margin-bottom: 25px;

}



.facturas-detail h4 {

&nbsp;   margin-top: 0;

&nbsp;   margin-bottom: 15px;

&nbsp;   color: #2d3748;

}



.table-responsive {

&nbsp;   overflow-x: auto;

&nbsp;   border-radius: 8px;

&nbsp;   box-shadow: 0 1px 3px rgba(0,0,0,0.1);

}



.facturas-table {

&nbsp;   width: 100%;

&nbsp;   border-collapse: collapse;

&nbsp;   background: white;

}



.facturas-table thead {

&nbsp;   background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

&nbsp;   color: white;

}



.facturas-table th {

&nbsp;   padding: 15px 12px;

&nbsp;   text-align: left;

&nbsp;   font-weight: 600;

&nbsp;   font-size: 0.85rem;

&nbsp;   text-transform: uppercase;

&nbsp;   letter-spacing: 0.5px;

}



.facturas-table td {

&nbsp;   padding: 12px;

&nbsp;   border-bottom: 1px solid #e2e8f0;

&nbsp;   font-size: 0.9rem;

}



.facturas-table tbody tr:hover {

&nbsp;   background: #f7fafc;

}



.facturas-table .estado-badge {

&nbsp;   padding: 4px 10px;

&nbsp;   border-radius: 12px;

&nbsp;   font-size: 0.8rem;

&nbsp;   font-weight: 600;

}



.estado-badge.vigente {

&nbsp;   background: #c6f6d5;

&nbsp;   color: #22543d;

}



.estado-badge.vencido {

&nbsp;   background: #feebc8;

&nbsp;   color: #7c2d12;

}



.estado-badge.critico {

&nbsp;   background: #fc8181;

&nbsp;   color: #742a2a;

}



/\* Actions Section \*/

.actions-section {

&nbsp;   display: flex;

&nbsp;   gap: 15px;

&nbsp;   justify-content: flex-end;

&nbsp;   margin-top: 20px;

}



/\* Clientes Mora Section \*/

.clientes-mora-section {

&nbsp;   background: white;

&nbsp;   padding: 25px;

&nbsp;   border-radius: 12px;

&nbsp;   box-shadow: 0 2px 8px rgba(0,0,0,0.08);

&nbsp;   margin-top: 30px;

}



.section-header {

&nbsp;   display: flex;

&nbsp;   justify-content: space-between;

&nbsp;   align-items: center;

&nbsp;   margin-bottom: 20px;

}



.section-header h3 {

&nbsp;   margin: 0;

&nbsp;   color: #2d3748;

}



.clientes-table {

&nbsp;   width: 100%;

&nbsp;   border-collapse: collapse;

&nbsp;   background: white;

}



.clientes-table thead {

&nbsp;   background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);

&nbsp;   color: white;

}



.clientes-table th {

&nbsp;   padding: 15px 12px;

&nbsp;   text-align: left;

&nbsp;   font-weight: 600;

&nbsp;   font-size: 0.85rem;

&nbsp;   text-transform: uppercase;

}



.clientes-table td {

&nbsp;   padding: 12px;

&nbsp;   border-bottom: 1px solid #e2e8f0;

}



.clientes-table tbody tr:hover {

&nbsp;   background: #f7fafc;

}



.btn-ver-detalle {

&nbsp;   background: #667eea;

&nbsp;   color: white;

&nbsp;   border: none;

&nbsp;   padding: 6px 12px;

&nbsp;   border-radius: 6px;

&nbsp;   font-size: 0.85rem;

&nbsp;   cursor: pointer;

&nbsp;   transition: all 0.3s ease;

}



.btn-ver-detalle:hover {

&nbsp;   background: #5568d3;

&nbsp;   transform: translateY(-1px);

}



/\* Buttons \*/

.btn-primary {

&nbsp;   background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);

&nbsp;   color: white;

&nbsp;   border: none;

&nbsp;   padding: 12px 25px;

&nbsp;   border-radius: 8px;

&nbsp;   font-size: 1rem;

&nbsp;   font-weight: 600;

&nbsp;   cursor: pointer;

&nbsp;   transition: all 0.3s ease;

}



.btn-primary:hover {

&nbsp;   transform: translateY(-2px);

&nbsp;   box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);

}



.btn-secondary {

&nbsp;   background: #718096;

&nbsp;   color: white;

&nbsp;   border: none;

&nbsp;   padding: 10px 20px;

&nbsp;   border-radius: 6px;

&nbsp;   font-size: 0.9rem;

&nbsp;   font-weight: 600;

&nbsp;   cursor: pointer;

&nbsp;   transition: all 0.3s ease;

}



.btn-secondary:hover {

&nbsp;   background: #4a5568;

}



/\* Loading \*/

.loading {

&nbsp;   position: fixed;

&nbsp;   top: 0;

&nbsp;   left: 0;

&nbsp;   width: 100%;

&nbsp;   height: 100%;

&nbsp;   background: rgba(0,0,0,0.7);

&nbsp;   display: flex;

&nbsp;   flex-direction: column;

&nbsp;   justify-content: center;

&nbsp;   align-items: center;

&nbsp;   z-index: 9999;

}



.spinner {

&nbsp;   border: 4px solid rgba(255,255,255,0.3);

&nbsp;   border-top: 4px solid white;

&nbsp;   border-radius: 50%;

&nbsp;   width: 50px;

&nbsp;   height: 50px;

&nbsp;   animation: spin 1s linear infinite;

}



@keyframes spin {

&nbsp;   0% { transform: rotate(0deg); }

&nbsp;   100% { transform: rotate(360deg); }

}



.loading p {

&nbsp;   color: white;

&nbsp;   margin-top: 15px;

&nbsp;   font-size: 1.1rem;

}



/\* Message \*/

.message {

&nbsp;   position: fixed;

&nbsp;   top: 20px;

&nbsp;   right: 20px;

&nbsp;   padding: 15px 25px;

&nbsp;   border-radius: 8px;

&nbsp;   font-weight: 600;

&nbsp;   z-index: 10000;

&nbsp;   animation: slideIn 0.3s ease;

}



@keyframes slideIn {

&nbsp;   from {

&nbsp;       transform: translateX(400px);

&nbsp;       opacity: 0;

&nbsp;   }

&nbsp;   to {

&nbsp;       transform: translateX(0);

&nbsp;       opacity: 1;

&nbsp;   }

}



.message.success {

&nbsp;   background: #c6f6d5;

&nbsp;   color: #22543d;

&nbsp;   border: 2px solid #48bb78;

}



.message.error {

&nbsp;   background: #fed7d7;

&nbsp;   color: #742a2a;

&nbsp;   border: 2px solid #fc8181;

}



/\* Responsive \*/

@media (max-width: 768px) {

&nbsp;   .search-box {

&nbsp;       grid-template-columns: 1fr;

&nbsp;   }



&nbsp;   .mora-summary {

&nbsp;       grid-template-columns: 1fr;

&nbsp;   }



&nbsp;   .reconexion-alert {

&nbsp;       grid-template-columns: 1fr;

&nbsp;       text-align: center;

&nbsp;   }



&nbsp;   .alert-icon {

&nbsp;       font-size: 2rem;

&nbsp;   }



&nbsp;   .actions-section {

&nbsp;       flex-direction: column;

&nbsp;   }



&nbsp;   .btn-reconexion {

&nbsp;       width: 100%;

&nbsp;   }



&nbsp;   .facturas-table,

&nbsp;   .clientes-table {

&nbsp;       font-size: 0.75rem;

&nbsp;   }



&nbsp;   .facturas-table th,

&nbsp;   .facturas-table td,

&nbsp;   .clientes-table th,

&nbsp;   .clientes-table td {

&nbsp;       padding: 8px 6px;

&nbsp;   }

}

```



\### ✅ Validation:

\- File `frontend/css/mora.css` should exist

\- Refresh `mora.html` in browser

\- Page should look properly styled with colors and layout



---



\## 🎯 PHASE 4: CREATE MORA JAVASCRIPT



\### Objective:

Create the JavaScript functionality to interact with the mora API.



\### Instruction for Claude Code:

```

"Create a new file frontend/js/mora.js with this complete code:"

```



\### Complete code:

```javascript

/\*\*

&nbsp;\* Gestor de Mora Acumulada

&nbsp;\* Maneja la interacción con el API de mora

&nbsp;\*/



class MoraManager {

&nbsp;   constructor() {

&nbsp;       this.API\_BASE = 'http://localhost:5000/api';

&nbsp;       this.currentClienteId = null;

&nbsp;       this.currentCliente = null;

&nbsp;       this.init();

&nbsp;   }



&nbsp;   /\*\*

&nbsp;    \* Inicialización

&nbsp;    \*/

&nbsp;   init() {

&nbsp;       console.log('MoraManager inicializado');

&nbsp;       this.cargarClientesCriticos();

&nbsp;       

&nbsp;       // Agregar enter en búsqueda

&nbsp;       const searchInput = document.getElementById('searchCliente');

&nbsp;       if (searchInput) {

&nbsp;           searchInput.addEventListener('keypress', (e) => {

&nbsp;               if (e.key === 'Enter') {

&nbsp;                   this.buscarCliente();

&nbsp;               }

&nbsp;           });

&nbsp;       }

&nbsp;   }



&nbsp;   /\*\*

&nbsp;    \* Buscar cliente por término de búsqueda

&nbsp;    \*/

&nbsp;   async buscarCliente() {

&nbsp;       const searchTerm = document.getElementById('searchCliente').value.trim();

&nbsp;       

&nbsp;       if (!searchTerm) {

&nbsp;           this.showMessage('Por favor ingresa un término de búsqueda', 'error');

&nbsp;           return;

&nbsp;       }



&nbsp;       this.showLoading(true);



&nbsp;       try {

&nbsp;           const response = await AuthUtils.authenticatedFetch(

&nbsp;               `${this.API\_BASE}/clientes?search=${encodeURIComponent(searchTerm)}`

&nbsp;           );



&nbsp;           const data = await response.json();



&nbsp;           if (!response.ok) {

&nbsp;               throw new Error(data.message || 'Error al buscar cliente');

&nbsp;           }



&nbsp;           if (!data.data || data.data.length === 0) {

&nbsp;               this.showMessage('No se encontró ningún cliente con ese criterio', 'error');

&nbsp;               this.hideClienteInfo();

&nbsp;               return;

&nbsp;           }



&nbsp;           // Si hay múltiples resultados, tomar el primero

&nbsp;           const cliente = data.data\[0];

&nbsp;           this.currentCliente = cliente;

&nbsp;           this.currentClienteId = cliente.\_id;



&nbsp;           this.mostrarInfoCliente(cliente);



&nbsp;       } catch (error) {

&nbsp;           console.error('Error al buscar cliente:', error);

&nbsp;           this.showMessage(error.message, 'error');

&nbsp;           this.hideClienteInfo();

&nbsp;       } finally {

&nbsp;           this.showLoading(false);

&nbsp;       }

&nbsp;   }



&nbsp;   /\*\*

&nbsp;    \* Mostrar información del cliente

&nbsp;    \*/

&nbsp;   mostrarInfoCliente(cliente) {

&nbsp;       document.getElementById('clienteNombre').textContent = 

&nbsp;           `${cliente.nombre} ${cliente.apellido}`;

&nbsp;       document.getElementById('clienteDPI').textContent = cliente.dpi || 'N/A';

&nbsp;       document.getElementById('clienteContador').textContent = 

&nbsp;           cliente.numeroContador || 'N/A';

&nbsp;       

&nbsp;       const estadoBadge = document.getElementById('clienteEstado');

&nbsp;       const estado = cliente.estadoServicio || 'activo';

&nbsp;       estadoBadge.textContent = estado.toUpperCase();

&nbsp;       estadoBadge.className = `badge ${estado}`;



&nbsp;       document.getElementById('clienteInfo').style.display = 'block';

&nbsp;       document.getElementById('moraResult').style.display = 'none';

&nbsp;   }



&nbsp;   /\*\*

&nbsp;    \* Ocultar información del cliente

&nbsp;    \*/

&nbsp;   hideClienteInfo() {

&nbsp;       document.getElementById('clienteInfo').style.display = 'none';

&nbsp;       document.getElementById('moraResult').style.display = 'none';

&nbsp;       this.currentCliente = null;

&nbsp;       this.currentClienteId = null;

&nbsp;   }



&nbsp;   /\*\*

&nbsp;    \* Calcular mora del cliente actual

&nbsp;    \*/

&nbsp;   async calcularMora() {

&nbsp;       if (!this.currentClienteId) {

&nbsp;           this.showMessage('No hay cliente seleccionado', 'error');

&nbsp;           return;

&nbsp;       }



&nbsp;       this.showLoading(true);



&nbsp;       try {

&nbsp;           const response = await AuthUtils.authenticatedFetch(

&nbsp;               `${this.API\_BASE}/mora/cliente/${this.currentClienteId}`

&nbsp;           );



&nbsp;           const data = await response.json();



&nbsp;           if (!response.ok) {

&nbsp;               throw new Error(data.message || 'Error al calcular mora');

&nbsp;           }



&nbsp;           this.mostrarResultadoMora(data.data);



&nbsp;       } catch (error) {

&nbsp;           console.error('Error al calcular mora:', error);

&nbsp;           this.showMessage(error.message, 'error');

&nbsp;       } finally {

&nbsp;           this.showLoading(false);

&nbsp;       }

&nbsp;   }



&nbsp;   /\*\*

&nbsp;    \* Mostrar resultado de mora

&nbsp;    \*/

&nbsp;   mostrarResultadoMora(moraData) {

&nbsp;       // Actualizar resumen

&nbsp;       document.getElementById('facturasPendientes').textContent = 

&nbsp;           moraData.facturasPendientes;

&nbsp;       document.getElementById('mesesAtrasados').textContent = 

&nbsp;           moraData.mesesAtrasados;

&nbsp;       document.getElementById('montoOriginal').textContent = 

&nbsp;           `Q${moraData.montoOriginalTotal.toFixed(2)}`;

&nbsp;       document.getElementById('moraTotal').textContent = 

&nbsp;           `Q${moraData.moraTotal.toFixed(2)}`;

&nbsp;       document.getElementById('totalAPagar').textContent = 

&nbsp;           `Q${moraData.totalAPagar.toFixed(2)}`;



&nbsp;       // Actualizar badge de criticidad

&nbsp;       const criticidadBadge = document.getElementById('criticidadBadge');

&nbsp;       const criticidad = moraData.nivelCriticidad || 'bajo';

&nbsp;       criticidadBadge.textContent = criticidad.toUpperCase();

&nbsp;       criticidadBadge.className = `criticidad-badge ${criticidad}`;



&nbsp;       // Mostrar alerta de reconexión si aplica

&nbsp;       const reconexionAlert = document.getElementById('reconexionAlert');

&nbsp;       if (moraData.requiereReconexion) {

&nbsp;           document.getElementById('costoReconexion').textContent = 

&nbsp;               moraData.costoReconexion.toFixed(2);

&nbsp;           reconexionAlert.style.display = 'grid';

&nbsp;       } else {

&nbsp;           reconexionAlert.style.display = 'none';

&nbsp;       }



&nbsp;       // Llenar tabla de facturas

&nbsp;       this.llenarTablaFacturas(moraData.detalleFacturas);



&nbsp;       // Mostrar resultado

&nbsp;       document.getElementById('moraResult').style.display = 'block';



&nbsp;       // Scroll al resultado

&nbsp;       document.getElementById('moraResult').scrollIntoView({ 

&nbsp;           behavior: 'smooth', 

&nbsp;           block: 'start' 

&nbsp;       });

&nbsp;   }



&nbsp;   /\*\*

&nbsp;    \* Llenar tabla de facturas

&nbsp;    \*/

&nbsp;   llenarTablaFacturas(facturas) {

&nbsp;       const tbody = document.getElementById('facturasTableBody');

&nbsp;       tbody.innerHTML = '';



&nbsp;       if (!facturas || facturas.length === 0) {

&nbsp;           tbody.innerHTML = `

&nbsp;               <tr>

&nbsp;                   <td colspan="10" style="text-align: center; padding: 30px;">

&nbsp;                       No hay facturas vencidas

&nbsp;                   </td>

&nbsp;               </tr>

&nbsp;           `;

&nbsp;           return;

&nbsp;       }



&nbsp;       facturas.forEach(factura => {

&nbsp;           const tr = document.createElement('tr');

&nbsp;           

&nbsp;           const fechaEmision = new Date(factura.fechaEmision).toLocaleDateString('es-GT');

&nbsp;           const fechaVencimiento = new Date(factura.fechaVencimiento).toLocaleDateString('es-GT');

&nbsp;           

&nbsp;           tr.innerHTML = `

&nbsp;               <td>${factura.numeroFactura}</td>

&nbsp;               <td>${fechaEmision}</td>

&nbsp;               <td>${fechaVencimiento}</td>

&nbsp;               <td>${factura.diasVencidos}</td>

&nbsp;               <td>${factura.mesesCompletos}</td>

&nbsp;               <td>Q${factura.montoOriginal.toFixed(2)}</td>

&nbsp;               <td>${factura.porcentajeMora.toFixed(2)}%</td>

&nbsp;               <td>Q${factura.montoMora.toFixed(2)}</td>

&nbsp;               <td><strong>Q${factura.totalConMora.toFixed(2)}</strong></td>

&nbsp;               <td><span class="estado-badge ${factura.estado}">${factura.estado}</span></td>

&nbsp;           `;

&nbsp;           

&nbsp;           tbody.appendChild(tr);

&nbsp;       });

&nbsp;   }



&nbsp;   /\*\*

&nbsp;    \* Cargar lista de clientes con mora crítica

&nbsp;    \*/

&nbsp;   async cargarClientesCriticos() {

&nbsp;       try {

&nbsp;           // Obtener todos los clientes

&nbsp;           const response = await AuthUtils.authenticatedFetch(

&nbsp;               `${this.API\_BASE}/clientes`

&nbsp;           );



&nbsp;           const data = await response.json();



&nbsp;           if (!response.ok) {

&nbsp;               throw new Error(data.message || 'Error al cargar clientes');

&nbsp;           }



&nbsp;           // Filtrar y calcular mora para cada uno (esto es costoso, en producción

&nbsp;           // se debería hacer en el backend)

&nbsp;           this.mostrarClientesCriticos(data.data);



&nbsp;       } catch (error) {

&nbsp;           console.error('Error al cargar clientes críticos:', error);

&nbsp;       }

&nbsp;   }



&nbsp;   /\*\*

&nbsp;    \* Mostrar clientes críticos

&nbsp;    \*/

&nbsp;   mostrarClientesCriticos(clientes) {

&nbsp;       const tbody = document.getElementById('clientesCriticosBody');

&nbsp;       tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Cargando...</td></tr>';



&nbsp;       // Limitar a primeros 10 para no sobrecargar

&nbsp;       const clientesLimitados = clientes.slice(0, 10);



&nbsp;       tbody.innerHTML = '';



&nbsp;       if (clientesLimitados.length === 0) {

&nbsp;           tbody.innerHTML = `

&nbsp;               <tr>

&nbsp;                   <td colspan="6" style="text-align: center; padding: 30px;">

&nbsp;                       No hay clientes para mostrar

&nbsp;                   </td>

&nbsp;               </tr>

&nbsp;           `;

&nbsp;       } else {

&nbsp;           clientesLimitados.forEach(cliente => {

&nbsp;               const tr = document.createElement('tr');

&nbsp;               tr.innerHTML = `

&nbsp;                   <td>${cliente.nombre} ${cliente.apellido}</td>

&nbsp;                   <td>${cliente.numeroContador || 'N/A'}</td>

&nbsp;                   <td>-</td>

&nbsp;                   <td>-</td>

&nbsp;                   <td><span class="badge ${cliente.estadoServicio || 'activo'}">

&nbsp;                       ${(cliente.estadoServicio || 'activo').toUpperCase()}

&nbsp;                   </span></td>

&nbsp;                   <td>

&nbsp;                       <button class="btn-ver-detalle" onclick="moraManager.verDetalleMora('${cliente.\_id}')">

&nbsp;                           Ver Detalle

&nbsp;                       </button>

&nbsp;                   </td>

&nbsp;               `;

&nbsp;               tbody.appendChild(tr);

&nbsp;           });

&nbsp;       }

&nbsp;   }



&nbsp;   /\*\*

&nbsp;    \* Ver detalle de mora de un cliente específico

&nbsp;    \*/

&nbsp;   async verDetalleMora(clienteId) {

&nbsp;       this.currentClienteId = clienteId;

&nbsp;       

&nbsp;       // Cargar info del cliente primero

&nbsp;       this.showLoading(true);

&nbsp;       try {

&nbsp;           const response = await AuthUtils.authenticatedFetch(

&nbsp;               `${this.API\_BASE}/clientes/${clienteId}`

&nbsp;           );

&nbsp;           const data = await response.json();

&nbsp;           

&nbsp;           if (response.ok \&\& data.data) {

&nbsp;               this.currentCliente = data.data;

&nbsp;               this.mostrarInfoCliente(data.data);

&nbsp;               await this.calcularMora();

&nbsp;           }

&nbsp;       } catch (error) {

&nbsp;           console.error('Error:', error);

&nbsp;           this.showMessage('Error al cargar información del cliente', 'error');

&nbsp;       } finally {

&nbsp;           this.showLoading(false);

&nbsp;       }

&nbsp;   }



&nbsp;   /\*\*

&nbsp;    \* Exportar reporte de mora

&nbsp;    \*/

&nbsp;   async exportarReporte() {

&nbsp;       if (!this.currentClienteId) return;



&nbsp;       this.showMessage('Función de exportación en desarrollo', 'error');

&nbsp;       // TODO: Implementar exportación a PDF/Excel

&nbsp;   }



&nbsp;   /\*\*

&nbsp;    \* Imprimir estado de cuenta

&nbsp;    \*/

&nbsp;   imprimirEstadoCuenta() {

&nbsp;       if (!this.currentClienteId) return;



&nbsp;       window.print();

&nbsp;   }



&nbsp;   /\*\*

&nbsp;    \* Mostrar/ocultar loading

&nbsp;    \*/

&nbsp;   showLoading(show) {

&nbsp;       const loading = document.getElementById('loading');

&nbsp;       if (loading) {

&nbsp;           loading.style.display = show ? 'flex' : 'none';

&nbsp;       }

&nbsp;   }



&nbsp;   /\*\*

&nbsp;    \* Mostrar mensaje

&nbsp;    \*/

&nbsp;   showMessage(text, type = 'success') {

&nbsp;       const messageEl = document.getElementById('message');

&nbsp;       if (!messageEl) return;



&nbsp;       messageEl.textContent = text;

&nbsp;       messageEl.className = `message ${type}`;

&nbsp;       messageEl.style.display = 'block';



&nbsp;       setTimeout(() => {

&nbsp;           messageEl.style.display = 'none';

&nbsp;       }, 4000);

&nbsp;   }

}



// Inicializar cuando el DOM esté listo

let moraManager;

document.addEventListener('DOMContentLoaded', () => {

&nbsp;   moraManager = new MoraManager();

});

```



\### ✅ Validation:

\- File `frontend/js/mora.js` should exist

\- Open `mora.html` in browser with backend running

\- Try searching for a client

\- Click "Calcular Mora" button

\- Should see mora calculation with real data from backend



---



\## 🎯 PHASE 5: TEST MORA FUNCTIONALITY



\### Objective:

Test the complete mora functionality end-to-end.



\### Manual Testing Steps:



1\. \*\*Start backend server:\*\*

```bash

cd backend

npm start

```



2\. \*\*Open mora page:\*\*

&nbsp;  - Navigate to `http://localhost:5500/pages/mainPage.html` (or your Live Server port)

&nbsp;  - Click on "Control de Mora" card

&nbsp;  - Should redirect to `mora.html`



3\. \*\*Test client search:\*\*

&nbsp;  - Enter a client name, DPI, or counter number

&nbsp;  - Click "🔍 Buscar"

&nbsp;  - Should display client information



4\. \*\*Test mora calculation:\*\*

&nbsp;  - Click "📊 Calcular Mora"

&nbsp;  - Should show:

&nbsp;    - Summary cards with totals

&nbsp;    - Criticality badge

&nbsp;    - Reconnection alert (if applicable)

&nbsp;    - Detailed table of overdue invoices



5\. \*\*Test critical clients list:\*\*

&nbsp;  - Scroll to bottom

&nbsp;  - Click "🔄 Actualizar"

&nbsp;  - Should load list of clients

&nbsp;  - Click "Ver Detalle" on any client

&nbsp;  - Should show that client's mora details



\### ✅ Validation Checklist:

\- \[ ] Mora page loads without errors

\- \[ ] Client search works

\- \[ ] Mora calculation displays correctly

\- \[ ] Tables populate with data

\- \[ ] Buttons are functional

\- \[ ] Reconnection alert shows when applicable

\- \[ ] Styling looks good

\- \[ ] Responsive on mobile



---



\## 🎯 NEXT STEPS



After completing Phase 5 and verifying mora works correctly:



1\. \*\*Phase 6-10 will cover:\*\* Creating the Reconexión page

2\. \*\*Including:\*\*

&nbsp;  - HTML page for reconnection

&nbsp;  - CSS styling

&nbsp;  - JavaScript functionality

&nbsp;  - Payment options (80% and 100%)

&nbsp;  - Processing reconnection requests



\*\*Ready to continue with Reconexión phases?\*\* Let me know when you've tested Phase 1-5 and we'll proceed with the reconnection module!

