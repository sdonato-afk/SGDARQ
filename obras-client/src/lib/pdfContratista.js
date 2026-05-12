/**
 * Generador de PDF "Estado de Cuenta Contratista"
 * Usa window.print() con un iframe invisible — no necesita jsPDF ni dependencias externas.
 */

const fmt = (n, moneda = 'ARS') => {
  if (n == null || isNaN(n)) return '—';
  const prefix = moneda === 'USD' ? 'u$d ' : '$ ';
  return prefix + Math.round(n).toLocaleString('es-AR');
};

const fmtFecha = (f) => {
  if (!f) return '—';
  try { return new Date(f + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
  catch { return f; }
};

/**
 * @param {Object} contratista - datos del contratista
 * @param {Array}  certificaciones - certificaciones filtradas de este contratista
 * @param {Array}  pagos - movimientos de pago a este contratista
 * @param {Object} opts - { obraNombre, tc }
 */
export function generarEstadoCuentaContratista(contratista, certificaciones, pagos, opts = {}) {
  const { obraNombre = 'Obra', tc = 1 } = opts;

  const totalCertificado = certificaciones.reduce((s, c) => s + (parseFloat(c.monto_bruto) || 0), 0);
  const totalRetencion = certificaciones.reduce((s, c) => s + (parseFloat(c.retencion_reparo) || 0), 0);
  // CAC total acumulado en todas las certificaciones
  const totalCac = certificaciones.reduce((s, c) => s + (parseFloat(c.monto_cac) || 0), 0);
  const moneda = contratista.moneda || 'ARS';

  // Normalizar pagos a la moneda del contratista (misma lógica que sumarEquiv en TabContratistas)
  let totalPagadoNorm = 0;
  if (pagos.length > 0) {
    // Hay pagos reales registrados en caja central → usarlos
    for (const p of pagos) {
      const monto = Math.abs(parseFloat(p.monto) || 0);
      const pMoneda = p.moneda || 'ARS';
      if (pMoneda === moneda) {
        totalPagadoNorm += monto;
      } else if (moneda === 'USD') {
        totalPagadoNorm += monto / tc;
      } else {
        totalPagadoNorm += monto * tc;
      }
    }
  } else {
    // Fallback: sumar SOLO monto_neto de certs marcadas como pagadas
    // El CAC es independiente del contrato y no resta del saldo presupuestario
    for (const c of certificaciones) {
      if (c.pago_cliente_estado === 'pagado') {
        totalPagadoNorm += (parseFloat(c.monto_neto) || 0);
      }
    }
  }

  const costoReal = parseFloat(contratista.costo_real) || 0;
  const saldo = costoReal - totalPagadoNorm;
  const avancePct = costoReal > 0 ? Math.min(100, Math.round((totalCertificado / costoReal) * 100)) : 0;

  const hoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });

  const certRows = certificaciones.map(c => {
    const cacMonto = parseFloat(c.monto_cac) || 0;
    const pagadoTag = c.pago_cliente_estado === 'pagado'
      ? `<span style="font-size:8px;font-weight:900;color:#059669;background:#d1fae5;padding:1px 5px;border-radius:3px;margin-left:4px;">✓ PAG</span>`
      : `<span style="font-size:8px;font-weight:900;color:#92400e;background:#fef3c7;padding:1px 5px;border-radius:3px;margin-left:4px;">PEND</span>`;
    return `
    <tr>
      <td>${fmtFecha(c.fecha)}</td>
      <td style="text-align:center">${c.numero_cert ? '#' + c.numero_cert : '—'}</td>
      <td>${c.descripcion || '—'}</td>
      <td style="text-align:right;font-weight:700">${fmt(c.monto_bruto, moneda)}</td>
      <td style="text-align:right;color:#c00">${c.retencion_reparo > 0 ? '- ' + fmt(c.retencion_reparo, moneda) : '—'}</td>
      <td style="text-align:right;color:#f59e0b;font-weight:700">${cacMonto > 0 ? fmt(cacMonto, moneda) : '—'}</td>
      <td style="text-align:right;font-weight:700">${fmt((parseFloat(c.monto_neto) || 0) + cacMonto, moneda)}</td>
      <td style="text-align:center">${pagadoTag}</td>
    </tr>`;
  }).join('');

  const pagoRows = pagos.map(p => `
    <tr>
      <td>${fmtFecha(p.fecha)}</td>
      <td>${p.concepto || p.rubro || p.descripcion || '—'}</td>
      <td>${p.cajaOrigen || p.caja || '—'}</td>
      <td style="text-align:right;font-weight:700">${fmt(Math.abs(parseFloat(p.monto) || 0), p.moneda || moneda)}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Estado de Cuenta - ${contratista.contratista}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 40px; font-size: 11px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 3px solid #1a1a1a; padding-bottom: 16px; }
    .logo { font-size: 28px; font-weight: 900; letter-spacing: -0.02em; }
    .logo span { color: #f59e0b; }
    .doc-title { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #555; margin-top: 4px; }
    .meta { text-align: right; font-size: 10px; color: #666; }
    .meta strong { color: #1a1a1a; font-size: 11px; }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .info-box { border: 1px solid #ddd; border-radius: 6px; padding: 14px; }
    .info-box h3 { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 8px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .info-row .label { color: #666; }
    .info-row .value { font-weight: 700; }

    .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .kpi { border: 1px solid #ddd; border-radius: 6px; padding: 12px; text-align: center; }
    .kpi .kpi-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 6px; }
    .kpi .kpi-value { font-size: 16px; font-weight: 900; }
    .kpi .kpi-sub { font-size: 9px; color: #888; margin-top: 2px; }

    .progress-bar { height: 8px; background: #eee; border-radius: 99px; overflow: hidden; margin-top: 6px; }
    .progress-fill { height: 100%; border-radius: 99px; }

    h2 { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; margin: 20px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #ddd; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; border-bottom: 2px solid #ddd; padding: 6px 8px; text-align: left; }
    td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 10px; }

    .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 12px; font-size: 9px; color: #999; text-align: center; }
    .saldo-positivo { color: #c00; }
    .saldo-cero { color: #059669; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">D<span>+</span>ARQ</div>
      <div class="doc-title">Estado de Cuenta Contratista</div>
    </div>
    <div class="meta">
      <strong>${obraNombre}</strong><br>
      Emitido: ${hoy}<br>
      Moneda: ${moneda}
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h3>Contratista</h3>
      <div class="info-row"><span class="label">Nombre</span><span class="value">${contratista.contratista}</span></div>
      <div class="info-row"><span class="label">Rubro</span><span class="value">${contratista.rubro || '—'}</span></div>
      <div class="info-row"><span class="label">Estado</span><span class="value">${(contratista.estado || '').replace('_', ' ')}</span></div>
    </div>
    <div class="info-box">
      <h3>Contrato</h3>
      <div class="info-row"><span class="label">Monto Contratado</span><span class="value">${fmt(costoReal, moneda)}</span></div>
      <div class="info-row"><span class="label">Inicio</span><span class="value">${fmtFecha(contratista.fecha_inicio)}</span></div>
      <div class="info-row"><span class="label">Fin</span><span class="value">${fmtFecha(contratista.fecha_fin)}</span></div>
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi">
      <div class="kpi-label">Certificado (contrato)</div>
      <div class="kpi-value">${fmt(totalCertificado, moneda)}</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${avancePct}%;background:${avancePct === 100 ? '#059669' : '#f59e0b'}"></div></div>
      <div class="kpi-sub">${avancePct}% del contrato</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Pagado s/Contrato</div>
      <div class="kpi-value">${fmt(totalPagadoNorm, moneda)}</div>
      <div class="kpi-sub">${certificaciones.filter(c => c.pago_cliente_estado === 'pagado').length} cert. pagadas / ${certificaciones.length} emitidas</div>
    </div>
    <div class="kpi">
      <div class="kpi-label" style="color:#f59e0b">CAC Pagado</div>
      <div class="kpi-value" style="color:#f59e0b">${totalCac > 0 ? fmt(totalCac, moneda) : '&mdash;'}</div>
      <div class="kpi-sub">Ajuste de costos independiente</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Total Cobrado</div>
      <div class="kpi-value" style="color:#34d399">${fmt(totalPagadoNorm + totalCac, moneda)}</div>
      <div class="kpi-sub">Contrato + CAC</div>
    </div>
  </div>
  <div class="kpi-row" style="grid-template-columns:repeat(2,1fr);margin-top:-8px">
    <div class="kpi">
      <div class="kpi-label">Retención Acum.</div>
      <div class="kpi-value" style="color:#c00">${fmt(totalRetencion, moneda)}</div>
      <div class="kpi-sub">Fondo de reparo</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Saldo Pendiente (contrato)</div>
      <div class="kpi-value ${saldo > 0.01 ? 'saldo-positivo' : 'saldo-cero'}">${fmt(saldo, moneda)}</div>
      <div class="kpi-sub">${saldo <= 0 ? 'Sin deuda' : 'Deuda vigente'}</div>
    </div>
  </div>

  ${certificaciones.length > 0 ? `
  <h2>Certificaciones</h2>
  <table>
    <thead><tr><th>Fecha</th><th style="text-align:center">N°</th><th>Descripción</th><th style="text-align:right">Bruto</th><th style="text-align:right">Retención</th><th style="text-align:right;color:#f59e0b">CAC</th><th style="text-align:right">Total Contratista</th><th style="text-align:center">Estado</th></tr></thead>
    <tbody>${certRows}</tbody>
  </table>
  ` : ''}

  ${pagos.length > 0 ? `
  <h2>Pagos Realizados</h2>
  <table>
    <thead><tr><th>Fecha</th><th>Concepto</th><th>Caja</th><th style="text-align:right">Monto</th></tr></thead>
    <tbody>${pagoRows}</tbody>
  </table>
  ` : '<h2>Pagos Realizados</h2><p style="color:#888;font-size:10px;">Sin pagos registrados en el sistema central.</p>'}

  <div class="footer">
    D+ARQ · Sistema de Gestión · Documento generado automáticamente · ${hoy}
  </div>
</body>
</html>`;

  // Abrir en nueva ventana para imprimir/guardar como PDF
  const win = window.open('', '_blank', 'width=800,height=1100');
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.print(); };
}
