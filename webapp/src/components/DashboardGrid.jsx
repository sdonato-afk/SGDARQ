import React, { useState, useRef, useEffect } from 'react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const DEFAULT_LAYOUT = [
  {i:'ocupacion', x:0, y:0, w:3, h:8, minW:2, minH:3},
  {i:'socios', x:0, y:8, w:3, h:4, minW:2, minH:2},
  {i:'kpis', x:3, y:0, w:2, h:3, minW:1, minH:2},
  {i:'alertAlq', x:3, y:3, w:2, h:4, minW:1, minH:2},
  {i:'alertExp', x:3, y:7, w:2, h:5, minW:1, minH:2},
  {i:'contratos', x:5, y:0, w:3, h:12, minW:2, minH:3},
  {i:'chart', x:8, y:0, w:4, h:12, minW:2, minH:4},
];

const WIDGET_COLORS = {
  ocupacion: 'blue', socios: 'cyan', kpis: 'emerald',
  alertAlq: 'amber', alertExp: 'rose', contratos: 'purple', chart: 'indigo'
};

const WIDGET_LABELS = {
  ocupacion: 'OCUPACION', socios: 'SOCIOS', kpis: 'KPIs',
  alertAlq: 'SIN PAGO ALQ', alertExp: 'SIN PAGO EXP', contratos: 'CONTRATOS', chart: 'GRAFICO'
};

export default function DashboardGrid({ editMode, onEditChange, widgets, defaultLayout = DEFAULT_LAYOUT, widgetColors = WIDGET_COLORS, widgetLabels = WIDGET_LABELS }) {
  const [layouts, setLayouts] = useState({ lg: defaultLayout });
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  useEffect(() => {
    if (containerRef.current) {
      const ro = new ResizeObserver(entries => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width);
        }
      });
      ro.observe(containerRef.current);
      setContainerWidth(containerRef.current.offsetWidth);
      return () => ro.disconnect();
    }
  }, []);

  const handleLayoutChange = (layout, allLayouts) => {
    if (editMode) {
      setLayouts(allLayouts);
    }
  };

  const exportConfig = () => {
    const config = JSON.stringify(layouts.lg || layouts, null, 2);
    navigator.clipboard.writeText(config).then(() => {
      alert('Layout copiado al portapapeles!\n\n' + config);
    });
  };

  return (
    <div ref={containerRef}>
      {editMode && (
        <div className="mb-2 p-2 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-center gap-3 flex-wrap">
          <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">{'\u270f\ufe0f'} MODO EDITOR</span>
          <span className="text-[10px] text-slate-400">{'Arrastr\u00e1 y redimension\u00e1 cada panel libremente'}</span>
          <button onClick={exportConfig} className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-black uppercase tracking-wider hover:bg-emerald-500 transition-all">{'\ud83d\udccb'} Copiar Config</button>
          <button onClick={() => onEditChange(false)} className="px-2 py-1 bg-rose-600 text-white rounded text-[10px] font-black uppercase tracking-wider hover:bg-rose-500 transition-all">{'\u2715'} Cerrar</button>
        </div>
      )}
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{lg: 800, md: 600, sm: 0}}
        cols={{lg: 12, md: 8, sm: 4}}
        rowHeight={40}
        width={containerWidth}
        isDraggable={editMode}
        isResizable={editMode}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        style={{minHeight:'500px'}}
        compactType="vertical"
        margin={[8, 8]}
      >
        {Object.entries(widgets).map(([key, widgetContent]) => {
          const color = widgetColors[key] || 'slate';
          const label = widgetLabels[key] || key.toUpperCase();
          return (
            <div key={key} className={editMode ? 'outline outline-2 outline-dashed outline-white/20 rounded-xl' : ''}>
              {editMode && (
                <div className="drag-handle cursor-move text-[6px] font-black text-amber-400 bg-amber-500/10 px-1 rounded text-center py-0.5 mb-0.5 select-none"
                  style={{borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
                  {'\u2800\u2800\u2800'} {label}
                </div>
              )}
              <div className="h-full overflow-hidden">
                {widgetContent}
              </div>
            </div>
          );
        })}
      </ResponsiveGridLayout>
    </div>
  );
}
