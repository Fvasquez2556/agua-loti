// backend/controllers/cliente.controller.js
const Cliente = require('../models/cliente.model');

/**
 * Obtener todos los clientes con filtros opcionales
 */
exports.getClientes = async (req, res) => {
  try {
    const { 
      proyecto, 
      estado = 'activo', 
      buscar, 
      page = 1, 
      limit = 50,
      sortBy = 'fechaRegistro',
      sortOrder = 'desc'
    } = req.query;

    // Construir filtros
    const filtros = {};
    
    if (proyecto) {
      filtros.proyecto = proyecto;
    }
    
    if (estado) {
      filtros.estado = estado;
    }

    // Búsqueda por texto en nombres, apellidos, dpi, contador
    if (buscar) {
      filtros.$or = [
        { nombres: { $regex: buscar, $options: 'i' } },
        { apellidos: { $regex: buscar, $options: 'i' } },
        { dpi: { $regex: buscar, $options: 'i' } },
        { contador: { $regex: buscar, $options: 'i' } },
        { lote: { $regex: buscar, $options: 'i' } }
      ];
    }

    // Configurar paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Ejecutar consulta
    const clientes = await Cliente.find(filtros)
      .sort(sortConfig)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Contar total para paginación
    const total = await Cliente.countDocuments(filtros);
    const totalPaginas = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: clientes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: totalPaginas,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPaginas,
        hasPrevPage: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Error al obtener clientes:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Obtener un cliente por ID
 */
exports.getClienteById = async (req, res) => {
  try {
    const { id } = req.params;

    const cliente = await Cliente.findById(id);
    
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      data: cliente
    });

  } catch (error) {
    console.error('Error al obtener cliente:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID de cliente inválido'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Crear un nuevo cliente
 */
exports.createCliente = async (req, res) => {
  try {
    const clienteData = req.body;

    // Validar que no exista otro cliente con el mismo DPI o contador
    const existeDPI = await Cliente.findOne({ dpi: clienteData.dpi });
    if (existeDPI) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un cliente registrado con este DPI'
      });
    }

    const existeContador = await Cliente.findOne({ contador: clienteData.contador });
    if (existeContador) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un cliente registrado con este número de contador'
      });
    }

    // Crear nuevo cliente
    const nuevoCliente = new Cliente(clienteData);
    const clienteGuardado = await nuevoCliente.save();

    res.status(201).json({
      success: true,
      message: 'Cliente registrado exitosamente',
      data: clienteGuardado
    });

  } catch (error) {
    console.error('Error al crear cliente:', error);

    // Manejar errores de validación
    if (error.name === 'ValidationError') {
      const errores = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errores
      });
    }

    // Manejar errores de duplicado (por si acaso)
    if (error.code === 11000) {
      const campo = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Ya existe un cliente registrado con este ${campo}`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Actualizar un cliente
 */
exports.updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Verificar si el cliente existe
    const clienteExistente = await Cliente.findById(id);
    if (!clienteExistente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    // Si se está actualizando el DPI, verificar que no exista en otro cliente
    if (updateData.dpi && updateData.dpi !== clienteExistente.dpi) {
      const existeDPI = await Cliente.findOne({ 
        dpi: updateData.dpi, 
        _id: { $ne: id } 
      });
      if (existeDPI) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro cliente registrado con este DPI'
        });
      }
    }

    // Si se está actualizando el contador, verificar que no exista en otro cliente
    if (updateData.contador && updateData.contador !== clienteExistente.contador) {
      const existeContador = await Cliente.findOne({ 
        contador: updateData.contador, 
        _id: { $ne: id } 
      });
      if (existeContador) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro cliente registrado con este número de contador'
        });
      }
    }

    // Actualizar cliente
    const clienteActualizado = await Cliente.findByIdAndUpdate(
      id,
      updateData,
      { 
        new: true, 
        runValidators: true 
      }
    );

    res.json({
      success: true,
      message: 'Cliente actualizado exitosamente',
      data: clienteActualizado
    });

  } catch (error) {
    console.error('Error al actualizar cliente:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID de cliente inválido'
      });
    }

    if (error.name === 'ValidationError') {
      const errores = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors: errores
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Eliminar un cliente (eliminación suave - cambiar estado a inactivo)
 */
exports.deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanente = false } = req.query;

    const cliente = await Cliente.findById(id);
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    if (permanente === 'true') {
      // Eliminación permanente (solo para admin)
      await Cliente.findByIdAndDelete(id);
      res.json({
        success: true,
        message: 'Cliente eliminado permanentemente'
      });
    } else {
      // Eliminación suave - cambiar estado
      const clienteActualizado = await Cliente.findByIdAndUpdate(
        id,
        { estado: 'inactivo' },
        { new: true }
      );

      res.json({
        success: true,
        message: 'Cliente desactivado exitosamente',
        data: clienteActualizado
      });
    }

  } catch (error) {
    console.error('Error al eliminar cliente:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID de cliente inválido'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Reactivar un cliente
 */
exports.reactivarCliente = async (req, res) => {
  try {
    const { id } = req.params;

    const cliente = await Cliente.findById(id);
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    const clienteReactivado = await Cliente.findByIdAndUpdate(
      id,
      { estado: 'activo' },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Cliente reactivado exitosamente',
      data: clienteReactivado
    });

  } catch (error) {
    console.error('Error al reactivar cliente:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID de cliente inválido'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

/**
 * Obtener estadísticas de clientes
 */
exports.getEstadisticas = async (req, res) => {
  try {
    const stats = await Cliente.aggregate([
      {
        $group: {
          _id: null,
          totalClientes: { $sum: 1 },
          clientesActivos: {
            $sum: { $cond: [{ $eq: ['$estado', 'activo'] }, 1, 0] }
          },
          clientesInactivos: {
            $sum: { $cond: [{ $eq: ['$estado', 'inactivo'] }, 1, 0] }
          }
        }
      }
    ]);

    const statsPorProyecto = await Cliente.aggregate([
      {
        $match: { estado: 'activo' }
      },
      {
        $group: {
          _id: '$proyecto',
          cantidad: { $sum: 1 }
        }
      },
      {
        $sort: { cantidad: -1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        general: stats[0] || { totalClientes: 0, clientesActivos: 0, clientesInactivos: 0 },
        porProyecto: statsPorProyecto
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};