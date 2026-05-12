import React, { useState } from 'react';
import { Activity, Building2, HardHat, Landmark, Briefcase, TrendingUp } from 'lucide-react';
import ObrasBI from './bi/ObrasBI';
import AlquileresBI from './bi/AlquileresBI';
import OficinaBI from './bi/OficinaBI';
import DirectorioBI from './bi/DirectorioBI';
import CashFlowBI from './bi/CashFlowBI';

export default function AnalyticsDashboard({ 
  movimientos, 
  obras, 
  propiedades, 
  contratos, 
  proveedores, 
  presupuestos, 
  clientes,
  cotizacionBlue,
  directores
}) {
  const [activeTab, setActiveTab] = useState('CashFlow');

  const tabs = [
    { id: 'CashFlow', label: 'Cash Flow Predictivo', icon: TrendingUp },
    { id: 'Obras', label: 'Obras & Proyectos', icon: HardHat },
    { id: 'Alquileres', label: 'Renta & Vacancia', icon: Building2 },
    { id: 'Oficina', label: 'Control OpEx', icon: Briefcase },
    { id: 'Directorio', label: 'Socios & Dividendos', icon: Landmark }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden animate-in fade-in duration-500">
      
      {/* Header Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div>
           <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
             <Activity className="text-emerald-500" />
             BI & Control Financiero Central
           </h1>
           <p className="darq-value text-slate-500 uppercase tracking-widest mt-1">Panel de control gerencial multipropósito</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
          {tabs.map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button 
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl darq-label transition-all ${isActive ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
              >
                <Icon size={14} className={isActive ? 'text-emerald-500' : 'text-slate-400'} />
                <span className="hidden lg:inline">{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6 bg-slate-50/50 relative">
        <div className="max-w-[1600px] mx-auto w-full h-full">
           {activeTab === 'CashFlow' && <CashFlowBI movimientos={movimientos} presupuestos={presupuestos} cotizacionBlue={cotizacionBlue} obras={obras} contratos={contratos} propiedades={propiedades} />}
           {activeTab === 'Obras' && <ObrasBI movimientos={movimientos} obras={obras} presupuestos={presupuestos} proveedores={proveedores} cotizacionBlue={cotizacionBlue} />}
           {activeTab === 'Alquileres' && <AlquileresBI movimientos={movimientos} propiedades={propiedades} contratos={contratos} clientes={clientes} cotizacionBlue={cotizacionBlue} />}
           {activeTab === 'Oficina' && <OficinaBI movimientos={movimientos} cotizacionBlue={cotizacionBlue} />}
           {activeTab === 'Directorio' && <DirectorioBI movimientos={movimientos} directores={directores} cotizacionBlue={cotizacionBlue} />}
        </div>
      </div>

    </div>
  );
}
