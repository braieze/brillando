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

// 1. DICCIONARIO INTELIGENTE DE IGLESIAS (MEJORADO)
const normalizarIglesia = (texto) => {
  if (!texto) return 'SIN IGLESIA';
  const t = texto.toLowerCase().trim();
  
  // Atrapa variaciones, faltas de ortografía y agregados como "Ministerio"
  if (t.includes('cds') || t.includes('conquistador') || t.includes('conquitador') || t.includes('sueño')) return 'CONQUISTADORES DE SUEÑOS';
  if (t.includes('eben') || t.includes('ezer')) return 'EBEN EZER';
  if (t.includes('amor y milagro') || t.includes('cca')) return 'CCA AMOR Y MILAGROS';
  if (t.includes('dios de los') || t.includes('ejército') || t.includes('ejercito')) return 'DIOS DE LOS EJÉRCITOS';
  if (t.includes('@') || t.includes('.com')) return 'SIN IGLESIA'; 
  
  // Limpia prefijos comunes para agrupar las que quedaron sueltas
  const limpio = t.replace(/^(iglesia|ministerio|centro cristiano|templo)\s+/i, '').trim();
  return limpio.toUpperCase();
};

// 2. UNIFICADOR EN MEMORIA DE DUPLICADOS
const unificarDuplicados = (lista) => {
  const unicos = new Map();
  lista.forEach(persona => {
    const key = `${persona.nombre?.trim().toLowerCase()}-${persona.apellido?.trim().toLowerCase()}`;
    
    if (!unicos.has(key)) {
      unicos.set(key, persona);
    } else {
      const existente = unicos.get(key);
      if (persona.asistio_pre) existente.asistio_pre = true;
      if (persona.asistio_congreso) existente.asistio_congreso = true;
    }
  });
  return Array.from(unicos.values());
};

/* ============================================================
   FILA CON SWIPE-TO-DELETE Y FEEDBACK VISUAL CLARO
   ============================================================ */
const FilaInscripto = React.memo(({ persona, asistio, onToggle, onDelete }) => {
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
            📍 {persona.iglesia}
          </span>
        </div>

        <button
          className={`bd-toggle-btn ${asistio ? 'is-adentro' : ''}`}
          style={asistio ? { backgroundColor: '#16a34a', color: '#ffffff', borderColor: 'var(--bd-tinta)', fontWeight: 'bold' } : {}}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); vibrar(15); onToggle(); }}
        >
          {asistio ? '✅ ADENTRO' : 'INGRESAR'}
        </button>
      </div>
    </div>
  );
});

export default function Dashboard() {
  const navigate = useNavigate();

  const [inscriptos, setInscriptos] = useState([]);
  // Inicia por defecto en 'congreso' para el evento principal del 31 de Octubre
  const [eventoActivo, setEventoActivo] = useState('congreso'); 
  const [busqueda, setBusqueda] = useState('');
  const [filtroIglesia, setFiltroIglesia] = useState('TODAS');

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [ultimoEscaneo, setUltimoEscaneo] = useState('');
  const [scannedPerson, setScannedPerson] = useState(null);
  const [scanResult, setScanResult] = useState(null); 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ nombre: '', apellido: '', iglesia: '' });

  // Determina dinámicamente qué colección de Firebase leer y modificar
  const coleccionActual = eventoActivo === 'pre' ? 'inscriptos' : 'inscriptos_congreso';

  useEffect(() => {
    setInscriptos([]); // Limpia la lista visualmente al cambiar de pestaña
    const inscriptosRef = collection(db, coleccionActual);
    const unsubscribe = onSnapshot(inscriptosRef, (snapshot) => {
      const rawData = snapshot.docs.map((d) => ({ 
        id: d.id, 
        ...d.data(),
        iglesia: normalizarIglesia(d.data().iglesia) 
      }));
      
      const cleanData = unificarDuplicados(rawData); 
      setInscriptos(cleanData);
    });
    return () => unsubscribe();
  }, [coleccionActual]);

  const marcarAsistencia = async (id, estadoActual) => {
    try {
      const inscriptoRef = doc(db, coleccionActual, id);
      const campoAsistencia = eventoActivo === 'pre' ? 'asistio_pre' : 'asistio_congreso';
      await updateDoc(inscriptoRef, { [campoAsistencia]: !estadoActual });
    } catch (error) {
      console.error('Error al actualizar asistencia:', error);
    }
  };

  const handleScan = (rawData) => {
    if (!rawData) return;

    let textoQR = "";
    if (typeof rawData === 'string') {
      textoQR = rawData;
    } else if (Array.isArray(rawData) && rawData.length > 0) {
      textoQR = rawData[0].rawValue;
    } else if (rawData.text || rawData.rawValue) {
      textoQR = rawData.text || rawData.rawValue;
    }

    if (!textoQR) return;
    textoQR = textoQR.trim(); 

    if (textoQR === ultimoEscaneo) return;
    setUltimoEscaneo(textoQR);

    const persona = inscriptos.find((i) => i.id === textoQR);

    if (persona) {
      vibrar(60);
      setScannedPerson(persona);
      setIsScannerOpen(false); 
    } else {
      vibrar([40, 60, 40]);
      alert(`El escáner leyó:\n"${textoQR}"\n\nNo figura en la lista de ${eventoActivo === 'pre' ? 'Pre-Congreso' : 'Congreso'}.`);
      setScanResult({ type: 'error', msg: 'NO ENCONTRADO', sub: 'No registrado en este evento' });
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

  const eliminarInscripto = async (id, nombre) => {
    if (window.confirm(`¿Eliminar a ${nombre} de la lista? Esta acción no se puede deshacer.`)) {
      try { await deleteDoc(doc(db, coleccionActual, id)); } 
      catch (error) { alert('Error al eliminar el registro.'); }
    }
  };

  const handleInscripcionManual = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, coleccionActual), {
        nombre: manualForm.nombre.trim(),
        apellido: manualForm.apellido.trim(),
        iglesia: normalizarIglesia(manualForm.iglesia),
        email: 'inscripcion_puerta@iceb.com',
        edad: 0,
        fechaInscripcion: serverTimestamp(),
        asistio_pre: eventoActivo === 'pre',
        asistio_congreso: eventoActivo === 'congreso',
        evento_origen: eventoActivo === 'pre' ? 'puerta_pre' : 'congreso',
      });
      setIsModalOpen(false);
      setManualForm({ nombre: '', apellido: '', iglesia: '' });
      vibrar(60);
      setScanResult({ type: 'success', msg: 'INSCRIPTO Y ADENTRO', sub: `${manualForm.nombre} ${manualForm.apellido}` });
      setTimeout(() => setScanResult(null), 1500);
    } catch (error) {
      alert('Error guardando la inscripción manual.');
    }
  };

  const iglesiasUnicas = useMemo(() => {
    const lista = inscriptos.map((p) => p.iglesia);
    return ['TODAS', ...new Set(lista)].sort();
  }, [inscriptos]);

  // RENDIMIENTO: Filtrado y ORDEN ALFABÉTICO combinados
  const inscriptosFiltrados = useMemo(() => {
    const textoBuscado = busqueda.toLowerCase();
    const filtrados = inscriptos.filter((persona) => {
      const coincideTexto = persona.nombre?.toLowerCase().includes(textoBuscado) || persona.apellido?.toLowerCase().includes(textoBuscado);
      const coincideIglesia = filtroIglesia === 'TODAS' || persona.iglesia === filtroIglesia;
      return coincideTexto && coincideIglesia;
    });

    // Se ordena alfabéticamente de A-Z
    return filtrados.sort((a, b) => {
      const nombreA = `${a.nombre || ''} ${a.apellido || ''}`.trim().toLowerCase();
      const nombreB = `${b.nombre || ''} ${b.apellido || ''}`.trim().toLowerCase();
      return nombreA.localeCompare(nombreB);
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
    <div className="bd-root" style={{ paddingBottom: '100px' }}>
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
              <button onClick={confirmarIngreso} style={{ background: 'var(--bd-amarillo)', color: 'var(--bd-tinta)', padding: '25px', border: '5px solid var(--bd-tinta)', fontWeight: 'bold', fontSize: '24px', fontFamily: 'var(--bd-display)', textTransform: 'uppercase', width: '100%', boxShadow: '8px 8px 0 var(--bd-tinta)', cursor: 'pointer' }}>
                CONFIRMAR INGRESO →
              </button>
            )}

            <button onClick={() => { setScannedPerson(null); setUltimoEscaneo(''); setIsScannerOpen(true); }} style={{ marginTop: '30px', padding: '15px', background: 'transparent', border: '3px solid var(--bd-tinta)', fontWeight: 'bold', fontSize: '16px', fontFamily: 'var(--bd-mono)', textTransform: 'uppercase', color: 'var(--bd-tinta)', cursor: 'pointer' }}>
              ← ESCANEAR OTRO PASE
            </button>
          </div>
        </div>
      )}

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

        {/* BUSCADOR SIEMPRE VISIBLE PARA AGILIZAR LA FILA */}
        <div className="bd-filterbar" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          <div className="bd-filter-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', padding: '15px', background: 'rgba(0,0,0,0.03)', border: '3px solid var(--bd-tinta)' }}>
            <input 
              type="text" 
              placeholder="🔍 Buscar por nombre o apellido..." 
              value={busqueda} 
              onChange={(e) => setBusqueda(e.target.value)} 
              className="bd-input" 
              style={{ fontSize: '16px', padding: '12px' }}
            />
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="bd-select-wrap" style={{ flex: 1, minWidth: '200px' }}>
                <select value={filtroIglesia} onChange={(e) => setFiltroIglesia(e.target.value)} className="bd-select" style={{ width: '100%' }}>
                  {iglesiasUnicas.map((ig) => <option key={ig} value={ig}>{ig === 'TODAS' ? '📍 Todas las iglesias' : ig}</option>)}
                </select>
              </div>
              {filtrosActivos && (
                <button className="bd-clear-btn" onClick={limpiarFiltros} style={{ padding: '10px 15px', cursor: 'pointer' }}>
                  ✕ Limpiar
                </button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
            <span className="bd-filter-count" style={{ fontWeight: 'bold' }}>
              Mostrando {inscriptosFiltrados.length} persona{inscriptosFiltrados.length !== 1 ? 's' : ''}
            </span>
            <span style={{ fontFamily: 'var(--bd-mono)', fontSize: '12px', opacity: 0.7 }}>
              Base activa: {eventoActivo === 'pre' ? 'PRE-CONGRESO' : 'CONGRESO 31 OCT'}
            </span>
          </div>
        </div>

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

      {/* BOTONES INFERIORES INTUITIVOS PARA COLABORADORES */}
      {!isScannerOpen && !scannedPerson && (
        <div style={{ position: 'fixed', bottom: '20px', left: '20px', right: '20px', zIndex: 45, display: 'flex', gap: '12px', maxWidth: '800px', margin: '0 auto' }}>
          <button 
            onClick={() => setIsScannerOpen(true)} 
            style={{ flex: 1.4, background: 'var(--bd-tinta)', color: 'var(--bd-crema)', border: '4px solid var(--bd-tinta)', padding: '18px 14px', fontFamily: 'var(--bd-mono)', fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', boxShadow: '6px 6px 0 var(--bd-amarillo)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            📷 ESCANEAR QR
          </button>
          <button 
            onClick={() => setIsModalOpen(true)} 
            style={{ flex: 1, background: 'var(--bd-amarillo)', color: 'var(--bd-tinta)', border: '4px solid var(--bd-tinta)', padding: '18px 14px', fontFamily: 'var(--bd-mono)', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', boxShadow: '6px 6px 0 var(--bd-tinta)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            ✚ INSCRIBIR AHORA
          </button>
        </div>
      )}

      {isScannerOpen && (
        <div className="bd-scanner-overlay">
          <div className="bd-scanner-top">
            <span className="bd-scanner-label">{eventoActivo === 'pre' ? 'Pre-Congreso · 12 Sep' : 'Congreso · 31 Oct'}</span>
            <button className="bd-scanner-close" onClick={() => setIsScannerOpen(false)}>✕</button>
          </div>
          <div className="bd-scanner-camera">
            <Scanner onScan={(result) => handleScan(result)} onResult={(text) => handleScan(text)} options={{ delayBetweenScanAttempts: 1500 }} />
            <div className="bd-scanner-frame"><span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" /></div>
          </div>
          <p className="bd-scanner-hint">Apuntá la cámara al código QR del pase</p>
        </div>
      )}

      {isModalOpen && (
        <div className="bd-modal">
          <div className="bd-modal-header">
            <div>
              <h3>Inscripción Rápida en Puerta</h3>
              <p>Anotá e ingresá al instante a quien llegó sin QR ({eventoActivo === 'pre' ? 'Pre-Congreso' : 'Congreso'}).</p>
            </div>
            <button className="bd-modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
          </div>
          <form onSubmit={handleInscripcionManual} className="bd-modal-form">
            <label className="bd-field">
              <span>Nombre</span>
              <input type="text" placeholder="Ej: Mateo" required value={manualForm.nombre} onChange={(e) => setManualForm({ ...manualForm, nombre: e.target.value })} className="bd-input" autoFocus />
            </label>
            <label className="bd-field">
              <span>Apellido</span>
              <input type="text" placeholder="Ej: González" required value={manualForm.apellido} onChange={(e) => setManualForm({ ...manualForm, apellido: e.target.value })} className="bd-input" />
            </label>
            <label className="bd-field">
              <span>Iglesia</span>
              <input type="text" placeholder="Nombre de su iglesia o 'Sin iglesia'" required value={manualForm.iglesia} onChange={(e) => setManualForm({ ...manualForm, iglesia: e.target.value })} className="bd-input" />
            </label>
            <div className="bd-modal-actions">
              <button type="button" className="bd-btn bd-btn--ghost" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button type="submit" className="bd-btn bd-btn--azul">Inscribir e Ingresar ✓</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}