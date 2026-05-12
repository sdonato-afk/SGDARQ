/**
 * Taxonomía por defecto para el módulo de gestión de obras.
 * Se carga en Firestore la primera vez y luego el admin la gestiona desde la UI.
 *
 * Árbol: Categoría → Rubro → [Conceptos]
 */

export const TAXONOMIA_DEFAULT = [
  {
    id: 'mano_de_obra',
    nombre: 'Mano de Obra',
    color: '#34d399',
    rubros: [
      { id: 'albanileria',    nombre: 'Albañilería',         conceptos: ['Anticipo', 'Liquidación semanal', 'Certificación parcial', 'Liquidación final', 'Adicional'] },
      { id: 'electricidad',   nombre: 'Electricidad',        conceptos: ['Anticipo', 'Liquidación semanal', 'Certificación parcial', 'Liquidación final', 'Adicional'] },
      { id: 'plomeria',       nombre: 'Plomería',            conceptos: ['Anticipo', 'Liquidación semanal', 'Certificación parcial', 'Liquidación final', 'Adicional'] },
      { id: 'sanitaria',      nombre: 'Sanitaria',           conceptos: ['Anticipo', 'Liquidación semanal', 'Certificación parcial', 'Liquidación final', 'Adicional'] },
      { id: 'gas',            nombre: 'Gas',                 conceptos: ['Anticipo', 'Liquidación semanal', 'Certificación parcial', 'Liquidación final', 'Adicional'] },
      { id: 'yeseria',        nombre: 'Yesería',             conceptos: ['Anticipo', 'Liquidación semanal', 'Certificación parcial', 'Liquidación final', 'Adicional'] },
      { id: 'pintura',        nombre: 'Pintura',             conceptos: ['Anticipo', 'Liquidación semanal', 'Certificación parcial', 'Liquidación final', 'Adicional'] },
      { id: 'carpinteria',    nombre: 'Carpintería',         conceptos: ['Anticipo', 'Liquidación semanal', 'Certificación parcial', 'Liquidación final', 'Adicional'] },
      { id: 'herreria',       nombre: 'Herrería',            conceptos: ['Anticipo', 'Liquidación semanal', 'Certificación parcial', 'Liquidación final', 'Adicional'] },
      { id: 'climatizacion',  nombre: 'Climatización / AC',  conceptos: ['Anticipo', 'Liquidación semanal', 'Certificación parcial', 'Liquidación final', 'Adicional'] },
      { id: 'impermeabiliz',  nombre: 'Impermeabilización',  conceptos: ['Anticipo', 'Liquidación semanal', 'Certificación parcial', 'Liquidación final', 'Adicional'] },
      { id: 'excavaciones',   nombre: 'Excavaciones',        conceptos: ['Anticipo', 'Liquidación semanal', 'Certificación parcial', 'Liquidación final', 'Adicional'] },
      { id: 'estructura',     nombre: 'Estructura',          conceptos: ['Anticipo', 'Liquidación semanal', 'Certificación parcial', 'Liquidación final', 'Adicional'] },
      { id: 'mo_varios',      nombre: 'Varios',              conceptos: ['Anticipo', 'Liquidación', 'Adicional', 'Otros'] },
    ],
  },
  {
    id: 'materiales',
    nombre: 'Materiales',
    color: '#818cf8',
    rubros: [
      { id: 'hierros',        nombre: 'Hierros y Estructura', conceptos: ['Barras', 'Malla electrosoldada', 'Perfil metálico', 'Cemento', 'Block', 'Ladrillo', 'Arena', 'Piedra', 'Varios'] },
      { id: 'sanitaria_mat',  nombre: 'Sanitaria',            conceptos: ['Cañerías PVC', 'Cañerías cobre', 'Accesorios', 'Griferías', 'Sanitarios', 'Varios'] },
      { id: 'electrico_mat',  nombre: 'Material Eléctrico',   conceptos: ['Cable', 'Tablero', 'Disyuntores', 'Luminaria', 'Tomas y llaves', 'Cañeros', 'Varios'] },
      { id: 'revestimientos', nombre: 'Revestimientos',       conceptos: ['Cerámicos', 'Porcelanato', 'Madera', 'Microcemento', 'Placas', 'Varios'] },
      { id: 'pinturas',       nombre: 'Pinturas',             conceptos: ['Látex', 'Esmalte', 'Sellador', 'Enduído', 'Varios'] },
      { id: 'carpinteria_mat',nombre: 'Carpintería',          conceptos: ['Aberturas', 'Puertas interiores', 'Ventanas', 'Herrajes', 'Varios'] },
      { id: 'impermeab_mat',  nombre: 'Impermeabilización',   conceptos: ['Membrana', 'Pintura asfáltica', 'Varios'] },
      { id: 'aislaciones',    nombre: 'Aislaciones',          conceptos: ['Lana de vidrio', 'Poliestireno', 'Varios'] },
      { id: 'mat_varios',     nombre: 'Varios',               conceptos: ['Elementos menores', 'Limpieza', 'Consumibles', 'Otros'] },
    ],
  },
  {
    id: 'servicios',
    nombre: 'Servicios',
    color: '#fbbf24',
    rubros: [
      { id: 'logistica',      nombre: 'Logística',            conceptos: ['Flete', 'Acarreo', 'Grúa', 'Camión volcador', 'Otros'] },
      { id: 'equipamiento',   nombre: 'Equipamiento',         conceptos: ['Alquiler andamio', 'Alquiler herramienta', 'Alquiler maquinaria', 'Otros'] },
      { id: 'profesionales',  nombre: 'Profesionales',        conceptos: ['Planos', 'Medición', 'Certificado PF', 'Perito', 'Otros'] },
      { id: 'srv_varios',     nombre: 'Varios',               conceptos: ['Limpieza obra', 'Seguridad', 'Otros'] },
    ],
  },
  {
    id: 'impuestos',
    nombre: 'Impuestos y Tasas',
    color: '#f87171',
    rubros: [
      { id: 'municipal',      nombre: 'Municipal',            conceptos: ['ABL', 'Sellos', 'Habilitación', 'Otros'] },
      { id: 'provincial',     nombre: 'Provincial',           conceptos: ['IIBB', 'Sellos prov.', 'Otros'] },
      { id: 'nacional',       nombre: 'Nacional',             conceptos: ['IVA', 'AFIP', 'Otros'] },
    ],
  },
  {
    id: 'gastos_cliente',
    nombre: 'Gastos del Cliente',
    color: '#94a3b8',
    rubros: [
      { id: 'equipamiento_cl',nombre: 'Equipamiento propio',  conceptos: ['Electrodomésticos', 'Muebles', 'Sanitarios premium', 'Iluminación', 'Otros'] },
      { id: 'impuestos_cl',   nombre: 'Impuestos propios',    conceptos: ['ABL', 'Sellos', 'Habilitación', 'Otros'] },
      { id: 'financiero',     nombre: 'Gastos financieros',   conceptos: ['Intereses banco', 'Honorarios escribano', 'Tasación', 'Otros'] },
      { id: 'gc_varios',      nombre: 'Varios',               conceptos: ['Otros gastos propios'] },
    ],
  },
];
