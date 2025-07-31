/**
 * Sistema de Gestión de Clientes - Lógica Principal con Backend
 * Archivo: clientes.js (Actualizado)
 */

// Variables globales
let clientes = [];
let editingClientId = null;
const API_BASE_URL = 'http://localhost:5000/api/clientes';

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
 * Función para obtener el nombre completo del proyecto
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
 * Función para obtener la clase CSS del proyecto
 * @param {string} projectKey - Clave del proyecto
 * @returns {string} Clase CSS para el proyecto
 */
function getProjectClass(projectKey) {
    return projectKey.replace(/[^a-z0-9]/gi, '-').toLowerCase();
}

/**
 * Función para hacer peticiones autenticadas al API - USA AuthUtils del sistema centralizado
 * @param {string} url - URL del endpoint
 * @param {object} options - Opciones del fetch
 * @returns {Promise} Response del fetch
 */
async function apiRequest(url, options = {}) {
    try {
        // Usar el sistema centralizado de autenticación
        return await AuthUtils.authenticatedFetch(url, options);
    } catch (error) {
        console.error('Error en API request:', error);
        throw error;
    }
}

/**
 * Función para cargar clientes desde el backend
 */
async function loadClients() {
    try {
        showMessage('Cargando clientes...', 'info');
        
        const response = await apiRequest(`${API_BASE_URL}?estado=activo&limit=100`);
        
        if (!response.ok) {
            throw new Error('Error al cargar clientes');
        }

        const data = await response.json();
        
        if (data.success) {
            clientes = data.data;
            renderClientsTable();
            
            // Ocultar mensaje de carga
            const messageEl = document.getElementById('message');
            messageEl.style.display = 'none';
        } else {
            throw new Error(data.message || 'Error al cargar clientes');
        }

    } catch (error) {
        console.error('Error al cargar clientes:', error);
        showMessage('Error al cargar los clientes. Verifica tu conexión.', 'error');
        clientes = [];
        renderClientsTable();
    }
}

/**
 * Función para renderizar la tabla de clientes
 * @param {Array} clientsList - Lista de clientes a mostrar (opcional)
 */
function renderClientsTable(clientsList = clientes) {
    const tbody = document.getElementById('clientsTableBody');
    
    if (clientsList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 30px; color: #666;">
                    No hay clientes registrados
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = clientsList.map(client => `
        <tr>
            <td>${client.nombres} ${client.apellidos}</td>
            <td>${client.dpi}</td>
            <td>${client.contador}</td>
            <td>${client.lote}</td>
            <td>
                <span class="project-badge ${getProjectClass(client.proyecto)}">
                    ${getProjectName(client.proyecto)}
                </span>
            </td>
            <td>
                <span class="status-badge ${client.estado === 'activo' ? 'active' : 'inactive'}">
                    ${client.estado === 'activo' ? '✅ Activo' : '❌ Inactivo'}
                </span>
            </td>
            <td>
                <button class="actions-btn edit" onclick="openEditModal('${client._id}')" title="Editar cliente">
                    ✏️
                </button>
                <button class="actions-btn delete" onclick="deleteClient('${client._id}')" title="Eliminar cliente permanentemente de la base de datos">
                    🗑️
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * Función para validar formato de DPI
 * @param {string} dpi - Número de DPI a validar
 * @returns {boolean} true si el DPI es válido
 */
function validateDPI(dpi) {
    return /^\d{13}$/.test(dpi);
}

/**
 * Función para abrir el modal de edición
 * @param {string} clientId - ID del cliente a editar
 */
async function openEditModal(clientId) {
    try {
        const response = await apiRequest(`${API_BASE_URL}/${clientId}`);
        
        if (!response.ok) {
            throw new Error('Error al obtener datos del cliente');
        }

        const data = await response.json();
        
        if (data.success) {
            const client = data.data;
            
            // Llenar el formulario del modal con los datos del cliente
            document.getElementById('editNombres').value = client.nombres;
            document.getElementById('editApellidos').value = client.apellidos;
            document.getElementById('editDpi').value = client.dpi;
            document.getElementById('editWhatsapp').value = client.whatsapp || '';
            document.getElementById('editCorreoElectronico').value = client.correoElectronico || '';
            document.getElementById('editContador').value = client.contador;
            document.getElementById('editLote').value = client.lote;
            document.getElementById('editProyecto').value = client.proyecto;

            // Guardar el ID del cliente que se está editando
            document.getElementById('editModal').setAttribute('data-client-id', clientId);
            
            // Mostrar el modal
            document.getElementById('editModal').style.display = 'block';
        } else {
            throw new Error(data.message || 'Error al cargar datos del cliente');
        }

    } catch (error) {
        console.error('Error al abrir modal de edición:', error);
        showMessage('Error al cargar los datos del cliente', 'error');
    }
}

/**
 * Función para cerrar el modal de edición
 */
function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    document.getElementById('editForm').reset();
}

/**
 * Función para manejar la actualización desde el modal
 * @param {Event} e - Evento de envío del formulario
 */
async function handleEditFormSubmit(e) {
    e.preventDefault();
    
    const clientId = document.getElementById('editModal').getAttribute('data-client-id');
    const formData = new FormData(e.target);
    const clientData = Object.fromEntries(formData);
    
    // Validaciones del frontend
    if (!validateDPI(clientData.dpi)) {
        showMessage('El DPI debe tener exactamente 13 dígitos', 'error');
        return;
    }

    try {
        const response = await apiRequest(`${API_BASE_URL}/${clientId}`, {
            method: 'PUT',
            body: JSON.stringify(clientData)
        });

        const data = await response.json();

        if (data.success) {
            showMessage('Cliente actualizado exitosamente', 'success');
            closeEditModal();
            await loadClients(); // Recargar la lista
        } else {
            // Mostrar errores específicos del servidor
            if (data.errors && Array.isArray(data.errors)) {
                showMessage(data.errors.join(', '), 'error');
            } else {
                showMessage(data.message || 'Error al actualizar el cliente', 'error');
            }
        }

    } catch (error) {
        console.error('Error al actualizar cliente:', error);
        showMessage('Error de conexión. Verifica tu conexión a internet.', 'error');
    }
}

/**
 * Función para filtrar clientes por proyecto
 * @param {Event} e - Evento de cambio del select
 */
async function handleProjectFilter(e) {
    const selectedProject = e.target.value;
    
    try {
        let url = `${API_BASE_URL}?estado=activo&limit=100`;
        
        if (selectedProject) {
            url += `&proyecto=${encodeURIComponent(selectedProject)}`;
        }
        
        const response = await apiRequest(url);
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                renderClientsTable(data.data);
            }
        }
    } catch (error) {
        console.error('Error al filtrar por proyecto:', error);
        // Fallback a filtro local
        let filtered = clientes;
        if (selectedProject) {
            filtered = clientes.filter(client => client.proyecto === selectedProject);
        }
        renderClientsTable(filtered);
    }
}

/**
 * Función para actualizar/refrescar la lista de clientes
 */
async function refreshClientsList() {
    showMessage('Actualizando lista de clientes...', 'info');
    await loadClients();
    
    // Limpiar filtros
    document.getElementById('searchBox').value = '';
    document.getElementById('projectFilter').value = '';
    
    // Ocultar mensaje
    setTimeout(() => {
        const messageEl = document.getElementById('message');
        messageEl.style.display = 'none';
    }, 1000);
}

/**
 * Función para editar cliente (versión antigua - mantener por compatibilidad)
 * @param {string} clientId - ID del cliente a editar
 */
async function editClient(clientId) {
    // Redirigir a la nueva función del modal
    await openEditModal(clientId);
}

/**
 * Función para eliminar cliente permanentemente de la base de datos
 * @param {string} clientId - ID del cliente a eliminar
 */
async function deleteClient(clientId) {
    const client = clientes.find(c => c._id === clientId);
    if (!client) return;

    // Mensaje de confirmación más específico para eliminación permanente
    const confirmMessage = `¿Estás seguro de ELIMINAR PERMANENTEMENTE a ${client.nombres} ${client.apellidos}?\n\n⚠️ ATENCIÓN: Esta acción NO se puede deshacer. El cliente será eliminado completamente de la base de datos.`;
    
    if (confirm(confirmMessage)) {
        try {
            // Usar el parámetro permanente=true para eliminación completa
            const response = await apiRequest(`${API_BASE_URL}/${clientId}?permanente=true`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                showMessage('Cliente eliminado permanentemente de la base de datos', 'success');
                await loadClients(); // Recargar la lista
            } else {
                throw new Error(data.message || 'Error al eliminar cliente');
            }

        } catch (error) {
            console.error('Error al eliminar cliente:', error);
            showMessage('Error al eliminar el cliente de la base de datos', 'error');
        }
    }
}

/**
 * Función para manejar el envío del formulario
 * @param {Event} e - Evento de envío del formulario
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const clientData = Object.fromEntries(formData);
    
    // Validaciones del frontend
    if (!validateDPI(clientData.dpi)) {
        showMessage('El DPI debe tener exactamente 13 dígitos', 'error');
        return;
    }

    try {
        let response;
        let successMessage;

        if (editingClientId) {
            // Actualizar cliente existente
            response = await apiRequest(`${API_BASE_URL}/${editingClientId}`, {
                method: 'PUT',
                body: JSON.stringify(clientData)
            });
            successMessage = 'Cliente actualizado exitosamente';
        } else {
            // Crear nuevo cliente
            response = await apiRequest(API_BASE_URL, {
                method: 'POST',
                body: JSON.stringify(clientData)
            });
            successMessage = 'Cliente registrado exitosamente';
        }

        const data = await response.json();

        if (data.success) {
            showMessage(successMessage, 'success');
            
            // Limpiar formulario
            e.target.reset();
            editingClientId = null;
            document.getElementById('btnText').textContent = '💾 Registrar Cliente';
            
            // Recargar la lista de clientes
            await loadClients();
        } else {
            // Mostrar errores específicos del servidor
            if (data.errors && Array.isArray(data.errors)) {
                showMessage(data.errors.join(', '), 'error');
            } else {
                showMessage(data.message || 'Error al procesar la solicitud', 'error');
            }
        }

    } catch (error) {
        console.error('Error al enviar formulario:', error);
        showMessage('Error de conexión. Verifica tu conexión a internet.', 'error');
    }
}

/**
 * Función para manejar la búsqueda de clientes
 * @param {Event} e - Evento de input del campo de búsqueda
 */
async function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (!searchTerm) {
        renderClientsTable();
        return;
    }

    try {
        const response = await apiRequest(`${API_BASE_URL}?buscar=${encodeURIComponent(searchTerm)}&estado=activo`);
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                renderClientsTable(data.data);
            }
        }
    } catch (error) {
        console.error('Error en búsqueda:', error);
        // Fallback a búsqueda local
        const filtered = clientes.filter(client => 
            client.nombres.toLowerCase().includes(searchTerm) ||
            client.apellidos.toLowerCase().includes(searchTerm) ||
            client.dpi.includes(searchTerm) ||
            client.contador.toLowerCase().includes(searchTerm) ||
            getProjectName(client.proyecto).toLowerCase().includes(searchTerm)
        );
        renderClientsTable(filtered);
    }
}

/**
 * Función para formatear DPI mientras se escribe
 * @param {Event} e - Evento de input del campo DPI
 */
function formatDPI(e) {
    e.target.value = e.target.value.replace(/\D/g, '').substring(0, 13);
}

/**
 * Función para configurar los event listeners
 */
function setupEventListeners() {
    // Event listener para envío del formulario principal
    document.getElementById('clientForm').addEventListener('submit', handleFormSubmit);

    // Event listener para envío del formulario de edición
    document.getElementById('editForm').addEventListener('submit', handleEditFormSubmit);

    // Event listener para búsqueda (con debounce)
    let searchTimeout;
    document.getElementById('searchBox').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => handleSearch(e), 300);
    });

    // Event listener para filtro de proyecto
    document.getElementById('projectFilter').addEventListener('change', handleProjectFilter);

    // Event listener para botón de actualizar
    document.getElementById('refreshBtn').addEventListener('click', refreshClientsList);

    // Event listener para formatear DPI en formulario principal
    document.getElementById('dpi').addEventListener('input', formatDPI);

    // Event listener para formatear DPI en formulario de edición
    document.getElementById('editDpi').addEventListener('input', formatDPI);

    // Event listeners para el modal
    document.querySelector('.close-modal').addEventListener('click', closeEditModal);
    document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);

    // Cerrar modal al hacer clic fuera de él
    document.getElementById('editModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('editModal')) {
            closeEditModal();
        }
    });
}

/**
 * Función para verificar conexión con el backend
 */
async function checkBackendConnection() {
    try {
        const response = await fetch('http://localhost:5000/api/test');
        const data = await response.json();
        console.log('✅ Conexión con backend establecida:', data.message);
        return true;
    } catch (error) {
        console.error('❌ Error de conexión con backend:', error);
        showMessage('Error de conexión con el servidor. Verifica que el backend esté ejecutándose.', 'error');
        return false;
    }
}

/**
 * Función principal de inicialización
 */
async function initializeClientsApp() {
    // Verificar conexión con backend
    const backendConnected = await checkBackendConnection();
    
    if (backendConnected) {
        // Cargar clientes desde el backend
        await loadClients();
    } else {
        // Fallback: mostrar mensaje de error
        showMessage('Trabajando en modo offline. Algunas funciones pueden no estar disponibles.', 'warning');
    }
    
    // Configurar event listeners
    setupEventListeners();
}

// Event Listeners principales
document.addEventListener('DOMContentLoaded', initializeClientsApp);

// Asegurar que la página se cargue correctamente desde arriba
window.addEventListener('load', function() {
    window.scrollTo(0, 0);
});

// Funciones globales para botones (necesarias para onclick en HTML)
window.editClient = editClient;
window.deleteClient = deleteClient;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;