# HANDOFF — Sesión 11 de Mayo 2026
> Última actualización: 03:20 AM (Buenos Aires)

## ⚠️ ENTORNO DE TRABAJO

```
PRODUCCIÓN (source of truth para ediciones):
  c:\Users\HP\Dropbox\D+ARQ\sitema de gestion\

SANDBOX (donde corre el dev server):
  c:\Users\HP\Dropbox\D+ARQ\sitema de gestion\_DEV_SANDBOX\

REGLA: editar en PRODUCCIÓN → copiar al SANDBOX con:
  Copy-Item "...\produccion\archivo" "...\_DEV_SANDBOX\archivo" -Force
```

> [!IMPORTANT]
> Al inicio de cada sesión, verificar que los archivos estén sincronizados antes de arrancar.

---

## Arquitectura del Sistema

### Módulos (5 micro-frontends + 1 paquete compartido)

| Módulo | Puerto | Función | Stack |
|--------|--------|---------|-------|
| **webapp** | 5173 | Dashboard central del Director/Admin | React + Vite + Firebase |
| **obras-client** | 5174 | Gestión por obra (Admin + Portal Cliente) | React + Vite + Firebase |
| **agenda-client** | 5175 | Agenda/Vencimientos (Violeta) | React + Vite + Firebase |
| **inspeccion-client** | 5176 | App de campo (Naim/David) | React + Vite + Firebase |
| **packages/darq-ui** | — | Librería de componentes compartidos | React |

### Firestore — Rutas Clave

```
artifacts/sg-darq/public/data/
  ├── movimientos/          ← Tesorería central
  ├── proveedores/          ← Proveedores globales
  ├── contratos/            ← Contratos de alquiler
  ├── propiedades/          ← Propiedades (alquileres)
  ├── clientes/             ← Clientes/Inquilinos
  ├── requerimientos/       ← Solicitudes de pago/material (campo→director)
  ├── solicitudes/          ← Solicitudes CRUD (admin→superadmin)
  └── configuracion/
      └── requerimientos_viernes  ← Montos semanales

obras_seguimiento/{obraId}/
  ├── contratistas/         ← Contratos back-to-back
  ├── certificaciones/      ← Avance certificado
  ├── ordenes_cambio/       ← Adicionales
  ├── honorarios/           ← Fees D+ARQ
  ├── facturas_directas/    ← Pagos directos cliente
  ├── acopios/              ← Materiales
  ├── rendiciones/          ← Caja chica
  ├── fotos/                ← Bitácora
  └── tareas/               ← Checklist por fase
```

---

## Auditoría de Código — Estado Actual

### webapp/src/gestion/Resumen.jsx (866 líneas, 54KB)

**Rol:** Dashboard principal del Director. Centro de mando financiero.

**Estado:** 🟡 Funcional pero pesado

**Componentes inline (debt):**
- `ModalRequerimientos` → ya extraído ✅
- Panel de pagos pendientes → inline (nuevo, OK por ahora)
- Sección de transferencias → inline (debería extraerse a futuro)
- Sección seguimiento de obras → inline (candidato a extracción)

**Lógica de datos (10 useEffects):**
- Fetch requerimientos viernes → `onSnapshot` ✅
- Fetch pagos pendientes → `onSnapshot` con where ✅
- Fetch pagos aprobados → `onSnapshot` con where ✅
- Fetch agenda items → `onSnapshot` ✅
- Fetch obras activas → `getDocs` ✅
- Fetch progreso checklists → `getDocs` por cada obra ⚠️ (N+1, ok si <50 obras)
- Fetch inbox tickets → pasado por props ✅
- Fetch certs pendientes → `onSnapshot` ✅
- Fetch req pendientes → `onSnapshot` ✅
- Cotización blue → pasada por props desde App.jsx ✅

**Hallazgos:**
1. ✅ Grid limpio de 6 columnas (antes 7, con duplicados)
2. ✅ Panorama Financiero unifica req. viernes + certs + pagos campo
3. ✅ Panel de aprobación de pagos funciona (click en "Pagos Campo")
4. ⚠️ El componente tiene 866 líneas — candidato a split futuro
5. ⚠️ `handleEjecutarPago` está duplicado conceptualmente con `handleAprobarPago`

### webapp/src/App.jsx

**Cambios recientes:**
- ✅ Fetch cotización blue vía `dolarapi.com/v1/dolares/blue`
- ✅ Pasa `cotizacionCompra`, `cotizacionVenta`, `cotizacionUpdated` a Resumen
- ✅ Fallback a $1250 si API falla

### obras-client/src/admin/tabs/TabContratistas.jsx (258 líneas, 13KB)

**Estado:** 🟢 Bien modularizado

**Cambios de esta sesión:**
- ✅ Import `useCertificaciones` para calcular avance
- ✅ Columna "Avance" con barra de progreso
- ✅ Columna "Retención" acumulada
- ✅ Badge "VENCIDO" en estado
- ✅ Fecha fin en rojo si vencida
- ✅ Botón PDF "Estado de Cuenta" por contratista
- ✅ Fallback de pagos: si no hay `proveedor_id` linkeado, usa certificaciones neto

**Lógica de pagos (IMPORTANTE):**
```
SI contratista.proveedor_id existe Y hay movimientos con ese proveedorId:
  → Pagado = suma de movimientos de tesorería (fuente real)
SINO:
  → Pagado = suma de monto_neto de certificaciones (fallback)
```

### obras-client/src/lib/pdfContratista.js (195 líneas, nuevo)

**Estado:** 🟢 Nuevo, limpio

- Genera HTML profesional vía `window.open()` + `window.print()`
- Sin dependencias externas (no jsPDF)
- Normaliza monedas mixtas usando TC
- Campos Firestore: `concepto`, `rubro`, `cajaOrigen`, `monto`, `moneda`

---

## Investigación Completada

### Análisis Lebane vs D+ARQ

| Feature | Lebane | D+ARQ | Estado |
|---------|--------|-------|--------|
| Contrato con monto pactado | ✅ Multi-partida | ✅ Una línea | OK para ahora |
| Certificación por % y monto | ✅ | ✅ Por monto | OK |
| Adelantos con amortización | ✅ Auto | ❌ | **Descartado por usuario** |
| Retenciones (fondo reparo) | ✅ | ✅ Implementado | ✅ |
| Curva avance físico vs financiero | ✅ | ❌ | **Pendiente** |
| Órdenes de cambio | ✅ | ✅ TabOrdenesCambio | ✅ |
| Control presupuestal | ✅ | ✅ KPIs | ✅ |
| Requisiciones → OC → Pago | ✅ | ✅ Req → Aprobación → Ejecución | ✅ |
| Desglose multi-partida | ✅ | ❌ | **Pendiente (próxima sesión)** |
| PDF Estado de cuenta | ❌ (portal web) | ✅ Implementado | ✅ |

### Flujo de Solicitud de Pago (implementado)

```
CAMPO (inspección)  →  Crea solicitud tipo "pago" estado "pendiente_aprobacion"
     ↓
DASHBOARD (webapp)  →  Director ve en Panorama Financiero "● X por aprobar"
     ↓                  Click → despliega panel → Sí/No
APROBADA            →  Estado cambia a "aprobada"
     ↓
CARD "POR EJECUTAR" →  Violeta ve los pagos aprobados
     ↓                  Click "Marcar Ejecutado"
EJECUTADA           →  Ciclo cerrado
```

---

## Pendientes para Próxima Sesión

### Prioridad Alta
1. **Desglose multi-partida por contratista (#6)**
   - Agregar `partidas[]` al modelo de contratista
   - Modificar ContratistasModal para CRUD de partidas
   - Modificar NuevaCertificacionModal para certificar por partida
   - Recalcular avance granular por partida
   - **Esfuerzo:** ~2 horas

### Prioridad Media
2. **Curva avance físico vs financiero (#2)**
   - Gráfico SVG/Canvas por obra
   - Línea azul: % gastado vs Línea verde: % certificado
   - Depende de #6 para ser realmente útil
   - **Esfuerzo:** ~40 min

### Deuda Técnica
3. **Resumen.jsx → Split** — 866 líneas, candidato a extraer:
   - Sección "Seguimiento de Obras" → componente propio
   - Sección "Transferencias" → componente propio
   - Panel "Pagos Pendientes" → si crece, extraer

4. **Archivos de conflicto Dropbox** — Hay archivos `(Copia en conflicto de DESKTOP-MN61MMA 2026-05-08).jsx` sueltos en obras-client. Deberían limpiarse manualmente.

---

## Archivos Modificados en Esta Sesión

| Archivo | Módulo | Cambios |
|---------|--------|---------|
| `webapp/src/App.jsx` | webapp | Fetch dólar blue API, props cotización |
| `webapp/src/gestion/Resumen.jsx` | webapp | Panorama Financiero, grid 6 cols, panel aprobación pagos, progreso obras |
| `obras-client/src/admin/tabs/TabContratistas.jsx` | obras | Avance, retención, VENCIDO, PDF, fallback pagos |
| `obras-client/src/lib/pdfContratista.js` | obras | **NUEVO** — Generador PDF estado de cuenta |

### Estado de Sincronización (prod → sandbox)

Todos los archivos fueron sincronizados al `_DEV_SANDBOX` al cierre de sesión:
```
webapp/src/gestion/Resumen.jsx       ✅ Sincronizado
webapp/src/App.jsx                   ✅ Sincronizado
obras-client/.../TabContratistas.jsx ✅ Sincronizado
obras-client/src/lib/pdfContratista.js ✅ Sincronizado
```

---

## Comando para Iniciar

```powershell
# Desde _DEV_SANDBOX:
cd "c:\Users\HP\Dropbox\D+ARQ\sitema de gestion\_DEV_SANDBOX"

# Webapp (puerto 5173):
cd webapp; npm run dev

# Obras-client (puerto 5174):
cd obras-client; npm run dev
```

> [!CAUTION]
> npm puede fallar con error de execution policy en PowerShell.
> Usar `cmd /c "cd /d ruta && npm run dev"` como fallback.
