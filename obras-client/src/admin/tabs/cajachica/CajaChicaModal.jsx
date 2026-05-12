import React, { useState } from 'react';
import { Modal, CascadeSelect, SearchableSelect } from '@darq/ui';
import { Plus, Save, Trash2 } from 'lucide-react';
import { fmt, getWeekId } from '../../../lib/calculadora.jsx';
import { useTaxonomia } from '../../../lib/useTaxonomia.js';

// Categorías excluidas de caja chica (honorarios y gastos del cliente se cargan aparte)
const CATS_CAJA = ['materiales', 'servicios', 'mano_de_obra', 'impuestos'];

export default function CajaChicaModal({ config, tcSugerido, onSave, onClose }) {
  const feeMat = config?.fee_gestion_pct ?? 12;
  const markupSinComp = config?.caja_chica_sin_comprobante_pct ?? 30;
  const fondoRaw    = config?.caja_chica_fondo ?? config?.caja_chica_fondo_usd ?? 4000;
  const fondoMoneda = config?.caja_chica_moneda ?? 'USD';
  const { taxonomia } = useTaxonomia();

  const [form, setForm] = useState({
    semana: getWeekId(),
    fecha_rendicion: new Date().toISOString().slice(0, 10),
    estado: 'abierta',
    nota: '',
    tc_rendicion: tcSugerido || '',
    items: [],
  });
  const EMPTY_ITEM = { descripcion: '', tipo: 'con_factura', costo_real: '', taxonomia_categoria: '', taxonomia_rubro: '', taxonomia_concepto: '', taxonomia_categoria_nombre: '', taxonomia_rubro_nombre: '' };
  const [nuevoItem, setNuevoItem] = useState(EMPTY_ITEM);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setItem = (k, v) => setNuevoItem(i => ({ ...i, [k]: v }));

  const handleItemTaxonomia = ({ categoria, rubro, concepto }, taxArr) => {
    const cat = taxArr.find(c => c.id === categoria);
    const rubObj = cat?.rubros?.find(r => r.id === rubro);
    setNuevoItem(i => ({
      ...i,
      taxonomia_categoria: categoria,
      taxonomia_rubro: rubro,
      taxonomia_concepto: concepto,
      taxonomia_categoria_nombre: cat?.nombre || '',
      taxonomia_rubro_nombre: rubObj?.nombre || '',
    }));
  };

  const calcPrecioCliente = (costo, tipo) => {
    const c = parseFloat(costo) || 0;
    if (tipo === 'con_factura') return Math.round(c * (1 + feeMat / 100) * 100) / 100;
    return Math.round(c * (1 + markupSinComp / 100) * 100) / 100;
  };

  const agregarItem = () => {
    const costo = parseFloat(nuevoItem.costo_real) || 0;
    if (!nuevoItem.descripcion || !costo) return;
    const precio_cliente = calcPrecioCliente(costo, nuevoItem.tipo);
    setForm(f => ({ ...f, items: [...f.items, { ...nuevoItem, costo_real: costo, precio_cliente }] }));
    setNuevoItem(EMPTY_ITEM);
  };

  const quitarItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  const totalCosto = form.items.reduce((s, i) => s + (i.costo_real || 0), 0);
  const totalCliente = form.items.reduce((s, i) => s + (i.precio_cliente || 0), 0);
  const tc = parseFloat(form.tc_rendicion) || 0;
  // Si el fondo está en ARS no hay que multiplicar por TC
  const reposicion_ars = fondoMoneda === 'ARS'
    ? fondoRaw
    : tc > 0 ? fondoRaw * tc : 0;

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      ...form,
      tc_rendicion: tc,
      total_costo_real: totalCosto,
      total_precio_cliente: totalCliente,
      reposicion_ars,
    });
    setSaving(false);
  };

  return (
    <Modal
      title="Nueva Rendición de Caja Chica"
      onClose={onClose}
      maxWidth={620}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={13} /> {saving ? 'Guardando...' : 'Guardar rendición'}
        </button>
      </>}
    >
      <div className="grid-2" style={{ gap: 14, marginBottom: 20 }}>
        <div>
          <label className="label">Semana</label>
          <input className="input" value={form.semana} onChange={e => set('semana', e.target.value)} placeholder="2026-W15" />
        </div>
        <div>
          <label className="label">Fecha de rendición</label>
          <input className="input" type="date" value={form.fecha_rendicion} onChange={e => set('fecha_rendicion', e.target.value)} />
        </div>
        <div>
          <label className="label">TC efectivo (Blue × 0.95)</label>
          <p style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>
            {tcSugerido ? `Sugerido: $ ${tcSugerido.toLocaleString('es-AR')}` : 'Ingresá manualmente'}
          </p>
          <input className="input" type="number" value={form.tc_rendicion} onChange={e => set('tc_rendicion', e.target.value)} placeholder="1254" style={{ textAlign: 'right' }} />
        </div>
        <div>
          <label className="label">Reposición ARS</label>
          <p style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>
            {fondoMoneda === 'ARS'
              ? `$ ${fondoRaw.toLocaleString('es-AR')} (fondo en ARS)`
              : `u$d ${fondoRaw.toLocaleString('es-AR')} × TC`}
          </p>
          <div style={{ padding: '10px 14px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 10, fontFamily: 'monospace', fontWeight: 900, fontSize: 16, color: '#34d399' }}>
            {fondoMoneda === 'ARS' ? fmt(reposicion_ars) : tc > 0 ? fmt(reposicion_ars) : '—'}
          </div>
        </div>
      </div>

      {/* Agregar ítems */}
      <div style={{ marginBottom: 16, padding: '16px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Agregar ítem</div>
        <div className="grid-2" style={{ gap: 10, marginBottom: 10 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <input className="input" placeholder="Descripción del gasto" value={nuevoItem.descripcion} onChange={e => setItem('descripcion', e.target.value)} />
          </div>
          <div>
            <SearchableSelect className="input" value={nuevoItem.tipo} onChange={e => setItem('tipo', e.target.value)}>
              <option value="con_factura">🧾 Con factura ({feeMat}% fee)</option>
              <option value="sin_comprobante">📋 Sin comprobante ({markupSinComp}% markup)</option>
            </SearchableSelect>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" type="number" placeholder="Costo real $" value={nuevoItem.costo_real} onChange={e => setItem('costo_real', e.target.value)} style={{ textAlign: 'right' }} />
            <button className="btn btn-primary btn-sm" onClick={agregarItem} disabled={!nuevoItem.descripcion || !nuevoItem.costo_real}>
              <Plus size={13} />
            </button>
          </div>
          <div style={{ gridColumn: '1 / -1', padding: '12px 14px', background: 'rgba(129,140,248,0.05)', border: '1px solid rgba(129,140,248,0.12)', borderRadius: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Clasificación del gasto</div>
            <CascadeSelect
              taxonomia={taxonomia}
              filtrarCats={CATS_CAJA}
              value={{ categoria: nuevoItem.taxonomia_categoria, rubro: nuevoItem.taxonomia_rubro, concepto: nuevoItem.taxonomia_concepto }}
              onChange={(v) => handleItemTaxonomia(v, taxonomia)}
            />
          </div>
        </div>
        {nuevoItem.costo_real > 0 && (
          <div style={{ fontSize: 11, color: '#818cf8' }}>
            → Precio cliente: {fmt(calcPrecioCliente(nuevoItem.costo_real, nuevoItem.tipo))}
          </div>
        )}
      </div>

      {/* Lista de ítems */}
      {form.items.length > 0 && (
        <div className="glass" style={{ overflow: 'hidden', marginBottom: 16 }}>
          <table className="table" style={{ margin: 0 }}>
            <thead><tr>
              <th>Descripción</th><th>Tipo</th>
              <th style={{ textAlign: 'right' }}>Costo ★</th>
              <th style={{ textAlign: 'right', color: '#34d399' }}>Precio cliente</th>
              <th></th>
            </tr></thead>
            <tbody>
              {form.items.map((item, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, fontSize: 12 }}>{item.descripcion}</td>
                  <td><span className={`badge ${item.tipo === 'con_factura' ? 'badge-blue' : 'badge-amber'}`} style={{ fontSize: 9 }}>{item.tipo === 'con_factura' ? 'Factura' : 'Sin comp.'}</span></td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: '#f87171' }}>{fmt(item.costo_real)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#34d399' }}>{fmt(item.precio_cliente)}</td>
                  <td><button onClick={() => quitarItem(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}><Trash2 size={12} /></button></td>
                </tr>
              ))}
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                <td colSpan={2} style={{ fontWeight: 800, fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>Total</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#f87171' }}>{fmt(totalCosto)}</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: '#34d399', fontSize: 15 }}>{fmt(totalCliente)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <div>
        <label className="label">Nota</label>
        <input className="input" placeholder="Observaciones..." value={form.nota} onChange={e => set('nota', e.target.value)} />
      </div>
    </Modal>
  );
}
