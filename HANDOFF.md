# HANDOFF — Ecosistema D+ARQ
> Última actualización: 29/04/2026

## 🌐 URLs de Producción

| Sistema | URL |
|---|---|
| **Sistema Principal** | https://sg-darq.web.app/ |
| **Agenda de Gestión** | https://sg-darq.web.app/agenda/ |
| **Seguimiento de Obras** | https://sg-darq.web.app/obras/ |
| **Portal Cliente (ejemplo)** | https://sg-darq.web.app/obras/cliente/{obraId}/{token} |

## 📁 Estructura del Proyecto

```
sitema de gestion/
├── webapp/                 # Sistema principal (React + Vite)
│   ├── src/                # Código fuente
│   ├── dist/               # Build de producción (incluye /obras/ y /agenda/)
│   ├── firebase.json       # Config de hosting con rewrites
│   └── .firebaserc         # Proyecto: sg-darq
├── obras-client/           # Seguimiento de Obras (React + Vite)
│   ├── src/
│   ├── vite.config.js      # base: '/obras/', manualChunks
│   └── dist/
├── agenda-client/          # Agenda de Gestión (React + Vite)
│   ├── src/
│   ├── vite.config.js      # base: '/agenda/', manualChunks
│   └── dist/
└── _DEV_SANDBOX/           # Backup de desarrollo (webapp + obras-client)
```

## 🔧 Stack Técnico

- **Frontend:** React 18 + Vite 5
- **Estilos:** TailwindCSS
- **Base de datos:** Firebase Firestore (proyecto `sg-darq`)
- **Hosting:** Firebase Hosting
- **Caché:** `persistentLocalCache` + `persistentMultipleTabManager` (SDK 10.14.1)

## 🚀 Proceso de Deploy

### 1. Compilar los 3 proyectos

```bash
cd obras-client && npm run build
cd ../agenda-client && npm run build
cd ../webapp && npm run build
```

### 2. Ensamblar en webapp/dist

```bash
cd webapp
# Copiar sub-apps al directorio de producción
mkdir -p dist/obras dist/agenda
cp -r ../obras-client/dist/* dist/obras/
cp -r ../agenda-client/dist/* dist/agenda/
```

**PowerShell:**
```powershell
New-Item -Path "dist\obras","dist\agenda" -ItemType Directory -Force
Copy-Item -Path "..\obras-client\dist\*" -Destination "dist\obras\" -Recurse -Force
Copy-Item -Path "..\agenda-client\dist\*" -Destination "dist\agenda\" -Recurse -Force
```

### 3. Deploy

```bash
firebase deploy --only hosting
```

## 🔑 Firebase Config

```js
apiKey: "AIzaSyBkkm0sFSyhEjOkHco80yJsOTdXUDc-QTY"
projectId: "sg-darq"
appId: "sg-darq"
```

Todas las colecciones principales están bajo:
`artifacts/{appId}/public/data/{colección}`

Colecciones de obras-client:
`artifacts/{appId}/obras_data/{obraId}/{subcolección}`

## 📋 Cambios Clave de Esta Sesión (29/04/2026)

### Conciliación de vencimientos (webapp → Resumen.jsx)
Los vencimientos del dashboard principal ahora se cruzan con movimientos/egresos para detectar pagos automáticamente. Si hay un egreso del mismo mes, área, categoría y rubro, el vencimiento no se muestra como pendiente.

### Detección de pagos de adicionales (obras-client → TabResumen.jsx)
Los pagos de adicionales se detectan buscando "adicional" en CUALQUIER campo del movimiento (`tipoObraIngreso`, `rubro`, `concepto`, `subRubro`), no solo en el primero truthy. Usa `.some()` en vez de `||`.

### Honorarios TC de emisión (obras-client → TabResumen.jsx)
El saldo de honorarios se calcula en ARS usando el `tc_emision` de cada certificado individual (valor "congelado" al momento de emisión), NO reconvirtiendo USD × TC promedio.

**Fórmula:** `saldoARS = Σ(cuota.monto × cuota.tc_emision) - Σ(cobros_ARS)`

### Link a Obras (webapp → Resumen.jsx)
El botón "Abrir Seguimiento de Obras" ahora apunta a `/obras/` en producción y `localhost:5174` en desarrollo.

## ⚠️ Notas Importantes

1. **Dropbox sync:** Los `node_modules/` están excluidos por `.gitignore`. Al clonar en otra PC, ejecutar `npm install` en cada proyecto.
2. **Caché IndexedDB:** Si se modifica la estructura de Firestore, el usuario final puede necesitar limpiar IndexedDB manualmente (Dev Tools > Application > IndexedDB).
3. **Puertos dev locales:**
   - Webapp: `localhost:5173`
   - Obras: `localhost:5174`
   - Agenda: `localhost:5175`
4. **firebase-tools:** Requiere `npm install -g firebase-tools` y `firebase login`.
