# HANDOFF — obras-client
> Última actualización: 2026-04-24 · Sesión de modularización completa

---

## 1. CONTEXTO DEL PROYECTO

### Qué es
Módulo React/Vite **independiente** para gestión y seguimiento de obras de construcción de D+ARQ.
Vive en Dropbox y se conecta a Firebase (mismo proyecto que la webapp principal).

### Rutas clave

| Qué | Ruta |
|---|---|
| **Módulo obras** (activo) | `c:\Users\cuba\Dropbox\D+ARQ\sitema de gestion\obras-client\` |
| **Webapp principal** | `c:\Users\cuba\Dropbox\D+ARQ\sitema de gestion\webapp\` |

### Cómo levantar el servidor de desarrollo

```powershell
cd "c:\Users\cuba\Dropbox\D+ARQ\sitema de gestion\obras-client"
npm run dev
# → http://localhost:5174
```

### Cómo buildear

```powershell
cd "c:\Users\cuba\Dropbox\D+ARQ\sitema de gestion\obras-client"
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
npx vite build
# Esperado: "✓ built in ~5s"
```

> ⚠️ El EPERM en `dist/` es Dropbox bloqueando el borrado — NO es error de código. Borrar `dist/` antes de buildear.

---

## 2. LO QUE SE HIZO EN ESTA SESIÓN

### Fase A — Limpieza ✅
No había archivos zombie ni copias de conflicto de Dropbox.

### Fase B4 — Modal.jsx compartido ✅
- `src/components/Modal.jsx` es el único wrapper de diálogos del sistema.
- Todos los modales migrados. `ModalPortal` eliminado.
- Maneja: overlay, header+cierre, footer, scroll interno (`maxHeight: 90vh`).

### Fase B1 — KPICard.jsx ✅
- `src/components/KPICard.jsx` creado.
- Adoptado en: `TabCajaChica`, `TabOrdenesCambio`, `TabAcopios`.
- Pendiente de adopción: `TabPagosDirectos`, `TabCashFlow`, `TabLogistica`, `TabHonorarios`, `TabCertificaciones`.

### Fase C1 — Split useObras.js ✅
- `useObras.js` → barrel de re-exports (14 líneas). Cero breaking changes.
- Cada hook en su propio archivo en `src/hooks/`.

### Fase C2 — Split TabCertificaciones ✅
- 868 líneas → 374 líneas (tabla+KPIs).
- Extraídos a `tabs/certificaciones/`: `NuevaCertificacionModal.jsx` (351 l.) + `PagoClienteModal.jsx` (173 l.).

### Fase C3 — Split TabHonorarios ✅
- 445 líneas → 293 líneas.
- Extraídos a `tabs/honorarios/`: `HonorarioModal.jsx` (137 l.) + `constants.js` (TIPOS, ESTADO_META, esCobroHonorarios, movToUSD).

---

## 3. ESTRUCTURA ACTUAL

```
obras-client/src/
├── admin/
│   ├── AdminApp.jsx
│   ├── ConfigModal.jsx            (Modal.jsx ✅)
│   └── tabs/
│       ├── TabCertificaciones.jsx (374 l.)
│       ├── certificaciones/
│       │   ├── NuevaCertificacionModal.jsx
│       │   └── PagoClienteModal.jsx
│       ├── TabHonorarios.jsx      (293 l.)
│       ├── honorarios/
│       │   ├── HonorarioModal.jsx
│       │   └── constants.js
│       ├── TabCajaChica.jsx       (KPICard ✅)
│       ├── TabOrdenesCambio.jsx   (KPICard ✅)
│       ├── TabAcopios.jsx         (KPICard ✅)
│       ├── TabPagosDirectos.jsx   (KPICard pendiente)
│       ├── TabCashFlow.jsx        (KPICard pendiente)
│       ├── TabLogistica.jsx       (KPICard pendiente)
│       ├── TabContratistas.jsx
│       ├── TabTransacciones.jsx
│       └── TaxonomiaManager.jsx
├── components/
│   ├── Modal.jsx                  ← único wrapper de diálogos
│   ├── KPICard.jsx                ← nuevo
│   └── ComprobanteUploader.jsx    (PDF upload/view/download)
├── hooks/
│   ├── useObras.js                ← barrel (solo re-exports)
│   ├── useObrasCore.js            (useObrasMain, useObraConfig)
│   ├── useMovimientosMain.js      (useMovimientosMain, useTcGlobal, useProveedoresMain)
│   ├── useCertificaciones.js
│   ├── useContratistas.js
│   ├── useHonorarios.js
│   ├── useLogistica.js
│   ├── useAcopios.js
│   ├── useOrdenesCambio.js
│   ├── useCajaChica.js
│   ├── useTransacciones.js
│   ├── usePagosDirectos.js
│   ├── useFotos.js
│   └── useEstadoCuenta.js
└── lib/
    ├── calculadora.jsx            (fmt, DualAmt, DualResult, sumarEquiv)
    └── ...
```

---

## 4. LÓGICA DE NEGOCIO CLAVE

### Flujo de pago de certificaciones

```
Cliente paga a D+ARQ:
  baseSinIva = cert.total_sin_iva  (avance + margen D+ARQ)
  IVA = baseSinIva × iva_pct/100
  TOTAL = baseSinIva + IVA         ← "Total que paga el cliente"

D+ARQ paga al contratista:
  cert.monto_neto                  (avance − retención)

Contratista debe a D+ARQ:
  cert.margen_darq                 ← "↩ Contratista le debe a D+ARQ"
```

> ⚠️ El IVA base es `total_sin_iva` (con margen), NO `monto_neto`. Esto fue corregido.

### Comprobantes PDF

Guardados como base64 en Firestore en el doc de la certificación:
- `comprobante_b64`, `comprobante_nombre`, `tiene_comprobante: true`
- Botones "Ver" y "Bajar" aparecen en la tabla bajo el badge "✓ Pagado"
- Funciones: `openPDF(b64)` y `downloadPDF(b64, nombre)` de `ComprobanteUploader.jsx`

### TC Global
`useTcGlobal(obraId)` → promedio ponderado de todos los movimientos de la obra. Fallback: 1000.

---

## 5. APIs DE COMPONENTES COMPARTIDOS

### `<Modal>`
```jsx
import Modal from '../../components/Modal.jsx';

<Modal
  title="Título"
  subtitle="Subtítulo opcional"
  onClose={handleClose}
  maxWidth={520}
  footer={<>
    <button onClick={handleClose}>Cancelar</button>
    <button onClick={handleSave}>Guardar</button>
  </>}
>
  {/* contenido — el scroll ya está incluido */}
</Modal>
```

### `<KPICard>`
```jsx
import KPICard from '../../components/KPICard.jsx';

<div className="grid-4" style={{ marginBottom: 24 }}>
  <KPICard
    label="Total Gastado"
    value={fmt(totalGastado)}
    sub={`${n} rendiciones`}
    color="#f87171"
    borderColor="rgba(248,113,113,0.2)"
    background="rgba(248,113,113,0.04)"
  />
</div>
```

---

## 6. ⚠️ PROBLEMA DE ENCODING — REGLA CRÍTICA

### Síntoma
Caracteres como `Ã³` (=ó), `Â·` (=·), `âœ"` (=✓), `â€"` (=—) en la UI.

### Causa
`Get-Content | Set-Content -Encoding UTF8` en PowerShell 5.1 mangla archivos UTF-8 sin BOM.

### Script de fix (ya aplicado, documentado por si vuelve a ocurrir)
```powershell
$utf8nb = New-Object System.Text.UTF8Encoding $false
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
$bytes   = [System.Text.Encoding]::GetEncoding(1252).GetBytes($content)
$fixed   = [System.Text.Encoding]::UTF8.GetString($bytes)
[System.IO.File]::WriteAllText($path, $fixed, $utf8nb)
```

### Regla para futuras ediciones con PowerShell
```powershell
# LEER:
$lines = [System.IO.File]::ReadAllLines($path, [System.Text.Encoding]::UTF8)
# ESCRIBIR:
$utf8nb = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllLines($path, $lines, $utf8nb)
```

---

## 7. BUGS RESUELTOS EN ESTA SESIÓN

| Bug | Causa | Fix |
|---|---|---|
| `ModalPortal is not defined` (TabCertificaciones) | PagoClienteModal usaba ModalPortal sin import | Migrado a Modal.jsx |
| `Send is not defined` (TabHonorarios) | Faltaba en import de lucide | Movido a constants.js |
| `esCobroHonorarios is not defined` | C3 split cortó rango incorrecto | constants.js compartido |
| Caracteres UTF-8 manglados | PowerShell re-encodificó los archivos | Script cp1252→utf8 |
| IVA calculado sobre `monto_neto` (incorrecto) | Bug lógico en PagoClienteModal | Base → `total_sin_iva` |
| Comprobante PDF no accesible después de guardar | No había UI para verlo/bajarlo | Botones Ver+Bajar en tabla |

---

## 8. PENDIENTES ORDENADOS POR PRIORIDAD

### Inmediatos (bajo riesgo, ~30min c/u)
1. Adoptar `KPICard` en `TabPagosDirectos` — mismo patrón que los otros tres
2. Adoptar `KPICard` en `TabCashFlow`
3. Adoptar `KPICard` en `TabLogistica`

### Importantes (medio riesgo, ~1h c/u)
4. `SectionHeader.jsx` (B2) — título + botón de acción que se repite en todos los tabs
5. `StatusBadge.jsx` (B3) — badge clickeable de estado reutilizable
6. Split `TabCajaChica` → `honorarios/CajaChicaModal.jsx`
7. Split `TabContratistas` → `ContratistasModal.jsx`

### Futuro
8. Unificar CSS design tokens con webapp principal
9. Monorepo si el sistema sigue creciendo

---

## 9. VERIFICACIÓN AL RETOMAR

```
1. npm run dev en obras-client → http://localhost:5174
2. Abrir una obra con certificaciones
3. Click "Registrar pago" → verificar que el total incluye margen D+ARQ
4. Confirmar pago con PDF adjunto
5. Verificar botones "Ver" y "Bajar" aparecen bajo "✓ Pagado"
6. Ir a TabHonorarios → debe cargar sin errores de consola
7. Abrir cualquier modal → verificar scroll sin cortes
8. Verificar que los KPI de TabCajaChica, TabOrdenesCambio, TabAcopios se ven bien
```
