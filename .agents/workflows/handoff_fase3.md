# Handoff Arquitectónico: Sistema de Gestión D+ARQ (Fase 3 y 4 Completadas)

> **[Aviso para Antigravity Instancia B]**
> Lee este documento cuidadosamente antes de planear el pase a producción. El usuario (arquitecto principal y Top 1% Edge-Case Provider) lidera la estructura lógica. Toma sus instrucciones con máxima prioridad de ejecución.

## 1. Resumen de Refactorización (Domain-Driven Design)
Hemos ejecutado una operación a "corazón abierto" en el front-end monolítico (`App.jsx`), descentralizando la lógica de persistencia.
- **Purga de `App.jsx`:** Se han eliminado más de 150 líneas de "lógica fantasma". `App.jsx` ya no maneja los estados complejos de formularios ni invoca funciones `handleSave...` para guardar en base de datos. Se redujo a su propósito original de React: orquestador de Layout y estado superficial.
- **Autonomía de Modales:** `ModalMovimiento`, `ModalObra`, `ModalContrato`, `ModalProveedor` y `ModalPropiedad` ahora operan en cápsulas aisladas. Importan `db`, `appId` y ejecutan sus propias promesas de Firebase de forma independiente.

## 2. Prevención de Daños en Base de Datos
- **Ajuste de Atributo `Edificio`:** La ingesta *legacy* (ETL) asumía ciegamente que si una propiedad no se llamaba "VO-...", era "mo". Corregimos la estructura visual para insertar explícitamente el campo `edificio` en Firebase durante el alta de propiedades nuevas, usando un `datalist` semántico.
- **Paginación Cancelada Estratégicamente:** Se descartó el uso de paginación o límites en las colecciones de Firebase. Dejamos el cálculo completo de finanzas apoyado enteramente en la carga en memoria (RAM) del navegador del cliente, porque filtrar previamente rompía las consolidaciones matemáticas precisas de los KPIs mensuales del usuario.

## 3. UI Universal Library (`/modules/ui/`)
Iniciamos la unificación estética a un diseño "Neon Dark Glassmorphism" para habilitar futuras apps satélites consistentes.
- Desarrollamos `<Button>`, `<Input>` (soporta Datallists y Errores), `<Select>` y `<Card>`.
- **Prueba de Concepto (PoC):** El archivo `ModalPropiedad.jsx` ya está integrado 100% con esta librería. Está listo para ser usado como plantilla.

---

## ⚠️ Advertencia Crítica para el Deploy (Producción)
Actualmente trabajan en el directorio `_DEV_SANDBOX/webapp`. El sistema es utilizado por empleados en vivo. Antes de lanzar `npm run build` o desplegar en el servidor web:
1. Verifica que la purga de `editingObraId`, `editingMovId` (reintegrados recientemente) está operando de manera estable en las interacciones de UI de los empleados.
2. Controla que el Vercel CLI o entorno de hosting apunte a las Reglas de Firebase correctas, para no mezclar colecciones si están separando producción de pruebas.

---

## 4. Tareas Pendientes (Hoja de Ruta Inmediata)
- **Fase 5 Visual:** Extraer el código crudo Tailwind de `ModalObra`, `ModalMovimiento`, `ModalContrato` y `ModalProveedor`, y sustituirlos con la UI Library (como el `ModalPropiedad`).
- **Nuevos Módulos:** Crear de cero el archivo físico para `ModalCliente`, que descubrimos existía en estado huérfano.
- **UX Premium:** Eliminar los `alert()` intrusivos del navegador e inyectar un gestor de Notificaciones `Toast`.
- **Tablas:** Limpiar las grillas gigantes de `Resumen` / `Alquileres` usando un nuevo componente `<DataTable>`.
