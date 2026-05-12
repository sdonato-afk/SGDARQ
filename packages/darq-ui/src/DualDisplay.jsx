import React from 'react';
import { fmt } from './formatters.js';

export function DualAmt({ monto, monedaOrig, tc, bold = false }) {
  const val = parseFloat(monto) || 0;
  const tcVal = parseFloat(tc) || 1000;
  const isUSD = (monedaOrig || 'ARS') === 'USD';
  const usd = isUSD ? val : val / tcVal;
  const ars = isUSD ? val * tcVal : val;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1.3' }}>
      <span style={{ fontSize: '1em', color: bold ? '#818cf8' : 'inherit', fontWeight: bold ? 900 : 700, fontFamily: 'monospace' }}>
        {fmt(ars, 'ARS')}
      </span>
      <span style={{ fontSize: '0.75em', color: 'inherit', opacity: 0.45, fontWeight: 600, fontFamily: 'monospace' }}>
        {fmt(usd, 'USD')}
      </span>
    </div>
  );
}

export function DualResult({ result, bold = false }) {
  if (!result) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1.3' }}>
      <span style={{ fontSize: '1em', color: bold ? '#818cf8' : 'inherit', fontWeight: 900, fontFamily: 'monospace' }}>
        {fmt(result.ars, 'ARS')}
      </span>
      <span style={{ fontSize: '0.75em', color: 'inherit', opacity: 0.45, fontWeight: 600, fontFamily: 'monospace' }}>
        {fmt(result.usd, 'USD')}
      </span>
    </div>
  );
}
