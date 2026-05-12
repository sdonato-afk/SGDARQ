import React, { useState } from 'react';
import { CheckCircle2, CircleDashed, ChevronDown, ChevronUp, DollarSign, Activity, Calendar, Download } from 'lucide-react';
import './Dashboard.css';

const mockData = {
  comitente: "Familia García",
  obra: "Residencia La Cornisa",
  avanceTotal: 42,
  certificaciones: [
    {
      id: 1,
      mes: "Octubre 2024",
      nombre: "Certificado 1",
      estado: "pagado",
      montoBase: 5248435,
      cac: 10097864,
      total: 15346299,
      fecha: "01/10/2024",
      rubros: [
        { nombre: "Tareas Preliminares", avance: 81 },
        { nombre: "Movimientos de Suelo", avance: 81 }
      ]
    },
    {
      id: 2,
      mes: "Noviembre 2024",
      nombre: "Certificado 2",
      estado: "pagado",
      montoBase: 2081169,
      cac: 2368634,
      total: 4449803,
      fecha: "01/11/2024",
      rubros: [
        { nombre: "Tareas Preliminares", avance: 19 },
        { nombre: "Movimientos de Suelo", avance: 19 }
      ]
    },
    {
      id: 3,
      mes: "Diciembre 2024",
      nombre: "Certificado 3",
      estado: "pendiente",
      montoBase: 4500000,
      cac: 6200000,
      total: 10700000,
      fecha: "01/12/2024",
      rubros: [
        { nombre: "Fundaciones", avance: 50 },
        { nombre: "Mampostería", avance: 30 }
      ]
    }
  ]
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
};

export default function Dashboard({ data }) {
  const [expandedCert, setExpandedCert] = useState(null);

  // Use the passed data, or fallback to the static mockData if none provided
  const activeData = data || mockData;

  const toggleCert = (id) => {
    if (expandedCert === id) setExpandedCert(null);
    else setExpandedCert(id);
  };

  // Calculate some dynamic KPIs based on actual data
  const totalCertificado = activeData.certificaciones.reduce((acc, cert) => acc + cert.total, 0);
  const pendienteCertificado = activeData.certificaciones
    .filter(c => c.estado === 'pendiente')
    .reduce((acc, cert) => acc + cert.total, 0);

  return (
    <div className="dashboard-layout">
      {/* Sidebar / Header premium */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="brand">D+ARQ</div>
          <div className="client-info">
            <span className="welcome">Bienvenido,</span>
            <span className="client-name">{activeData.comitente}</span>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Project Title Area */}
        <section className="project-hero">
          <div className="project-titles">
            <h1 className="project-name">{activeData.obra}</h1>
            <p className="project-subtitle">Portal de Transparencia y Avance de Obra</p>
          </div>
        </section>

        {/* KPIs Row */}
        <section className="kpi-grid">
          <div className="kpi-card glass-card">
            <div className="kpi-icon-wrapper blue"><Activity size={24} /></div>
            <div className="kpi-data">
              <h3>Avance Físico</h3>
              <div className="kpi-value">{activeData.avanceTotal}%</div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${activeData.avanceTotal}%` }}></div>
              </div>
            </div>
          </div>
          
          <div className="kpi-card glass-card">
            <div className="kpi-icon-wrapper green"><CheckCircle2 size={24} /></div>
            <div className="kpi-data">
              <h3>Total Certificado</h3>
              <div className="kpi-value">{formatCurrency(totalCertificado)}</div>
              <p className="kpi-subtext">Acumulado al último cierre</p>
            </div>
          </div>

          <div className="kpi-card glass-card border-orange">
            <div className="kpi-icon-wrapper orange"><CircleDashed size={24} /></div>
            <div className="kpi-data">
              <h3>Saldo a Pagar (Pendiente)</h3>
              <div className="kpi-value text-orange">{formatCurrency(pendienteCertificado)}</div>
              <p className="kpi-subtext">Certificaciones no abonadas</p>
            </div>
          </div>
        </section>

        {/* Timeline Certificates */}
        <section className="timeline-section">
          <h2 className="section-title">Certificaciones y Avance</h2>
          <div className="certificates-list">
            {activeData.certificaciones.map((cert) => {
              const isExpanded = expandedCert === cert.id;
              const isPaid = cert.estado === 'pagado';

              return (
                <div key={cert.id} className={`cert-card ${isExpanded ? 'expanded' : ''}`}>
                  <div className="cert-header" onClick={() => toggleCert(cert.id)}>
                    <div className="cert-status-icon">
                      {isPaid ? <CheckCircle2 className="status-icon paid" /> : <CircleDashed className="status-icon pending" />}
                    </div>
                    
                    <div className="cert-main-info">
                      <h4 className="cert-title">{cert.nombre} <span className="cert-month">({cert.mes})</span></h4>
                      <div className="cert-date"><Calendar size={14}/> Emitido: {cert.fecha}</div>
                    </div>

                    <div className="cert-financials">
                      <div className="cert-amount">{formatCurrency(cert.total)}</div>
                      <div className={`cert-badge ${isPaid ? 'badge-paid' : 'badge-pending'}`}>
                        {isPaid ? 'Pagado' : 'Pendiente de Pago'}
                      </div>
                    </div>

                    <button className="expand-btn">
                      {isExpanded ? <ChevronUp /> : <ChevronDown />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="cert-details fade-in">
                      <div className="details-grid">
                        <div className="details-breakdown">
                          <h5>Desglose Financiero</h5>
                          <div className="breakdown-row">
                            <span>Avance Base</span>
                            <span>{formatCurrency(cert.montoBase)}</span>
                          </div>
                          <div className="breakdown-row">
                            <span>Ajuste CAC</span>
                            <span>{formatCurrency(cert.cac)}</span>
                          </div>
                          <div className="breakdown-row total-row">
                            <span>Total a Pagar</span>
                            <span>{formatCurrency(cert.total)}</span>
                          </div>
                          
                          {!isPaid && (
                            <button className="pay-action-btn">
                              Informar Pago
                            </button>
                          )}
                        </div>

                        <div className="details-progress">
                          <h5>Avance Físico (Rubros)</h5>
                          <div className="rubros-list">
                            {cert.rubros.map((rubro, idx) => (
                              <div key={idx} className="rubro-item">
                                <div className="rubro-header">
                                  <span className="rubro-name">{rubro.nombre}</span>
                                  <span className="rubro-value">{rubro.avance}%</span>
                                </div>
                                <div className="rubro-bar-bg">
                                  <div className="rubro-bar-fill" style={{ width: `${rubro.avance}%` }}></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
