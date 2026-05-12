# Handoff: Módulo "Inspección de Obras" (PWA)

Este documento contiene el estado actual del desarrollo del módulo de inspección en campo para jefes de obra, para poder retomar el trabajo en otro equipo sin perder contexto.

---

## 📌 Contexto del Proyecto
Se está desarrollando una **PWA (Progressive Web App)** nativa para dispositivos móviles (`inspeccion-client`) cuyo objetivo es que los Jefes de Obra puedan cargar gastos (tickets) y reportes desde el celular directamente a la base de datos de D+ARQ, eliminando la dependencia de WhatsApp.

Se está trabajando de manera segura dentro de una carpeta aislada llamada `_DEV_SANDBOX` para no afectar el entorno de producción hasta que la PWA esté terminada.

---

## ✅ Lo que ya está terminado y funcionando
1. **Entorno Sandbox**: Se clonaron los repositorios (`webapp`, `obras-client`, `@darq/ui`) en `_DEV_SANDBOX`.
2. **Setup de Inspección Client (Puerto 5176)**:
   - Creado con Vite + React + Tailwind v4.
   - Autenticación con Firebase Auth ya configurada.
   - UI "Mobile First" con botones gigantes (glassmorphism oscuro).
3. **Módulo "Subir Gasto / Ticket"**:
   - Flujo optimizado: El usuario saca la foto, selecciona la obra y pone el monto.
   - **Integración con Dropbox API**: El sistema *no* usa Firebase Storage. Se implementó la subida directa a la carpeta de la obra en Dropbox (`/D+ARQ/Obras/[Nombre Obra]`), creando automáticamente el link público y guardando la referencia en la colección de Firestore: `artifacts/sg-darq/public/data/inbox_movimientos`.
4. **Bandeja de Entrada en el Webapp Administrativo (Puerto 5177)**:
   - Se creó una nueva pestaña **"Inbox Tickets"** en el panel principal (ícono de campana/recibo).
   - Se listan los tickets pendientes subidos desde los celulares.
   - **Vista Dividida (Split-View) con Zoom**: Al hacer clic en "Contabilizar", se abre un Modal panorámico. A la izquierda hay un visualizador de la foto del ticket (con controles de zoom y paneo por arrastre) y a la derecha el formulario de carga contable precargado con los datos del celular.
   - Al guardar el movimiento, el ticket original se marca automáticamente como `aprobado` y desaparece del inbox.

---

## 🚧 Próximos Pasos (Lo que falta hacer)

1. **Convertir `inspeccion-client` en una PWA Real**:
   - Crear el archivo `manifest.json` y agregar iconos (App Icons).
   - Configurar el Service Worker (ej. `vite-plugin-pwa`) para permitir que la web app se pueda "Instalar" en la pantalla de inicio del celular y cachear assets offline.
2. **Módulo "Bitácora"**:
   - Implementar el botón "Bitácora Visual" en la pantalla principal del celular.
   - Reutilizar el hook `useDropbox.js` (ya implementado) para subir múltiples fotos a la carpeta de Dropbox de la obra.
3. **Módulo "Checklist / Tareas" (Opcional)**:
   - Lista simple para tildar materiales recibidos o solicitudes.
4. **Pase a Producción (Merge)**:
   - Una vez finalizado y probado, mover las carpetas de `inspeccion-client` y los archivos modificados del `webapp` fuera de `_DEV_SANDBOX` hacia la estructura principal y hacer el build de despliegue a Firebase Hosting.

---

## 🤖 Prompt para pegar en la nueva sesión con la IA
*Copia y pega el siguiente recuadro en tu nuevo chat:*

```text
¡Hola! Necesito retomar el desarrollo del módulo móvil "Inspección PWA" del sistema D+ARQ. 
Por favor, lee el archivo `HANDOFF_INSPECCION.md` que está en la raíz del proyecto para ponerte al día con el contexto. 

Actualmente estamos trabajando en el entorno aislado `_DEV_SANDBOX`.
El módulo de "Subir Gasto" conectado con Dropbox y el "Inbox Administrativo" con Split-View ya están funcionando perfectamente. 

Nuestro objetivo para esta sesión es empezar con el Punto 1 de los próximos pasos: Convertir `inspeccion-client` en una PWA real e instalable en el celular (Service Worker + Manifest), y luego armar el módulo de Bitácora.

Por favor, revisá el Handoff y decime cómo empezamos.
```
