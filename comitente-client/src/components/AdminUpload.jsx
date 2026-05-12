import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { UploadCloud, FileSpreadsheet } from 'lucide-react';
import './AdminUpload.css';

export default function AdminUpload({ onDataParsed }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        const parsedData = parseDarqSpreadsheet(rawData, file.name);
        onDataParsed(parsedData);
      } catch (err) {
        console.error(err);
        setError('Error al leer el Excel. Asegurate de que tenga el formato de D+ARQ.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const parseDarqSpreadsheet = (rows, fileName) => {
    let headerRowIndex = -1;
    for (let i = 0; i < 15; i++) {
        if (rows[i] && rows[i].includes("RUBROS E ÍTEMS")) {
            headerRowIndex = i;
            break;
        }
    }
    
    if (headerRowIndex === -1) {
        throw new Error("No se encontró la columna RUBROS E ÍTEMS. El archivo debe mantener la estructura del presupuesto original.");
    }
    
    const headers = rows[headerRowIndex];
    
    // Find certificates columns
    const certificates = [];
    for (let c = 0; c < headers.length; c++) {
        if (typeof headers[c] === 'string' && headers[c].toUpperCase().includes("CERTIFICADO")) {
            const certName = headers[c];
            let certDate = headers[c-1] || "";
            // Excel dates might be numbers, let's keep it simple
            if (typeof certDate === 'number') {
                certDate = new Date(Math.round((certDate - 25569)*86400*1000)).toLocaleDateString('es-AR');
            }
            
            certificates.push({
                colIndex: c,
                nombre: certName,
                fecha: certDate,
                mes: certDate || certName,
                id: certificates.length + 1,
                estado: "pagado", 
                montoBase: 0,
                cac: 0,
                total: 0,
                rubros: []
            });
        }
    }
    
    if (certificates.length > 0) {
        certificates[certificates.length - 1].estado = "pendiente"; 
    }

    let presupuestoBase = 0;
    
    // Parse data rows
    for (let r = headerRowIndex + 2; r < rows.length; r++) {
        const row = rows[r];
        if (!row || !row[1]) continue; 
        
        const rubroName = row[1];
        if (typeof rubroName === 'string' && rubroName.toUpperCase().includes("TOTAL")) break;
        
        const precio = parseFloat(row[2]) || 0;
        presupuestoBase += precio;
        
        certificates.forEach(cert => {
            const avanceCol = cert.colIndex;
            const cacCol = cert.colIndex + 1;
            
            let avanceVal = row[avanceCol];
            let avancePct = 0;
            if (typeof avanceVal === 'number') {
                if (avanceVal <= 1 && avanceVal > 0) avancePct = Math.round(avanceVal * 100);
                else avancePct = Math.round(avanceVal);
            } else if (typeof avanceVal === 'string') {
                avancePct = parseFloat(avanceVal.replace('%','').replace(',','.')) || 0;
            }
            
            if (avancePct > 0) {
               cert.rubros.push({
                   nombre: rubroName,
                   avance: avancePct
               });
            }
            
            // Estimamos el monto base segun % si la columna de importe no es clara
            let montoRubroBase = (precio * (avancePct/100));
            cert.montoBase += montoRubroBase;
            
            let cacVal = parseFloat(row[cacCol]);
            if (isNaN(cacVal)) cacVal = 0;
            cert.cac += cacVal;
        });
    }

    certificates.forEach(cert => {
        cert.total = cert.montoBase + cert.cac;
    });

    const obraName = fileName.replace('.xlsx', '').replace('.xls', '');

    return {
        comitente: "Comitente a asignar",
        obra: obraName.toUpperCase(),
        avanceTotal: Math.round((certificates.reduce((acc, c) => acc + c.montoBase, 0) / presupuestoBase) * 100) || 0,
        certificaciones: certificates.filter(c => c.total > 0 || c.rubros.length > 0)
    };
  };

  return (
    <div className="upload-container fade-in">
      <div className="upload-card">
        <div className="upload-icon">
          <FileSpreadsheet size={56} color="#3b82f6" strokeWidth={1.5} />
        </div>
        <h2 className="upload-title">Lector de Presupuestos</h2>
        <p className="upload-desc">Seleccioná o arrastrá tu archivo Excel (<b>.xlsx</b>) con las certificaciones de la obra para generar el dashboard del cliente.</p>
        
        <div className="upload-dropzone">
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleFileUpload} 
            className="file-input"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="file-label">
            <UploadCloud size={24} />
            <span>{loading ? 'Analizando Excel...' : 'Subir archivo Excel'}</span>
          </label>
        </div>
        
        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
}
