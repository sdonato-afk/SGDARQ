# Directrices Estéticas y Funcionales de D+ARQ

## 1. Monorepo y Componentes Compartidos
Todos los componentes visuales principales del sistema de gestión están centralizados en un paquete de monorepo local llamado **`@darq/ui`**.

**NUNCA crear copias locales de componentes en `webapp`, `obras-client` o `agenda-client`.** 
Siempre se deben importar desde el sistema central:

```javascript
import { DataTable, ColumnFilter, Modal, ModalPortal, KPICard, CascadeSelect } from '@darq/ui';
```

## 2. Estética Oficial: Deep Space Glassmorphism
El sistema *entero* debe adherirse al lenguaje visual establecido por el módulo de Seguimiento de Obras:
- **Fondo General:** Deep Space (`#060811`)
- **Paneles Glassmorphism:** Fondo de tarjetas con sutiles transparencias (`rgba(255,255,255,0.04)`) y bordes (`1px solid rgba(255,255,255,0.07)`).
- **Tipografía:**
  - Valores financieros en tipografía monospace (e.g. `font-family: 'JetBrains Mono', monospace`).
  - Etiquetas (`label`) y encabezados de tabla (`th`) en MAYÚSCULAS pequeñas (size `10px` o `11px`) con mucho tracking (`letter-spacing: 0.1em`).
- **Estados/KPIs:** 
  - Rojo (Egreso): `#F87171`
  - Verde (Ingreso): `#34D399`
  - Azul (Acento general): `#818CF8` o `#3B82F6`

**Prohibido:** Usar bordes gruesos, colores de fondo sólidos genéricos (como gris oscuro sólido) o estilos que rompan el minimalismo.
