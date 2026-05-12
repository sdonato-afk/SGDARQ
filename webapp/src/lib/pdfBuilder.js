import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const generarExpensasPDF = (prorrateo, resumenGastos, totalProrratear, mesNombre, gastosExtraordinarios = []) => {
   const doc = new jsPDF('p', 'pt', 'a4');
   
   // --- HIGH CONTRAST WHITE AESTHETIC ---
   const BLACK = [0, 0, 0];
   const WHITE = [255, 255, 255];

   // --- HEADER ---
   doc.setFontSize(22);
   doc.setFont("helvetica", "bolditalic");
   doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
   doc.text("EDIFICIO LUCÍA", 40, 60);

   doc.setFontSize(10);
   doc.setFont("helvetica", "italic");
   doc.text("Vuelta de Obligado 2789, CABA", 40, 75);
   
   // Right aligned Box for Period
   doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
   doc.setLineWidth(1);
   doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
   doc.rect(380, 45, 175, 40, 'FD'); // Fills white, draws black border

   doc.setFontSize(9);
   doc.setFont("helvetica", "bolditalic");
   doc.text("LIQUIDACIÓN DE EXPENSAS", 395, 60);
   doc.setFont("helvetica", "italic");
   doc.text(`Período: ${mesNombre}`, 395, 75);

   doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
   doc.setLineWidth(1.5);
   doc.line(40, 95, 555, 95);

   // --- RESUMEN DE GASTOS DEL CONSORCIO ---
   doc.setFontSize(12);
   doc.setFont("helvetica", "bolditalic");
   doc.text("Resumen de Gastos del Período", 40, 120);

   let yPos = 135;
   doc.setFontSize(9);
   doc.setFont("helvetica", "italic");
   
   Object.entries(resumenGastos).forEach(([cat, val]) => {
      doc.text(cat, 40, yPos);
      doc.text(`$ ${Math.round(val).toLocaleString('es-AR')}`, 250, yPos, { align: 'right' });
      yPos += 15;
   });

   doc.setFont("helvetica", "bolditalic");
   doc.text("TOTAL DEL MES (a prorratear):", 40, yPos + 5);
   doc.text(`$ ${Math.round(totalProrratear).toLocaleString('es-AR')}`, 250, yPos + 5, { align: 'right' });

   // --- TABLA DE PRORRATEO (U.F.) ---
   const tableData = prorrateo.map(f => [
      f.uf,
      f.inquilino,
      `${f.coeficiente.toFixed(2)}%`,
      `$ ${Math.round(f.valorExpensa).toLocaleString('es-AR')}`,
      `$ 0`, // Saldo Anterior
      `$ ${Math.round(f.totalAPagar).toLocaleString('es-AR')}`
   ]);

   doc.autoTable({
      startY: yPos + 30,
      head: [['U.F.', 'Inquilino / Responsable', 'Coef.', 'Valor Expensa', 'Saldo Ant.', 'Total a Pagar']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: WHITE, textColor: BLACK, fontStyle: 'bolditalic', fontSize: 8, halign: 'center', lineWidth: 1, lineColor: BLACK },
      bodyStyles: { fontSize: 8, textColor: BLACK, fontStyle: 'italic', fillColor: WHITE, lineWidth: 1, lineColor: BLACK },
      columnStyles: {
         0: { fontStyle: 'bolditalic', halign: 'center' },
         2: { halign: 'right' },
         3: { halign: 'right' },
         4: { halign: 'right' },
         5: { fontStyle: 'bolditalic', halign: 'right' }
      },
      alternateRowStyles: { fillColor: WHITE },
      margin: { left: 40, right: 40 },
      tableLineColor: BLACK,
      tableLineWidth: 1
   });

   let finalY = doc.lastAutoTable.finalY + 20;

   if (gastosExtraordinarios && gastosExtraordinarios.length > 0) {
       doc.setFontSize(10);
       doc.setFont("helvetica", "bolditalic");
       doc.text("Gastos Extraordinarios (A Cargo del Propietario)", 40, finalY);
       
       let extY = finalY + 15;
       doc.setFontSize(8);
       doc.setFont("helvetica", "italic");
       
       let totalExt = 0;
       gastosExtraordinarios.forEach(g => {
          doc.text(g.desc, 40, extY);
          doc.text(`$ ${Math.round(g.monto).toLocaleString('es-AR')}`, 250, extY, { align: 'right' });
          totalExt += g.monto;
          extY += 12;
       });
       
       doc.setFontSize(8);
       doc.setFont("helvetica", "bolditalic");
       doc.text(`TOTAL EXTRAORDINARIOS: $ ${Math.round(totalExt).toLocaleString('es-AR')}`, 40, extY + 5);
       
       finalY = extY + 30;
   } else {
       finalY += 10;
   }
   
   doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
   doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2]);
   doc.setLineWidth(1);
   doc.rect(40, finalY, 515, 60, 'FD');
   
   doc.setFontSize(10);
   doc.setFont("helvetica", "bolditalic");
   doc.text("DATOS PARA EL PAGO", 55, finalY + 20);
   
   doc.setFontSize(9);
   doc.setFont("helvetica", "italic");
   doc.text("Titular: AMECON SA", 55, finalY + 35);
   doc.text("Banco: Supervielle", 185, finalY + 35);
   doc.text("CBU: 0270045810035388030018", 320, finalY + 35);
   doc.text("Alias: SOL.DUENDE.RETO", 55, finalY + 50);

   // Save the PDF
   doc.save(`Liquidacion_Expensas_${mesNombre.replace(' ', '_')}.pdf`);
};
