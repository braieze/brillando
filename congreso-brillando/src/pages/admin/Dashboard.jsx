import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Scanner } from '@yudiel/react-qr-scanner';


// Umbral de arrastre (px) a partir del cual la fila "eliminar" queda abierta
const SWIPE_OPEN_PX = -84;
const SWIPE_TRIGGER_PX = -40;

function vibrar(pattern) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch (_) {}
  }
}

/* ============================================================
   FILA CON SWIPE-TO-DELETE
   Reemplaza el botón "Eliminar Registro" por un gesto de
   deslizar a la izquierda, típico de apps de gestión mobile.
   ============================================================ */
function FilaInscripto({ persona, asistio, onToggle, onDelete }) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startedOpen = useRef(false);

  const clamp = (v) => Math.max(SWIPE_OPEN_PX, Math.min(0, v));

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    startX.current = e.clientX;
    startedOpen.current = dragX !== 0;
    setDragging(true);
  };

  const onPointerMove = (e) => {
    if (!dragging) return;
    const delta = e.clientX - startX.current;
    const base = startedOpen.current ? SWIPE_OPEN_PX : 0;
    setDragX(clamp(base + delta));
  };

  const finishDrag = () => {
    if (!dragging) return;
    setDragging(false);
    setDragX((current) => (current <= SWIPE_TRIGGER_PX ? SWIPE_OPEN_PX : 0));
  };

  const handleRowTap = () => {
    if (dragX !== 0) setDragX(0); // si está abierta, un toque la cierra
  };

  return (
    <div className="bd-swipe-wrap">
      <div className="bd-swipe-delete">
        <button
          className="bd-swipe-delete-btn"
          onClick={() => { setDragX(0); onDelete(); }}
          aria-label={`Eliminar a ${persona.nombre} ${persona.apellido}`}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M3 5h14M8 5V3h4v2M5 5l1 12h8l1-12" stroke="#f2ede0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Eliminar</span>
        </button>
      </div>

      <div
        className={`bd-row ${asistio ? 'bd-row--adentro' : ''}`}
        style={{ transform: `translateX(${dragX}px)`, transition: dragging ? 'none' : 'transform .22s ease' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onClick={handleRowTap}
      >
        <div className="bd-row-info">
          <h4 className="bd-row-name">{persona.nombre} {persona.apellido}</h4>
          <span className="bd-row-church">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 22s7-7.2 7-12.5A7 7 0 0 0 5 9.5C5 14.8 12 22 12 22Z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="9.5" r="2.4" stroke="currentColor" strokeWidth="2"/></svg>
            {persona.iglesia || 'Sin iglesia'}
          </span>
        </div>

        <button
          className={`bd-toggle-btn ${asistio ? 'is-adentro' : ''}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); vibrar(15); onToggle(); }}
        >
          {asistio ? (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 3" stroke="#0a0a0c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Adentro
            </>
          ) : 'Ingresar'}
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  // 1. Estados centrales
  const [inscriptos, setInscriptos] = useState([]);
  const [eventoActivo, setEventoActivo] = useState('pre'); // 'pre' | 'congreso'

  // 2. Estados de filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroIglesia, setFiltroIglesia] = useState('TODAS');
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  // 3. Estados de escáner y validación
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [ultimoEscaneo, setUltimoEscaneo] = useState('');
  const [scanResult, setScanResult] = useState(null); // { type: 'success' | 'error', msg, sub }

  // 4. Estados de modo rescate
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ nombre: '', apellido: '', iglesia: '' });

  // Capacidades de los auditorios para medir ocupación
  const CAPACIDAD_PRE = 600;      // Auditorio CDS
  const CAPACIDAD_CONGRESO = 2500; // De Vicenzo

  // --- CONEXIÓN EN VIVO ---
  useEffect(() => {
    const inscriptosRef = collection(db, 'inscriptos');
    const unsubscribe = onSnapshot(inscriptosRef, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setInscriptos(data);
    });
    return () => unsubscribe();
  }, []);

  // --- LÓGICA DE ESCÁNER Y ASISTENCIA ---
  const marcarAsistencia = async (id, estadoActual) => {
    try {
      const inscriptoRef = doc(db, 'inscriptos', id);
      const campoAsistencia = eventoActivo === 'pre' ? 'asistio_pre' : 'asistio_congreso';
      await updateDoc(inscriptoRef, { [campoAsistencia]: !estadoActual });
    } catch (error) {
      console.error('Error al actualizar asistencia:', error);
    }
  };

  const handleScan = async (text) => {
    if (!text || text === ultimoEscaneo) return;
    setUltimoEscaneo(text);

    const persona = inscriptos.find((i) => i.id === text);

    if (persona) {
      const estadoActual = eventoActivo === 'pre' ? persona.asistio_pre : persona.asistio_congreso;
      if (estadoActual) {
        vibrar([40, 60, 40]);
        setScanResult({ type: 'error', msg: 'YA INGRESÓ', sub: `${persona.nombre} ${persona.apellido}` });
      } else {
        await marcarAsistencia(text, false);
        vibrar(60);
        setScanResult({ type: 'success', msg: 'ADMITIDO', sub: `${persona.nombre} ${persona.apellido}` });
      }
    } else {
      vibrar([40, 60, 40]);
      setScanResult({ type: 'error', msg: 'CÓDIGO INVÁLIDO', sub: 'No está registrado en el sistema' });
    }

    setTimeout(() => {
      setScanResult(null);
      setUltimoEscaneo('');
    }, 2000);
  };

  // --- ELIMINAR Y MODO RESCATE ---
  const eliminarInscripto = async (id, nombre) => {
    if (window.confirm(`¿Eliminar a ${nombre} del sistema? Esta acción no se puede deshacer.`)) {
      try {
        await deleteDoc(doc(db, 'inscriptos', id));
      } catch (error) {
        alert('Error al eliminar el registro.');
      }
    }
  };

  const handleInscripcionManual = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'inscriptos'), {
        nombre: manualForm.nombre,
        apellido: manualForm.apellido,
        iglesia: manualForm.iglesia,
        email: 'inscripcion_puerta@iceb.com',
        edad: 0,
        fechaInscripcion: serverTimestamp(),
        asistio_pre: eventoActivo === 'pre',
        asistio_congreso: eventoActivo === 'congreso',
        evento_origen: 'puerta_emergencia',
      });
      setIsModalOpen(false);
      setManualForm({ nombre: '', apellido: '', iglesia: '' });
      vibrar(60);
    } catch (error) {
      alert('Error guardando el registro manual.');
    }
  };

  // --- FILTROS Y MÉTRICAS DINÁMICAS ---
  const iglesiasUnicas = useMemo(() => {
    const lista = inscriptos.map((p) => p.iglesia?.trim().toUpperCase()).filter(Boolean);
    return ['TODAS', ...new Set(lista)].sort();
  }, [inscriptos]);

  const inscriptosFiltrados = useMemo(() => {
    const textoBuscado = busqueda.toLowerCase();
    return inscriptos.filter((persona) => {
      const coincideTexto =
        persona.nombre?.toLowerCase().includes(textoBuscado) ||
        persona.apellido?.toLowerCase().includes(textoBuscado);
      const coincideIglesia =
        filtroIglesia === 'TODAS' || persona.iglesia?.trim().toUpperCase() === filtroIglesia;
      return coincideTexto && coincideIglesia;
    });
  }, [inscriptos, busqueda, filtroIglesia]);

  const totalAsistentes = inscriptos.filter((p) => (eventoActivo === 'pre' ? p.asistio_pre : p.asistio_congreso)).length;
  const capacidadMax = eventoActivo === 'pre' ? CAPACIDAD_PRE : CAPACIDAD_CONGRESO;
  const porcentajeOcupacion = Math.min(Number(((totalAsistentes / capacidadMax) * 100).toFixed(1)), 100);
  const ocupacionAlta = porcentajeOcupacion >= 90;

  const filtrosActivos = busqueda.trim() !== '' || filtroIglesia !== 'TODAS';

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroIglesia('TODAS');
  };

  return (
    <div className="bd-root">

      {/* ================= FLASH DE VALIDACIÓN A PANTALLA COMPLETA ================= */}
      {scanResult && (
        <div className={`bd-flash bd-flash--${scanResult.type}`} role="alert">
          <svg className="bd-flash-icon" width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
            {scanResult.type === 'success' ? (
              <path d="M14 38l14 14L58 20" stroke="#f2ede0" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <>
                <path d="M20 20l32 32M52 20L20 52" stroke="#f2ede0" strokeWidth="7" strokeLinecap="round" />
              </>
            )}
          </svg>
          <h1 className="bd-flash-title">{scanResult.msg}</h1>
          {scanResult.sub && <p className="bd-flash-sub">{scanResult.sub}</p>}
        </div>
      )}

      {/* ================= HEADER STICKY ================= */}
      <header className="bd-header">
        <div className="bd-header-top">
          <button className="bd-back" onClick={() => navigate('/')} aria-label="Volver a la web">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L4 8l6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Volver
          </button>
          <div className="bd-live">
            <span className="bd-live-dot" /> En vivo
          </div>
        </div>

        <h1 className="bd-title">Control de puerta</h1>

        <div className="bd-toggle" role="tablist" aria-label="Evento activo">
          <button
            role="tab"
            aria-selected={eventoActivo === 'pre'}
            className={`bd-toggle-seg ${eventoActivo === 'pre' ? 'is-active' : ''}`}
            onClick={() => setEventoActivo('pre')}
          >
            <span className="bd-toggle-name">Pre-Congreso</span>
            <span className="bd-toggle-date">12 SEP</span>
          </button>
          <button
            role="tab"
            aria-selected={eventoActivo === 'congreso'}
            className={`bd-toggle-seg ${eventoActivo === 'congreso' ? 'is-active' : ''}`}
            onClick={() => setEventoActivo('congreso')}
          >
            <span className="bd-toggle-name">Congreso</span>
            <span className="bd-toggle-date">31 OCT</span>
          </button>
        </div>
      </header>

      <main className="bd-main">
        {/* ================= MÉTRICAS ================= */}
        <div className="bd-metrics">
          <div className="bd-metric">
            <span className="bd-metric-label">Inscriptos</span>
            <span className="bd-metric-value">{inscriptos.length}</span>
          </div>
          <div className="bd-metric bd-metric--azul">
            <span className="bd-metric-label">Adentro</span>
            <span className="bd-metric-value">{totalAsistentes}</span>
          </div>
          <div className={`bd-metric ${ocupacionAlta ? 'bd-metric--alerta' : ''}`}>
            <span className="bd-metric-label">Ocupación</span>
            <span className="bd-metric-value">{porcentajeOcupacion}%</span>
            <span className="bd-metric-foot">{totalAsistentes}/{capacidadMax}</span>
          </div>
        </div>

        {/* ================= BARRA DE FILTROS (COLAPSABLE) ================= */}
        <div className="bd-filterbar">
          <button className="bd-filter-toggle" onClick={() => setFiltrosAbiertos((v) => !v)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5.2" stroke="currentColor" strokeWidth="1.8" /><path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            Buscar / Filtrar
            {filtrosActivos && <span className="bd-filter-badge">1</span>}
            <svg className={`bd-filter-chevron ${filtrosAbiertos ? 'is-open' : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>

          <span className="bd-filter-count">{inscriptosFiltrados.length} resultado{inscriptosFiltrados.length !== 1 ? 's' : ''}</span>

          {!filtrosAbiertos && filtrosActivos && (
            <div className="bd-filter-summary">
              {busqueda.trim() !== '' && <span className="bd-chip">“{busqueda}”</span>}
              {filtroIglesia !== 'TODAS' && <span className="bd-chip">{filtroIglesia}</span>}
              <button className="bd-chip-clear" onClick={limpiarFiltros}>Limpiar</button>
            </div>
          )}

          {filtrosAbiertos && (
            <div className="bd-filter-panel">
              <input
                type="text"
                inputMode="search"
                placeholder="Buscar nombre o apellido…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="bd-input"
              />
              <div className="bd-select-wrap">
                <select
                  value={filtroIglesia}
                  onChange={(e) => setFiltroIglesia(e.target.value)}
                  className="bd-select"
                >
                  {iglesiasUnicas.map((ig) => <option key={ig} value={ig}>{ig}</option>)}
                </select>
                <svg className="bd-select-caret" width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1l5 5 5-5" stroke="#0a0a0c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              {filtrosActivos && (
                <button className="bd-clear-btn" onClick={limpiarFiltros}>Limpiar filtros</button>
              )}
            </div>
          )}
        </div>

        {/* ================= LISTA DE INSCRIPTOS ================= */}
        <div className="bd-list">
          {inscriptosFiltrados.length === 0 && (
            <div className="bd-empty">
              <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true"><circle cx="15" cy="15" r="9" stroke="#0a0a0c" strokeWidth="2.2" /><path d="M21.5 21.5L29 29" stroke="#0a0a0c" strokeWidth="2.2" strokeLinecap="round" /></svg>
              <p>No hay inscriptos que coincidan.</p>
              {filtrosActivos && <button className="bd-clear-btn" onClick={limpiarFiltros}>Limpiar filtros</button>}
            </div>
          )}

          {inscriptosFiltrados.map((persona) => {
            const asistio = eventoActivo === 'pre' ? persona.asistio_pre : persona.asistio_congreso;
            return (
              <FilaInscripto
                key={persona.id}
                persona={persona}
                asistio={asistio}
                onToggle={() => marcarAsistencia(persona.id, asistio)}
                onDelete={() => eliminarInscripto(persona.id, `${persona.nombre} ${persona.apellido}`)}
              />
            );
          })}
        </div>
      </main>

      {/* ================= BOTÓN FLOTANTE: ESCANEAR ================= */}
      {!isScannerOpen && (
        <button className="bd-fab" onClick={() => setIsScannerOpen(true)} aria-label="Abrir escáner QR">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
            <path d="M2 8V3h5M24 8V3h-5M2 18v5h5M24 18v5h-5" stroke="#f2ede0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="9" y="9" width="8" height="8" fill="#f2ede0" />
          </svg>
          <span>Escanear</span>
        </button>
      )}

      {/* ================= ESCÁNER — OVERLAY FULL SCREEN ================= */}
      {isScannerOpen && (
        <div className="bd-scanner-overlay">
          <div className="bd-scanner-top">
            <span className="bd-scanner-label">{eventoActivo === 'pre' ? 'Pre-Congreso · 12 Sep' : 'Congreso · 31 Oct'}</span>
            <button className="bd-scanner-close" onClick={() => setIsScannerOpen(false)} aria-label="Cerrar escáner">✕</button>
          </div>

          <div className="bd-scanner-camera">
            <Scanner onResult={(text) => handleScan(text)} options={{ delayBetweenScanAttempts: 1500 }} />
            <div className="bd-scanner-frame" aria-hidden="true">
              <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
            </div>
          </div>

          <p className="bd-scanner-hint">Apuntá la cámara al código QR del pase</p>
        </div>
      )}

      {/* ================= MODAL MODO RESCATE — FULL SCREEN ================= */}
      {isModalOpen && (
        <div className="bd-modal">
          <div className="bd-modal-header">
            <div>
              <h3>Modo rescate</h3>
              <p>Anotá al instante a quien llegó sin pase. Queda ingresado automáticamente en <b>{eventoActivo === 'pre' ? 'Pre-Congreso' : 'Congreso'}</b>.</p>
            </div>
            <button className="bd-modal-close" onClick={() => setIsModalOpen(false)} aria-label="Cerrar">✕</button>
          </div>

          <form onSubmit={handleInscripcionManual} className="bd-modal-form">
            <label className="bd-field">
              <span>Nombre</span>
              <input type="text" required value={manualForm.nombre} onChange={(e) => setManualForm({ ...manualForm, nombre: e.target.value })} placeholder="Ej: Camila" className="bd-input" autoFocus />
            </label>
            <label className="bd-field">
              <span>Apellido</span>
              <input type="text" required value={manualForm.apellido} onChange={(e) => setManualForm({ ...manualForm, apellido: e.target.value })} placeholder="Ej: Fernández" className="bd-input" />
            </label>
            <label className="bd-field">
              <span>Iglesia</span>
              <input type="text" required value={manualForm.iglesia} onChange={(e) => setManualForm({ ...manualForm, iglesia: e.target.value })} placeholder="Nombre de su iglesia" className="bd-input" />
            </label>

            <div className="bd-modal-actions">
              <button type="button" className="bd-btn bd-btn--ghost" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button type="submit" className="bd-btn bd-btn--azul">Admitir ahora</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}