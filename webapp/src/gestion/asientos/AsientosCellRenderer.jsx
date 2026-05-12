import React from 'react';
import { directores, cajas } from '../../helpers/financieros';

/**
 * AsientosCellRenderer — versión solo lectura.
 *
 * La edición se hace abriendo ModalMovimiento desde Asientos.jsx.
 * Este archivo solo se encarga de formatear y mostrar valores en celda.
 *
 * @param {object} ctx
 * @param {object} ctx.m        - movimiento (fila actual)
 * @param {object} ctx.col      - { key, label, w }
 * @param {object} ctx.lookups  - { obraNameFn, propNameFn, clienteNameFn, provNameFn, usdEquivFn }
 */
export function renderAsientoCell({ m, col, lookups }) {
  const { obraNameFn, propNameFn, clienteNameFn, provNameFn, usdEquivFn } = lookups;

  const val = (() => {
    switch (col.key) {
      case 'fecha':           return m.fecha || '-';
      case 'area':            return m.area || '-';
      case 'tipo':            return m.tipo || '-';
      case 'moneda':          return m.moneda || '-';
      case 'monto':
        return m.monto
          ? Number(m.monto).toLocaleString('es-AR', { maximumFractionDigits: 2 })
          : '-';
      case 'caja':            return m.caja || '-';
      case 'categoriaEgreso': {
        const cat = m.categoriaEgreso
          || (m.area === 'Obras' && m.tipo === 'Ingreso' ? m.tipoObraIngreso : '')
          || '-';
        return cat;
      }
      case 'rubro':           return m.rubro || '-';
      case 'concepto':        return m.concepto || '-';
      case 'obraId':          return obraNameFn(m.obraId) || '-';
      case 'tipoObraIngreso': return m.tipoObraIngreso || '-';
      case 'propiedadId':     return propNameFn(m.propiedadId) || '-';
      case 'clienteId':       return clienteNameFn(m.clienteId) || '-';
      case 'directorId':      return m.directorId || '-';
      case 'proveedorId':     return provNameFn(m.proveedorId) || '-';
      case 'tc':              return m.tipoCambioReferencia || '-';
      case 'usdEq':
        return usdEquivFn(m).toLocaleString('es-AR', { maximumFractionDigits: 2 });
      default:                return '-';
    }
  })();

  const colorCls =
    col.key === 'tipo'        ? (m.tipo === 'Ingreso' ? 'text-emerald-700' : 'text-rose-700') :
    col.key === 'monto'       ? (m.tipo === 'Ingreso' ? 'text-emerald-600' : 'text-rose-600') :
    col.key === 'usdEq'       ? (m.tipo === 'Ingreso' ? 'text-emerald-500' : 'text-rose-500') :
    col.key === 'obraId'      ? 'text-blue-600' :
    col.key === 'propiedadId' ? 'text-violet-600' :
    col.key === 'clienteId'   ? 'text-cyan-600' :
    col.key === 'proveedorId' ? 'text-indigo-600' : '';

  const boldCls = ['tipo', 'monto', 'usdEq'].includes(col.key) ? 'font-black' : '';

  return (
    <span className={`text-[10px] ${colorCls} ${boldCls} truncate block px-1 py-1`}>
      {val}
    </span>
  );
}
