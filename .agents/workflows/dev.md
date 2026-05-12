---
description: Workflow de desarrollo del sistema de gestión D+ARQ
---

// turbo-all

## Reglas de ejecución

1. **TODOS los comandos se ejecutan automáticamente** sin pedir confirmación al usuario.
2. La única excepción es un **implementation plan** que requiere aprobación explícita.
3. El usuario NO quiere ver código ni confirmaciones. Solo resultados.
4. Usar `SafeToAutoRun: true` en TODOS los `run_command` y `send_command_input`.

---

## Workspace de desarrollo

**El código vive en: `C:\Dev\darq\`** — NO en Dropbox.

El repositorio está en GitHub: `https://github.com/sdonato-afk/SGDARQ`

### Módulos del sistema
| Módulo | Path | Puerto local |
|---|---|---|
| webapp (admin) | `C:\Dev\darq\webapp\` | 5173 |
| obras-client | `C:\Dev\darq\obras-client\` | 5174 |
| agenda-client | `C:\Dev\darq\agenda-client\` | 5175 |
| inspeccion-client (PWA) | `C:\Dev\darq\inspeccion-client\` | 5176 |
| darq-ui (librería) | `C:\Dev\darq\packages\darq-ui\` | — |

---

## Stack técnico
- React + Vite
- Firebase Firestore
- Tailwind CSS (⚠️ inspeccion-client usa v3, el resto v4+)
- Lucide React (iconos)
- **Estética Global:** Deep Space Glassmorphism.
  - Fondo oscuro profundo (`#060811`).
  - Tarjetas translúcidas (`background: rgba(255,255,255,0.04)` y bordes sutiles `1px solid rgba(255,255,255,0.07)`).
  - Jerarquía tipográfica: Etiquetas en mayúsculas con tracking, números en `monospace`.

## Convenciones
- Egresos en rojo (`#f87171`), Ingresos en verde (`#34d399`).
- Formato numérico `es-AR` (10.000,00).
- Monedas: `u$d` para USD, `$` para ARS.

---

## Archivos de entorno (.env)

| Módulo | ¿Necesita .env? | Contenido | Backup |
|---|---|---|---|
| webapp | ❌ No | Firebase config hardcodeada en `src/config/firebase.js` | — |
| obras-client | ✅ Sí | Dropbox API tokens | `C:\Users\cuba\Dropbox\D+ARQ\sitema de gestion\obras-client\.env` |
| agenda-client | ❌ No | Firebase hardcodeado en su config | — |
| inspeccion-client | ❌ No | Firebase hardcodeado en su config | — |

> ⚠️ El `obras-client/.env` NO está en Git (gitignoreado). Está respaldado en Dropbox.
> Al clonar en una PC nueva, copiar desde: `C:\Users\cuba\Dropbox\D+ARQ\sitema de gestion\obras-client\.env`

El `sg-darq-service-account.json` también está gitignoreado. Backup en:
`C:\Users\cuba\Dropbox\D+ARQ\sitema de gestion\sg-darq-service-account.json`

---

## Protocolo multi-PC (Git)

**Dropbox ya NO se usa para sincronizar código.** El sync entre PCs se hace con Git.

### Al empezar a trabajar en cualquier PC
```powershell
cd C:\Dev\darq
git pull origin master        # bajar los últimos cambios
```

### Al terminar una sesión de trabajo
```powershell
cd C:\Dev\darq
git add -A
git commit -m "descripción del cambio"
git push origin master        # backup en GitHub
```

### Para hacer deploy a producción (sg-darq.web.app)
```powershell
cd C:\Dev\darq
.\deploy.ps1
```

### Primera vez en una PC nueva (clonar el repo)
```powershell
git clone https://github.com/sdonato-afk/SGDARQ.git C:\Dev\darq
cd C:\Dev\darq
npm install

# Fix tailwind v3 para inspeccion-client (siempre necesario)
npm install tailwindcss@3.4.19 --prefix inspeccion-client --no-save

# Copiar manualmente desde Dropbox (NO están en Git):
# - obras-client/.env           → C:\Users\cuba\Dropbox\D+ARQ\sitema de gestion\obras-client\.env
# - sg-darq-service-account.json → C:\Users\cuba\Dropbox\D+ARQ\sitema de gestion\sg-darq-service-account.json
```

### Arrancar servidores de desarrollo
```powershell
# O módulo por módulo:
cd C:\Dev\darq\webapp && npm run dev
cd C:\Dev\darq\obras-client && npm run dev
cd C:\Dev\darq\inspeccion-client && npm run dev
```

---

## ⚠️ Advertencias críticas

1. **Tailwind v3 en inspeccion-client**: Después de cualquier `npm install` limpio, reinstalar:
   ```
   npm install tailwindcss@3.4.19 --prefix C:\Dev\darq\inspeccion-client --no-save
   ```

2. **Archivos que NO están en Git** (copiar desde Dropbox al clonar en PC nueva):
   - `C:\Dev\darq\obras-client\.env`
   - `C:\Dev\darq\sg-darq-service-account.json`

3. **El deploy siempre desde `C:\Dev\darq`**, nunca desde Dropbox.

4. **Dropbox solo para datos de obra** (fotos, planos, informes en `/D+ARQ/Obras/`)
   y como **backup de los .env** que no están en Git.

5. **NO editar desde la carpeta Dropbox** (`C:\Users\cuba\Dropbox\D+ARQ\sitema de gestion\`).
   Esa carpeta es un archivo histórico. El código activo está en `C:\Dev\darq`.
