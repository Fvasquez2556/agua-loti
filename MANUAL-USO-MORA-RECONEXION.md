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
