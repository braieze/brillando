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
      <style>{ESTILOS}</style>

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

/* ============================================================
   ESTILOS — Brutalismo mobile-first
   Bordes gruesos, sombras sólidas sin difuminar, alto contraste.
   ============================================================ */
const ESTILOS = `
.bd-root{
  --bd-crema: #f2ede0;
  --bd-crema2: #e8e1cf;
  --bd-tinta: #0a0a0c;
  --bd-azul: #2438e0;
  --bd-amarillo: #ffcc00;
  --bd-rojo: #e2342b;
  --bd-verde: #1c9a56;
  --bd-mono: var(--f-mono, 'Space Mono', monospace);
  --bd-display: var(--f-display, 'Archivo Black', sans-serif);
  --bd-body: var(--f-body, 'Space Grotesk', sans-serif);

  min-height: 100vh;
  background: var(--bd-crema);
  color: var(--bd-tinta);
  font-family: var(--bd-body);
  position: relative;
  padding-bottom: 110px;
  -webkit-font-smoothing: antialiased;
}
.bd-root *{ box-sizing: border-box; }
.bd-root button{ font-family: inherit; cursor:pointer; }
.bd-root button:focus-visible, .bd-root input:focus-visible, .bd-root select:focus-visible{
  outline: 3px solid var(--bd-azul); outline-offset: 2px;
}

/* ---------- header ---------- */
.bd-header{
  position: sticky; top: 0; z-index: 40;
  background: var(--bd-crema);
  border-bottom: 3px solid var(--bd-tinta);
  padding: 12px 16px 14px;
}
.bd-header-top{ display:flex; align-items:center; justify-content:space-between; margin-bottom: 10px; }
.bd-back{
  display:flex; align-items:center; gap:5px;
  background:none; border:none; color: var(--bd-tinta);
  font-size: 13px; font-weight: 700; padding: 4px 0;
}
.bd-live{ display:flex; align-items:center; gap:6px; font-family: var(--bd-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing:.06em; color: var(--bd-tinta); }
.bd-live-dot{ width:7px; height:7px; border-radius:50%; background: var(--bd-verde); animation: bd-pulse 1.6s ease-in-out infinite; }
@keyframes bd-pulse{ 0%,100%{ opacity:1; } 50%{ opacity:.35; } }

.bd-title{
  font-family: var(--bd-display); text-transform: uppercase;
  font-size: 20px; letter-spacing: .01em; margin: 0 0 12px;
}

.bd-toggle{ display:flex; border: 3px solid var(--bd-tinta); background: var(--bd-tinta); }
.bd-toggle-seg{
  flex:1; border:none; background: var(--bd-tinta); color: var(--bd-crema);
  padding: 10px 6px; display:flex; flex-direction:column; align-items:center; gap:2px;
  min-height: 52px; justify-content:center;
}
.bd-toggle-seg + .bd-toggle-seg{ border-left: 3px solid var(--bd-tinta); }
.bd-toggle-seg.is-active{ background: var(--bd-amarillo); color: var(--bd-tinta); }
.bd-toggle-name{ font-family: var(--bd-mono); font-size: 11.5px; font-weight:700; letter-spacing:.03em; text-transform: uppercase; }
.bd-toggle-date{ font-family: var(--bd-mono); font-size: 9.5px; opacity:.75; letter-spacing:.05em; }

.bd-main{ padding: 16px; }

/* ---------- métricas ---------- */
.bd-metrics{ display:grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-bottom: 16px; }
.bd-metric{
  background: var(--bd-crema2); border: 2.5px solid var(--bd-tinta);
  padding: 10px 6px; text-align:center; box-shadow: 3px 3px 0 var(--bd-tinta);
  display:flex; flex-direction:column; gap:2px;
}
.bd-metric-label{ font-family: var(--bd-mono); font-size: 8.5px; text-transform:uppercase; letter-spacing:.05em; opacity:.75; }
.bd-metric-value{ font-family: var(--bd-display); font-size: 22px; line-height:1; }
.bd-metric-foot{ font-family: var(--bd-mono); font-size: 9px; opacity:.6; }
.bd-metric--azul{ background: var(--bd-azul); color: var(--bd-crema); }
.bd-metric--azul .bd-metric-value{ color: var(--bd-amarillo); }
.bd-metric--azul .bd-metric-label{ opacity:.85; }
.bd-metric--alerta{ background: var(--bd-rojo); color: #fff; }

/* ---------- barra de filtros ---------- */
.bd-filterbar{ margin-bottom: 14px; }
.bd-filter-toggle{
  display:inline-flex; align-items:center; gap:8px;
  background: var(--bd-crema); border: 2.5px solid var(--bd-tinta);
  padding: 9px 14px; font-family: var(--bd-mono); font-size: 11.5px; font-weight:700;
  text-transform: uppercase; letter-spacing:.03em;
  box-shadow: 3px 3px 0 var(--bd-tinta);
}
.bd-filter-badge{
  background: var(--bd-azul); color:#fff; border-radius: 50%;
  width: 16px; height:16px; font-size: 9px; display:flex; align-items:center; justify-content:center;
}
.bd-filter-chevron{ transition: transform .2s ease; }
.bd-filter-chevron.is-open{ transform: rotate(180deg); }
.bd-filter-count{ font-family: var(--bd-mono); font-size: 11px; opacity:.6; margin-left: 10px; }

.bd-filter-summary{ display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top: 10px; }
.bd-chip{
  font-family: var(--bd-mono); font-size: 10.5px; background: var(--bd-tinta); color: var(--bd-crema);
  padding: 5px 9px;
}
.bd-chip-clear{
  background:none; border: none; text-decoration: underline; font-size: 11px; font-weight:700; color: var(--bd-azul);
}

.bd-filter-panel{
  margin-top: 10px; display:flex; flex-direction:column; gap: 10px;
  background: var(--bd-crema2); border: 2.5px solid var(--bd-tinta); padding: 12px;
  box-shadow: 3px 3px 0 var(--bd-tinta);
}
.bd-input{
  width: 100%; padding: 12px 10px; border: 2.5px solid var(--bd-tinta);
  background: var(--bd-crema); font-family: var(--bd-mono); font-size: 13px; outline: none;
}
.bd-select-wrap{ position: relative; }
.bd-select{
  width: 100%; padding: 12px 34px 12px 10px; border: 2.5px solid var(--bd-tinta);
  background: var(--bd-crema); font-family: var(--bd-mono); font-size: 12px; text-transform: uppercase;
  outline: none; appearance: none; -webkit-appearance:none;
}
.bd-select-caret{ position:absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events:none; }
.bd-clear-btn{
  align-self: flex-start; background:none; border:none; text-decoration: underline;
  font-family: var(--bd-mono); font-size: 11px; font-weight:700; color: var(--bd-rojo); padding: 2px 0;
}

/* ---------- lista + swipe to delete ---------- */
.bd-list{ display:flex; flex-direction:column; gap: 9px; }
.bd-empty{
  display:flex; flex-direction:column; align-items:center; gap: 10px;
  padding: 46px 20px; text-align:center; color: rgba(10,10,12,.6);
  border: 2.5px dashed var(--bd-tinta);
}
.bd-empty p{ font-size: 13.5px; margin:0; }

.bd-swipe-wrap{ position: relative; overflow: hidden; border: 2.5px solid var(--bd-tinta); }
.bd-swipe-delete{
  position:absolute; inset:0; display:flex; justify-content:flex-end; align-items:stretch;
  background: var(--bd-rojo);
}
.bd-swipe-delete-btn{
  width: 84px; border:none; background:transparent; color: var(--bd-crema);
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px;
  font-family: var(--bd-mono); font-size: 10px; text-transform: uppercase; letter-spacing:.04em;
}

.bd-row{
  position: relative; z-index: 1;
  display:flex; align-items:center; justify-content:space-between; gap: 10px;
  background: var(--bd-crema2); padding: 13px 12px;
  touch-action: pan-y;
  will-change: transform;
}
.bd-row--adentro{ background: rgba(36,56,224,0.14); }
.bd-row-info{ min-width: 0; }
.bd-row-name{
  margin: 0 0 3px; font-size: 14px; text-transform: uppercase; line-height:1.2;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.bd-row-church{
  display:flex; align-items:center; gap:4px;
  font-family: var(--bd-mono); font-size: 10px; font-weight:700; color: var(--bd-azul); text-transform: uppercase;
  white-space: nowrap; overflow:hidden; text-overflow: ellipsis;
}

.bd-toggle-btn{
  flex-shrink:0; display:flex; align-items:center; gap:6px;
  padding: 10px 13px; border: 2.5px solid var(--bd-tinta); background: transparent; color: var(--bd-tinta);
  font-family: var(--bd-mono); font-size: 11px; font-weight:700; text-transform: uppercase;
  min-width: 96px; justify-content:center; min-height: 40px;
}
.bd-toggle-btn.is-adentro{ background: var(--bd-amarillo); }

/* ---------- FAB escanear ---------- */
.bd-fab{
  position: fixed; right: 18px; bottom: 22px; z-index: 45;
  display:flex; align-items:center; gap:9px;
  background: var(--bd-tinta); color: var(--bd-crema);
  border: 3px solid var(--bd-tinta); padding: 16px 20px;
  box-shadow: 4px 4px 0 var(--bd-amarillo);
  font-family: var(--bd-mono); font-size: 13px; font-weight:700; text-transform: uppercase;
}
.bd-fab span{ display:none; }
@media (min-width: 380px){ .bd-fab span{ display:inline; } }
.bd-fab:active{ transform: translate(2px,2px); box-shadow: 2px 2px 0 var(--bd-amarillo); }

/* ---------- flash de validación ---------- */
.bd-flash{
  position: fixed; inset: 0; z-index: 9999;
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap: 18px;
  padding: 30px; text-align:center;
}
.bd-flash--success{ background: var(--bd-verde); }
.bd-flash--error{ background: var(--bd-rojo); }
.bd-flash-icon{
  width: 84px; height:84px; border: 5px solid var(--bd-crema); border-radius: 50%; padding: 10px;
  animation: bd-pop .28s ease;
}
@keyframes bd-pop{ from{ transform: scale(.6); opacity:0; } to{ transform: scale(1); opacity:1; } }
.bd-flash-title{
  font-family: var(--bd-display); color: var(--bd-crema); text-transform: uppercase;
  font-size: clamp(30px, 9vw, 52px); line-height:1.05; margin:0;
}
.bd-flash-sub{
  font-family: var(--bd-mono); color: var(--bd-crema); font-size: 15px; margin:0; opacity:.9;
}

/* ---------- escáner overlay ---------- */
.bd-scanner-overlay{
  position: fixed; inset: 0; z-index: 60; background: var(--bd-tinta);
  display:flex; flex-direction:column;
}
.bd-scanner-top{
  display:flex; align-items:center; justify-content:space-between;
  padding: 16px; border-bottom: 3px solid var(--bd-crema);
}
.bd-scanner-label{ font-family: var(--bd-mono); color: var(--bd-crema); font-size: 12px; text-transform: uppercase; letter-spacing:.05em; }
.bd-scanner-close{
  width: 38px; height: 38px; border: 2.5px solid var(--bd-crema); background: transparent; color: var(--bd-crema);
  font-size: 16px; display:flex; align-items:center; justify-content:center;
}
.bd-scanner-camera{ position: relative; flex: 1; overflow: hidden; background:#000; }
.bd-scanner-camera > *{ width:100%; height:100%; object-fit: cover; }
.bd-scanner-frame{ position:absolute; inset: 12%; pointer-events:none; }
.bd-scanner-frame .corner{ position:absolute; width: 34px; height: 34px; border: 4px solid var(--bd-amarillo); }
.bd-scanner-frame .tl{ top:0; left:0; border-right:none; border-bottom:none; }
.bd-scanner-frame .tr{ top:0; right:0; border-left:none; border-bottom:none; }
.bd-scanner-frame .bl{ bottom:0; left:0; border-right:none; border-top:none; }
.bd-scanner-frame .br{ bottom:0; right:0; border-left:none; border-top:none; }
.bd-scanner-hint{
  text-align:center; font-family: var(--bd-mono); color: var(--bd-crema); font-size: 12px;
  padding: 16px; margin:0; opacity:.75;
}

/* ---------- modal rescate full screen ---------- */
.bd-modal{
  position: fixed; inset: 0; z-index: 70; background: var(--bd-crema);
  display:flex; flex-direction:column;
}
.bd-modal-header{
  display:flex; justify-content:space-between; align-items:flex-start; gap: 14px;
  padding: 20px 18px 16px; border-bottom: 3px solid var(--bd-tinta); background: var(--bd-amarillo);
}
.bd-modal-header h3{ font-family: var(--bd-display); text-transform: uppercase; margin: 0 0 6px; font-size: 19px; }
.bd-modal-header p{ font-size: 12.5px; line-height:1.5; margin:0; max-width: 320px; }
.bd-modal-close{
  flex-shrink:0; width: 34px; height: 34px; border: 2.5px solid var(--bd-tinta); background: var(--bd-crema);
  font-size: 15px;
}
.bd-modal-form{ padding: 20px 18px; display:flex; flex-direction:column; gap: 16px; flex:1; }
.bd-field{ display:flex; flex-direction:column; gap: 6px; }
.bd-field span{ font-family: var(--bd-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing:.05em; opacity:.65; }
.bd-modal-actions{ margin-top: auto; display:flex; gap: 10px; padding-top: 10px; }
.bd-btn{
  flex:1; padding: 15px; border: 3px solid var(--bd-tinta); font-family: var(--bd-mono); font-weight:700;
  font-size: 13px; text-transform: uppercase; min-height: 50px;
}
.bd-btn--ghost{ background: transparent; color: var(--bd-tinta); }
.bd-btn--azul{ background: var(--bd-azul); color: var(--bd-crema); }

/* ---------- pantallas más anchas ---------- */
@media (min-width: 720px){
  .bd-main{ max-width: 640px; margin: 0 auto; padding: 24px 16px; }
  .bd-header-top, .bd-title, .bd-toggle{ max-width: 640px; margin-left:auto; margin-right:auto; }
  .bd-modal{ align-items:center; justify-content:center; }
  .bd-modal-form, .bd-modal-header{ width: 100%; max-width: 440px; }
  .bd-modal > .bd-modal-header, .bd-modal > .bd-modal-form{ align-self:center; }
}`;