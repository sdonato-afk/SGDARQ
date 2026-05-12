/**
 * TabEquipo.jsx
 * Design System unificado: estilos inline.
 */
import React, { useState } from 'react';
import { Plus, Mail, Phone, Pencil, Trash2, Users } from 'lucide-react';
import { useUsuariosData } from '../../hooks/useUsuariosData';
import ModalNuevoUsuario   from '../../components/ModalNuevoUsuario';

export default function TabEquipo() {
  const { usuarios, loading, agregarUsuario, actualizarUsuario, eliminarUsuario } = useUsuariosData();
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editUsuario, setEditUsuario] = useState(null);

  const handleGuardar = async (data) => {
    if (editUsuario) await actualizarUsuario(editUsuario.id, data);
    else             await agregarUsuario(data);
    setEditUsuario(null);
    setModalOpen(false);
  };

  const handleEdit  = (u) => { setEditUsuario(u); setModalOpen(true); };
  const handleClose = ()  => { setEditUsuario(null); setModalOpen(false); };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, gap: 10, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
      <div style={{ width: 16, height: 16, border: '2px solid rgba(129,140,248,0.4)', borderTopColor: '#818cf8', borderRadius: '50%', animation: 'spin 1s linear infinite' }}/>
      Cargando equipo...
    </div>
  );

  const activos   = usuarios.filter(u => u.activo !== false);
  const inactivos = usuarios.filter(u => u.activo === false);

  return (
    <>
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 64, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 16, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={20} style={{ color: '#818cf8' }}/>
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.03em', color: '#fff', lineHeight: 1 }}>
              Equipo
            </h1>
            <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.22em', color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
              Miembros y responsables
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.2)', padding: '8px 16px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
            {activos.length} activo{activos.length !== 1 ? 's' : ''}
          </span>
          <button onClick={() => setModalOpen(true)} style={{
            display: 'flex', alignItems: 'center', gap: 8, background: '#4f46e5', color: '#fff',
            fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em',
            padding: '10px 20px', borderRadius: 14, border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(79,70,229,0.4)', transition: 'all 0.15s',
          }}>
            <Plus size={15} strokeWidth={2.5}/> Nuevo miembro
          </button>
        </div>
      </div>

      {usuarios.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', background: 'rgba(255,255,255,0.015)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.04)', gap: 10 }}>
          <Users size={32} style={{ color: 'rgba(255,255,255,0.1)' }}/>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>Todavía no hay miembros. Creá el primero.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {/* Activos */}
          {activos.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 4, height: 16, borderRadius: 2, background: '#818cf8', flexShrink: 0 }} />
                <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.5)' }}>
                  Miembros activos ({activos.length})
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activos.map(u => <MemberRow key={u.id} u={u} onEdit={handleEdit} onToggle={actualizarUsuario} onDelete={eliminarUsuario}/>)}
              </div>
            </div>
          )}

          {/* Inactivos */}
          {inactivos.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 4, height: 16, borderRadius: 2, background: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                <p style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.3)' }}>
                  Pausados ({inactivos.length})
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: 0.5 }}>
                {inactivos.map(u => <MemberRow key={u.id} u={u} onEdit={handleEdit} onToggle={actualizarUsuario} onDelete={eliminarUsuario}/>)}
              </div>
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <ModalNuevoUsuario
          onGuardar={handleGuardar}
          usuarioEditar={editUsuario}
          onClose={handleClose}
        />
      )}
    </>
  );
}

function MemberRow({ u, onEdit, onToggle, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const initials = u.nombre.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
  const isActive = u.activo !== false;

  return (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderRadius: 16, padding: '12px 16px 12px 20px', minHeight: 64,
        background: hovered && isActive ? 'rgba(255,255,255,0.04)' : isActive ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.1)',
        border: `1px solid ${isActive ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)'}`,
        transition: 'all 0.15s'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
        {/* Avatar */}
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 900, color: '#fff',
          backgroundColor: u.color || '#7c3aed',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.92)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {u.nombre}
            </p>
            {!isActive && (
              <span style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)' }}>
                Inactivo
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {u.email && (
              <a href={`mailto:${u.email}`} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>
                <Mail size={10}/> {u.email}
              </a>
            )}
            {u.whatsapp && (
              <a href={`https://wa.me/${u.whatsapp.replace(/[^0-9]/g,'')}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>
                <Phone size={10}/> {u.whatsapp}
              </a>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <button onClick={() => onToggle(u.id, { activo: !isActive })} style={{
          fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em',
          padding: '6px 12px', borderRadius: 8, border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
          ...(isActive
            ? { borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.25)', background: 'transparent' }
            : { borderColor: 'rgba(16,185,129,0.4)', color: '#34d399', background: 'transparent' })
        }}>
          {isActive ? 'Pausar' : 'Activar'}
        </button>
        <div style={{ display: 'flex', gap: 6, opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>
          <button onClick={() => onEdit(u)} style={{ width: 28, height: 28, borderRadius: 8, background: 'transparent', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Pencil size={14}/>
          </button>
          <button onClick={() => onDelete(u.id)} style={{ width: 28, height: 28, borderRadius: 8, background: 'transparent', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={14}/>
          </button>
        </div>
      </div>
    </div>
  );
}
