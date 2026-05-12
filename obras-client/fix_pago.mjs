import fs from 'fs';
const path = 'src/admin/tabs/certificaciones/PagoClienteModal.jsx';
let c = fs.readFileSync(path, 'utf8');

const old = 'onFile={(b64, name) => { setPdfB64(b64); setPdfName(name); }}';
const after = `onFile={(b64, name) => { setPdfB64(b64); setPdfName(name); }}
            onExtracted={(result) => {
              if (result.data?.fecha) set('pago_cliente_fecha', result.data.fecha);
              if (result.data?.numeroCompleto) set('factura_numero', result.data.numeroCompleto);
              if (result.data?.cuit) set('factura_cuit', result.data.cuit);
            }}`;

if (c.includes(old) && !c.includes('onExtracted')) {
  c = c.replace(old, after);
  fs.writeFileSync(path, c);
  console.log('OK: onExtracted added');
} else if (c.includes('onExtracted')) {
  console.log('Already has onExtracted');
} else {
  console.log('Pattern not found');
  // Debug
  const idx = c.indexOf('onFile');
  console.log('onFile at:', idx, c.substring(idx, idx+80));
}
