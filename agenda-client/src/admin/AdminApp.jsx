/**
 * AdminApp.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Esqueleto de layout de la Agenda D+ARQ.
 * Responsabilidades: autenticación de sesión, sidebar, routing de pestañas.
 * Toda la lógica de cada pestaña vive en src/admin/tabs/.
 */
import React, { useState } from 'react';
import { Activity, RefreshCw, Calendar, CalendarClock, Users, HardHat } from 'lucide-react';
import { DarqSidebar } from '@darq/ui';

// Pestañas separadas (Fase 2 de la refactorización)
import TabVisionGeneral from './TabVisionGeneral';
import TabAgenda        from './tabs/TabAgenda';
import TabVencimientos  from './tabs/TabVencimientos';
import TabCalendario    from './tabs/TabCalendario';
import TabEquipo        from './tabs/TabEquipo';

// ── Mini-calendario decorativo del sidebar ──────────────────────────────
function MiniCalendar() {
  const days  = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
  const dates = Array.from({ length: 35 }, (_, i) => i - 2);
  const hoy   = new Date().getDate();
  return (
    <div className="mt-8 px-6">
      <h3 className="darq-label text-white/30 mb-3">Mes actual</h3>
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map(d => <div key={d} className="text-[10px] text-white/20 font-black mb-1">{d}</div>)}
        {dates.map((d, i) => {
          const isHoy     = d === hoy;
          const hasEvent  = d === hoy + 2 || d === hoy + 5;
          const hasUrgent = d === hoy + 1;
          return (
            <div key={i} className={`text-[10px] aspect-square flex items-center justify-center rounded-lg font-bold ${
              d < 1 || d > 31 ? 'text-transparent' :
              isHoy ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' :
              'text-white/40 hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/10'
            } relative transition-all`}>
              {d > 0 && d <= 31 ? d : ''}
              {hasEvent  && d > 0 && !isHoy && <div className="absolute bottom-0.5 w-1 h-1 bg-amber-400 rounded-full" />}
              {hasUrgent && d > 0 && !isHoy && <div className="absolute bottom-0.5 w-1 h-1 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.8)]" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Shell principal ──────────────────────────────────────────────────────
const TABS_MENU = [
  { id: 'vision',       label: 'Visión General',    icon: Activity },
  { id: 'agenda',       label: 'Agenda de Gestión', icon: RefreshCw },
  { id: 'vencimientos', label: 'Vencimientos',      icon: Calendar },
  { id: 'calendario',   label: 'Calendario',        icon: CalendarClock },
  { id: 'equipo',       label: 'Equipo',            icon: Users },
];

export default function AdminApp({ user, onSignOut }) {
  const [tab, setTab] = useState('vision');

  return (
    <div className="min-h-screen bg-[#060811] font-['Inter',sans-serif] text-white flex">

      <DarqSidebar
        appName="Agenda"
        appAccent="violet"
        menuGroups={[{ title: 'MÓDULOS', items: TABS_MENU }]}
        activeTab={tab}
        onTabSelect={setTab}
        user={user}
        onLogout={onSignOut}
        extraContent={<MiniCalendar />}
        externalLinks={[
          { label: 'Sistema de Gestión', url: import.meta.env.DEV ? 'http://localhost:5173' : 'https://sg-darq.web.app/',       icon: Activity },
          { label: 'Obras Client',       url: import.meta.env.DEV ? 'http://localhost:5174' : 'https://sg-darq.web.app/obras/', icon: HardHat },
        ]}
      />

      <main className="flex-1 h-screen overflow-y-auto flex flex-col relative z-10" style={{ padding: '48px 40px' }}>
        <div className="max-w-[1400px] w-full mx-auto flex-1 flex flex-col">
          {tab === 'vision'       && <TabVisionGeneral />}
          {tab === 'agenda'       && <TabAgenda />}
          {tab === 'vencimientos' && <TabVencimientos />}
          {tab === 'calendario'   && <TabCalendario />}
          {tab === 'equipo'       && <TabEquipo />}
        </div>
      </main>

    </div>
  );
}
