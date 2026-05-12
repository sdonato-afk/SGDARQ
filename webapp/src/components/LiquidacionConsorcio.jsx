import React, { useState, useMemo } from 'react';
import { X, FileText, Send, Calculator, Building } from 'lucide-react';
import { generarExpensasPDF } from '../lib/pdfBuilder';
import { getGrupoExpensa } from '../config/expensasMapping';

const COEFICIENTES_LUCIA = {
  'VO-LOCAL': 12.03, 'VO-1A': 4.91, 'VO-1B': 3.93, 'VO-1C': 4.30,
  'VO-2A': 4.94, 'VO-2B': 4.30, 'VO-2C': 3.96,
  'VO-3A': 4.94, 'VO-3B': 4.30, 'VO-3C': 3.96,
  'VO-4A': 4.94, 'VO-4B': 4.30, 'VO-4C': 3.96,
  'VO-5A': 4.94, 'VO-5B': 4.30, 'VO-5C': 3.96,
  'VO-6A': 5.81, 'VO-6B': 5.81, 'VO-7A': 5.33, 'VO-8A': 5.09
};

export default function LiquidacionConsorcio({ 
  isOpen, 
  onClose, 
  movimientos, 
  propiedades, 
  contratos 
}) {
  const [mesLiquidacion, setMesLiquidacion] = useState(() => {
     const d = new Date();
     return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const { prorrateo, resumenGastos, totalProrratear } = useMemo(() => {
    // 1. Identificar Propiedad Consorcio
    const propConsorcio = propiedades.find(p => p.codigo === 'VO-Consorcio' || p.calle === 'VO-Consorcio' || p.nombre?.includes('Consorcio'));
    const idConsorcio = propConsorcio ? propConsorcio.id : null;

    // 2. Filtrar Gastos del Mes
    const gastosMes = movimientos.filter(m => 
      m.area === 'Alquileres' && 
      m.tipo === 'Egreso' && 
      m.fecha?.startsWith(mesLiquidacion) &&
      (idConsorcio ? m.propiedadId === idConsorcio : true) // Fallback by just grabbing what they tagged if id is missing, though we should strictly match.
    );

    // If we strict match and find nothing, we might want to fallback to text match for safety in this specific ERP
    const gastosFinales = gastosMes.length > 0 ? gastosMes : movimientos.filter(m => 
       m.area === 'Alquileres' && 
       m.tipo === 'Egreso' && 
       m.fecha?.startsWith(mesLiquidacion) && 
       (m.concepto?.toLowerCase().includes('consorcio') || m.rubro?.toLowerCase().includes('consorcio'))
    );

    const resumenGastos = {
       'A. SUELDOS Y CARGAS SOCIALES': 0,
       'B. SERVICIOS PÚBLICOS': 0,
       'C. MANTENIMIENTO Y CONSERVACIÓN': 0,
       'D. GASTOS DE LIMPIEZA Y VARIOS': 0,
       'E. ADMINISTRACIÓN Y SEGUROS': 0
    };
    let totalProrratear = 0;
    const gastosExtraordinarios = [];

    gastosFinales.forEach(g => {
       const montoARS = g.moneda === 'USD' ? Number(g.monto) * (g.cotizacionHistorica || g.tipoCambioReferencia || 1200) : Number(g.monto);
       
       if (g.tipoGasto === 'extraordinario') {
          gastosExtraordinarios.push({ desc: `${g.rubro || g.categoriaEgreso} - ${g.concepto || ''}`.replace(/- $/,'').trim(), monto: montoARS });
       } else {
          const grupo = getGrupoExpensa(g.categoriaEgreso, g.rubro);
          if (grupo !== 'NO COMPUTA') {
             resumenGastos[grupo] += montoARS;
             totalProrratear += montoARS;
          }
       }
    });

    // 3. Generar Prorrateo por UF
    const prorrateo = Object.entries(COEFICIENTES_LUCIA).map(([uf, coef]) => {
       const prop = propiedades.find(p => p.codigo === uf || p.calle === uf);
       const contrato = contratos.find(c => c.propiedadId === prop?.id && new Date(c.fechaFin) >= new Date());
       const inquilino = contrato?.inquilinoNombre || 'Desocupado';
       const telefono = contrato?.inquilinoTelefono || '';
       const valorExpensa = totalProrratear * (coef / 100);

       return {
          uf,
          inquilino,
          telefono,
          coeficiente: coef,
          valorExpensa,
          saldoAnterior: 0, // Placeholder for future logic
          totalAPagar: valorExpensa
       };
    });

    return { prorrateo, resumenGastos, totalProrratear, gastosExtraordinarios };
  }, [movimientos, propiedades, contratos, mesLiquidacion]);

  if (!isOpen) return null;

  const handleGenerarPDF = () => {
     const monthName = new Date(mesLiquidacion + '-02').toLocaleString('es-AR', { month: 'long', year: 'numeric' });
     generarExpensasPDF(prorrateo, resumenGastos, totalProrratear, monthName.toUpperCase(), gastosExtraordinarios);
  };

  const handleWhatsApp = (fila) => {
     const monthName = new Date(mesLiquidacion + '-02').toLocaleString('es-AR', { month: 'long' });
     const text = `Hola ${fila.inquilino}, te enviamos el resumen de expensas de ${monthName} para la unidad ${fila.uf} (Edificio Lucía). %0A%0AEl total a abonar es de *$ ${Math.round(fila.totalAPagar).toLocaleString()}*. %0A%0APor favor, recordá enviar el comprobante una vez realizado el pago. ¡Gracias!`;
     window.open(`https://wa.me/${fila.telefono.replace(/\\D/g,'')}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 glass-panel/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Building className="text-indigo-500" />
              Liquidación de Expensas - Edificio Lucía
            </h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Vuelta de Obligado 2789 - Motor de Prorrateo Automático</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors shadow-sm border border-slate-200"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-slate-50/30 flex gap-6">
          
          <div className="w-80 flex flex-col gap-4">
             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Período de Liquidación</label>
                <input 
                   type="month" 
                   value={mesLiquidacion} 
                   onChange={e => setMesLiquidacion(e.target.value)} 
                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none" 
                />
             </div>

             <div className="bg-indigo-900 text-white p-5 rounded-2xl shadow-sm">
                 <div className="flex items-center gap-2 mb-4 text-indigo-200">
                    <Calculator size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Resumen de Egresos</span>
                 </div>
                 <div className="text-3xl font-black mb-4">$ {Math.round(totalProrratear).toLocaleString()}</div>
                 
                 <div className="space-y-2 mt-4 max-h-48 overflow-auto custom-scrollbar pr-2">
                    {Object.entries(resumenGastos).map(([cat, val]) => (
                       <div key={cat} className="flex justify-between items-center text-xs font-bold border-b border-indigo-800/50 pb-2">
                          <span className="text-indigo-200 truncate pr-2">{cat}</span>
                          <span>$ {Math.round(val).toLocaleString()}</span>
                       </div>
                    ))}
                    {Object.keys(resumenGastos).length === 0 && (
                       <div className="text-xs text-indigo-300 italic text-center py-4">No hay gastos en 'VO-Consorcio' para este mes.</div>
                    )}
                 </div>
             </div>

             <button onClick={handleGenerarPDF} disabled={totalProrratear === 0} className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-black uppercase text-xs tracking-widest py-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2">
                <FileText size={16} /> Generar PDF Consorcio
             </button>
          </div>

          <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                 <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Detalle de Prorrateo por Unidad Funcional</span>
                 <span className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">{prorrateo.length} UFs procesadas</span>
              </div>
              <div className="flex-1 overflow-auto">
                 <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-white sticky top-0 border-b border-slate-200 text-slate-400 uppercase font-black text-[10px] tracking-widest z-10">
                       <tr>
                          <th className="p-3 pl-4">U.F.</th>
                          <th className="p-3">Inquilino</th>
                          <th className="p-3 text-right">Coef. (%)</th>
                          <th className="p-3 text-right">Valor Expensa</th>
                          <th className="p-3 text-right">Saldo Ant.</th>
                          <th className="p-3 text-right bg-slate-50">Total a Pagar</th>
                          <th className="p-3 text-center">Notificar</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {prorrateo.map((f, i) => (
                          <tr key={f.uf} className="hover:bg-indigo-50/30 transition-colors group">
                             <td className="p-3 pl-4 font-black text-slate-800">{f.uf}</td>
                             <td className="p-3 font-bold text-slate-600 truncate max-w-[150px]">{f.inquilino}</td>
                             <td className="p-3 text-right font-bold text-slate-500">{f.coeficiente.toFixed(2)}%</td>
                             <td className="p-3 text-right font-bold text-slate-600">$ {Math.round(f.valorExpensa).toLocaleString()}</td>
                             <td className="p-3 text-right font-bold text-slate-400">$ 0</td>
                             <td className="p-3 text-right font-black text-indigo-600 bg-slate-50 group-hover:bg-indigo-50/50">$ {Math.round(f.totalAPagar).toLocaleString()}</td>
                             <td className="p-3 text-center">
                                <button 
                                  onClick={() => handleWhatsApp(f)} 
                                  disabled={!f.telefono || f.telefono.length < 8}
                                  className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-500 hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-emerald-100 disabled:hover:text-emerald-600" 
                                  title="Enviar por WhatsApp"
                                >
                                   <Send size={14} className="ml-0.5" />
                                </button>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
          </div>

        </div>
      </div>
    </div>
  );
}
