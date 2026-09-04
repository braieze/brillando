import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Scanner } from '@yudiel/react-qr-scanner';
import './Dashboard.css';

const SWIPE_OPEN_PX = -84;
const SWIPE_TRIGGER_PX = -40;

function vibrar(pattern) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch (_) {}
  }
}

/* ============================================================
   FILA CON SWIPE-TO-DELETE
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
    if (dragX !== 0) setDragX(0); 
  };

  return (
    <div className="bd-swipe-wrap">
      <div className="bd-swipe-delete">
        <button className="bd-swipe-delete-btn" onClick={() => { setDragX(0); onDelete(); }}>
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
            📍 {persona.iglesia || 'Sin iglesia'}
          </span>
        </div>

        <button
          className={`bd-toggle-btn ${asistio ? 'is-adentro' : ''}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); vibrar(15); onToggle(); }}
        >
          {asistio ? 'Adentro ✓' : 'Ingresar'}
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [inscriptos, setInscriptos] = useState([]);
  const [eventoActivo, setEventoActivo] = useState('pre'); 
  const [busqueda, setBusqueda] = useState('');
  const [filtroIglesia, setFiltroIglesia] = useState('TODAS');
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  // Estados de escáner y Modal de Identidad
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [ultimoEscaneo, setUltimoEscaneo] = useState('');
  const [scannedPerson, setScannedPerson] = useState(null); // Guarda a la persona leída para mostrar el Flyer
  const [scanResult, setScanResult] = useState(null); 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ nombre: '', apellido: '', iglesia: '' });

  // --- CONEXIÓN EN VIVO ---
  useEffect(() => {
    const inscriptosRef = collection(db, 'inscriptos');
    const unsubscribe = onSnapshot(inscriptosRef, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setInscriptos(data);
    });
    return () => unsubscribe();
  }, []);

  // --- LÓGICA DE ASISTENCIA ---
  const marcarAsistencia = async (id, estadoActual) => {
    try {
      const inscriptoRef = doc(db, 'inscriptos', id);
      const campoAsistencia = eventoActivo === 'pre' ? 'asistio_pre' : 'asistio_congreso';
      await updateDoc(inscriptoRef, { [campoAsistencia]: !estadoActual });
    } catch (error) {
      console.error('Error al actualizar asistencia:', error);
    }
  };

  // --- NUEVO FLUJO DE ESCÁNER BLINDADO ---
  const handleScan = (rawData) => {
    if (!rawData) return;

    // Extraemos el texto real sin importar la versión de la librería
    let textoQR = "";
    if (typeof rawData === 'string') {
      textoQR = rawData;
    } else if (Array.isArray(rawData) && rawData.length > 0) {
      textoQR = rawData[0].rawValue;
    } else if (rawData.text || rawData.rawValue) {
      textoQR = rawData.text || rawData.rawValue;
    }

    if (!textoQR) return;
    textoQR = textoQR.trim(); // Quitamos espacios fantasma

    if (textoQR === ultimoEscaneo) return;
    setUltimoEscaneo(textoQR);

    // Buscamos a la persona en Firebase
    const persona = inscriptos.find((i) => i.id === textoQR);

    if (persona) {
      vibrar(60);
      setScannedPerson(persona);
      setIsScannerOpen(false); 
    } else {
      vibrar([40, 60, 40]);
      // ALERTA DE DIAGNÓSTICO
      alert(`El escáner leyó esto:\n"${textoQR}"\n\nPero no coincide con nadie en la base de datos.`);
      setScanResult({ type: 'error', msg: 'CÓDIGO INVÁLIDO', sub: 'No está registrado' });
      setTimeout(() => { setScanResult(null); setUltimoEscaneo(''); }, 2000);
    }
  };

  const confirmarIngreso = async () => {
    if (!scannedPerson) return;
    await marcarAsistencia(scannedPerson.id, false);
    vibrar([30, 50, 30]);
    
    setScanResult({ type: 'success', msg: 'ADMITIDO', sub: `${scannedPerson.nombre} ${scannedPerson.apellido}` });
    setScannedPerson(null);
    setUltimoEscaneo('');
    
    setTimeout(() => { 
      setScanResult(null); 
      setIsScannerOpen(true); 
    }, 1500);
  };

  // --- MODO RESCATE Y ELIMINAR ---
  const eliminarInscripto = async (id, nombre) => {
    if (window.confirm(`¿Eliminar a ${nombre} del sistema? Esta acción no se puede deshacer.`)) {
      try { await deleteDoc(doc(db, 'inscriptos', id)); } 
      catch (error) { alert('Error al eliminar el registro.'); }
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
      const coincideTexto = persona.nombre?.toLowerCase().includes(textoBuscado) || persona.apellido?.toLowerCase().includes(textoBuscado);
      const coincideIglesia = filtroIglesia === 'TODAS' || persona.iglesia?.trim().toUpperCase() === filtroIglesia;
      return coincideTexto && coincideIglesia;
    });
  }, [inscriptos, busqueda, filtroIglesia]);

  const totalInscriptos = inscriptos.length;
  const totalAsistentes = inscriptos.filter((p) => (eventoActivo === 'pre' ? p.asistio_pre : p.asistio_congreso)).length;
  const capacidadMax = totalInscriptos === 0 ? 1 : totalInscriptos; 
  const porcentajeOcupacion = Math.min(Number(((totalAsistentes / capacidadMax) * 100).toFixed(1)), 100);
  const ocupacionAlta = porcentajeOcupacion >= 90;

  const filtrosActivos = busqueda.trim() !== '' || filtroIglesia !== 'TODAS';

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroIglesia('TODAS');
  };

  const scannedPersonYaIngreso = scannedPerson ? (eventoActivo === 'pre' ? scannedPerson.asistio_pre : scannedPerson.asistio_congreso) : false;

  return (
    <div className="bd-root">

      {/* ================= MODAL FLYER DE IDENTIDAD (FLUJO MANUAL) ================= */}
      {scannedPerson && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'var(--bd-crema)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px', background: scannedPersonYaIngreso ? 'var(--bd-rojo)' : 'var(--bd-azul)', color: 'white', borderBottom: '4px solid var(--bd-tinta)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontFamily: 'var(--bd-display)', margin: 0, fontSize: '22px', textTransform: 'uppercase' }}>
              {scannedPersonYaIngreso ? '⚠️ ALERTA' : 'VALIDACIÓN DE PASE'}
            </h3>
            <button onClick={() => { setScannedPerson(null); setUltimoEscaneo(''); setIsScannerOpen(true); }} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '24px', fontWeight: 'bold' }}>✕</button>
          </div>
          
          <div style={{ padding: '30px 20px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h2 style={{ fontFamily: 'var(--bd-display)', fontSize: 'clamp(35px, 10vw, 50px)', textTransform: 'uppercase', margin: '0 0 15px 0', lineHeight: 1, color: 'var(--bd-tinta)' }}>
              {scannedPerson.nombre} <br/> {scannedPerson.apellido}
            </h2>
            <p style={{ fontFamily: 'var(--bd-mono)', fontSize: '18px', fontWeight: 'bold', margin: '0 0 40px 0', color: 'var(--bd-azul)', textTransform: 'uppercase' }}>
              📍 {scannedPerson.iglesia}
            </p>

            {scannedPersonYaIngreso ? (
              <div style={{ background: 'var(--bd-rojo)', color: 'white', padding: '25px', border: '5px solid var(--bd-tinta)', fontWeight: 'bold', fontSize: '24px', fontFamily: 'var(--bd-mono)', textTransform: 'uppercase', boxShadow: '8px 8px 0 var(--bd-tinta)' }}>
                ❌ PASE YA UTILIZADO
              </div>
            ) : (
              <button onClick={confirmarIngreso} style={{ background: 'var(--bd-amarillo)', color: 'var(--bd-tinta)', padding: '25px', border: '5px solid var(--bd-tinta)', fontWeight: 'bold', fontSize: '24px', fontFamily: 'var(--bd-display)', textTransform: 'uppercase', width: '100%', boxShadow: '8px 8px 0 var(--bd-tinta)' }}>
                CONFIRMAR INGRESO →
              </button>
            )}

            <button onClick={() => { setScannedPerson(null); setUltimoEscaneo(''); setIsScannerOpen(true); }} style={{ marginTop: '30px', padding: '15px', background: 'transparent', border: '3px solid var(--bd-tinta)', fontWeight: 'bold', fontSize: '16px', fontFamily: 'var(--bd-mono)', textTransform: 'uppercase', color: 'var(--bd-tinta)' }}>
              ← ESCANEAR OTRO PASE
            </button>
          </div>
        </div>
      )}

      {/* ================= FLASH DE VALIDACIÓN RÁPIDA ================= */}
      {scanResult && (
        <div className={`bd-flash bd-flash--${scanResult.type}`} role="alert">
          <svg className="bd-flash-icon" width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
            {scanResult.type === 'success' ? (
              <path d="M14 38l14 14L58 20" stroke="#f2ede0" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M20 20l32 32M52 20L20 52" stroke="#f2ede0" strokeWidth="7" strokeLinecap="round" />
            )}
          </svg>
          <h1 className="bd-flash-title">{scanResult.msg}</h1>
          {scanResult.sub && <p className="bd-flash-sub">{scanResult.sub}</p>}
        </div>
      )}

      {/* ================= HEADER ================= */}
      <header className="bd-header">
        <div className="bd-header-top">
          <button className="bd-back" onClick={() => navigate('/')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L4 8l6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Volver
          </button>
          <div className="bd-live"><span className="bd-live-dot" /> En vivo</div>
        </div>

        <h1 className="bd-title">Control de puerta</h1>

        <div className="bd-toggle" role="tablist">
          <button role="tab" aria-selected={eventoActivo === 'pre'} className={`bd-toggle-seg ${eventoActivo === 'pre' ? 'is-active' : ''}`} onClick={() => setEventoActivo('pre')}>
            <span className="bd-toggle-name">Pre-Congreso</span>
            <span className="bd-toggle-date">12 SEP</span>
          </button>
          <button role="tab" aria-selected={eventoActivo === 'congreso'} className={`bd-toggle-seg ${eventoActivo === 'congreso' ? 'is-active' : ''}`} onClick={() => setEventoActivo('congreso')}>
            <span className="bd-toggle-name">Congreso</span>
            <span className="bd-toggle-date">31 OCT</span>
          </button>
        </div>
      </header>

      <main className="bd-main">
        {/* ================= MÉTRICAS DINÁMICAS ================= */}
        <div className="bd-metrics">
          <div className="bd-metric">
            <span className="bd-metric-label">Inscriptos</span>
            <span className="bd-metric-value">{totalInscriptos}</span>
          </div>
          <div className="bd-metric bd-metric--azul">
            <span className="bd-metric-label">Adentro</span>
            <span className="bd-metric-value">{totalAsistentes}</span>
          </div>
          <div className={`bd-metric ${ocupacionAlta ? 'bd-metric--alerta' : ''}`}>
            <span className="bd-metric-label">% Progreso</span>
            <span className="bd-metric-value">{porcentajeOcupacion}%</span>
          </div>
        </div>

        {/* ================= FILTROS Y BUSCADOR ================= */}
        <div className="bd-filterbar">
          <button className="bd-filter-toggle" onClick={() => setFiltrosAbiertos((v) => !v)}>
            Buscar / Filtrar {filtrosActivos && <span className="bd-filter-badge">1</span>}
          </button>

          <span className="bd-filter-count">{inscriptosFiltrados.length} resultado{inscriptosFiltrados.length !== 1 ? 's' : ''}</span>

          {filtrosAbiertos && (
            <div className="bd-filter-panel">
              <input type="text" placeholder="Buscar nombre o apellido…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="bd-input" />
              <div className="bd-select-wrap">
                <select value={filtroIglesia} onChange={(e) => setFiltroIglesia(e.target.value)} className="bd-select">
                  {iglesiasUnicas.map((ig) => <option key={ig} value={ig}>{ig}</option>)}
                </select>
              </div>
              {filtrosActivos && <button className="bd-clear-btn" onClick={limpiarFiltros}>Limpiar filtros</button>}
            </div>
          )}
        </div>

        {/* ================= LISTA GESTIÓN MANUAL ================= */}
        <div className="bd-list">
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

      {/* ================= ACCIONES RÁPIDAS (BOTTOM) ================= */}
      {!isScannerOpen && !scannedPerson && (
        <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', zIndex: 45, display: 'flex', gap: '10px' }}>
          <button onClick={() => setIsScannerOpen(true)} style={{ flex: 2, background: 'var(--bd-tinta)', color: 'var(--bd-crema)', border: '4px solid var(--bd-tinta)', padding: '16px', fontFamily: 'var(--bd-mono)', fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', boxShadow: '6px 6px 0 var(--bd-amarillo)' }}>
            [+] ESCANEAR QR
          </button>
          <button onClick={() => setIsModalOpen(true)} style={{ flex: 1, background: 'var(--bd-amarillo)', color: 'var(--bd-tinta)', border: '4px solid var(--bd-tinta)', padding: '16px', fontFamily: 'var(--bd-mono)', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', boxShadow: '6px 6px 0 var(--bd-tinta)' }}>
            RESCATE ✎
          </button>
        </div>
      )}

      {/* ================= CÁMARA OVERLAY ================= */}
      {isScannerOpen && (
        <div className="bd-scanner-overlay">
          <div className="bd-scanner-top">
            <span className="bd-scanner-label">{eventoActivo === 'pre' ? 'Pre-Congreso · 12 Sep' : 'Congreso · 31 Oct'}</span>
            <button className="bd-scanner-close" onClick={() => setIsScannerOpen(false)}>✕</button>
          </div>
          <div className="bd-scanner-camera">
            {/* LIBRERÍA DE ESCÁNER BLINDADA CON AMBOS EVENTOS */}
            <Scanner onScan={(result) => handleScan(result)} onResult={(text) => handleScan(text)} options={{ delayBetweenScanAttempts: 1500 }} />
            <div className="bd-scanner-frame"><span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" /></div>
          </div>
          <p className="bd-scanner-hint">Apuntá la cámara al código QR del pase</p>
        </div>
      )}

      {/* ================= MODAL MODO RESCATE ================= */}
      {isModalOpen && (
        <div className="bd-modal">
          <div className="bd-modal-header">
            <div>
              <h3>Modo rescate</h3>
              <p>Anotá al instante a quien llegó sin pase.</p>
            </div>
            <button className="bd-modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
          </div>
          <form onSubmit={handleInscripcionManual} className="bd-modal-form">
            <label className="bd-field"><span>Nombre</span><input type="text" required value={manualForm.nombre} onChange={(e) => setManualForm({ ...manualForm, nombre: e.target.value })} className="bd-input" autoFocus /></label>
            <label className="bd-field"><span>Apellido</span><input type="text" required value={manualForm.apellido} onChange={(e) => setManualForm({ ...manualForm, apellido: e.target.value })} className="bd-input" /></label>
            <label className="bd-field"><span>Iglesia</span><input type="text" required value={manualForm.iglesia} onChange={(e) => setManualForm({ ...manualForm, iglesia: e.target.value })} className="bd-input" /></label>
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