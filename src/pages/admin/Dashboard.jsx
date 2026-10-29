import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Scanner } from '@yudiel/react-qr-scanner';
import './Dashboard.css';

// ============================================================
// CONFIGURACIÓN RÁPIDA
// Cambiá a `false` cuando quieras volver a consultar el Pre-Congreso
// ============================================================
const PRE_BLOQUEADO = true;

const SWIPE_OPEN_PX = -84;
const SWIPE_TRIGGER_PX = -40;

const IGLESIAS_RAPIDAS = [
  'CONQUISTADORES DE SUEÑOS',
  'EBEN EZER',
  'CCA AMOR Y MILAGROS',
  'DIOS DE LOS EJÉRCITOS',
  'SIN IGLESIA'
];

function vibrar(pattern) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch (_) {}
  }
}

// 1. DICCIONARIO INTELIGENTE DE IGLESIAS
const normalizarIglesia = (texto) => {
  if (!texto) return 'SIN IGLESIA';
  const t = texto.toLowerCase().trim();
  
  if (t.includes('cds') || t.includes('conquistador') || t.includes('conquitador') || t.includes('sueño')) return 'CONQUISTADORES DE SUEÑOS';
  if (t.includes('eben') || t.includes('ezer')) return 'EBEN EZER';
  if (t.includes('amor y milagro') || t.includes('cca')) return 'CCA AMOR Y MILAGROS';
  if (t.includes('dios de los') || t.includes('ejército') || t.includes('ejercito')) return 'DIOS DE LOS EJÉRCITOS';
  if (t.includes('@') || t.includes('.com')) return 'SIN IGLESIA'; 
  
  const limpio = t.replace(/^(iglesia|ministerio|centro cristiano|templo)\s+/i, '').trim();
  return limpio.toUpperCase() || 'SIN IGLESIA';
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
   FILA DE INSCRIPTO CON SWIPE-TO-DELETE
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
    <div className={`bd-swipe-wrap ${asistio ? 'is-adentro-wrap' : ''}`}>
      <div className="bd-swipe-delete">
        <button className="bd-swipe-delete-btn" onClick={() => { setDragX(0); onDelete(); }}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M3 5h14M8 5V3h4v2M5 5l1 12h8l1-12" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Borrar</span>
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
          <div className="bd-row-name-wrap">
            <h4 className="bd-row-name">{persona.nombre} {persona.apellido}</h4>
            {persona.evento_origen?.includes('puerta') && (
              <span className="bd-badge-puerta">En Puerta</span>
            )}
          </div>
          <span className="bd-row-church">
            📍 {persona.iglesia}
          </span>
        </div>

        <button
          className={`bd-toggle-btn ${asistio ? 'is-adentro' : ''}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); vibrar(15); onToggle(); }}
        >
          {asistio ? '✅ ADENTRO' : 'INGRESAR →'}
        </button>
      </div>
    </div>
  );
});

export default function Dashboard() {
  const navigate = useNavigate();

  const [inscriptos, setInscriptos] = useState([]);
  const [eventoActivo, setEventoActivo] = useState('congreso'); 
  
  // Modos de operación: 'control' (Lista y Escáner) | 'kiosco' (Pantalla completa solo para inscribir rápido)
  const [modoVista, setModoVista] = useState('control');

  // Estados de Búsqueda y Filtros Avanzados
  const [busqueda, setBusqueda] = useState('');
  const [filtroIglesia, setFiltroIglesia] = useState('TODAS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS'); // 'TODOS' | 'PENDIENTES' | 'ADENTRO'
  const [ordenPor, setOrdenPor] = useState('AZ'); // 'AZ' | 'IGLESIA' | 'PENDIENTES_PRIMERO'

  // Estados del Escáner QR
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [ultimoEscaneo, setUltimoEscaneo] = useState('');
  const [scannedPerson, setScannedPerson] = useState(null);
  const [scanResult, setScanResult] = useState(null); 

  // Estados de Inscripción Rápida (Modal y Modo Kiosco)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ nombre: '', apellido: '', iglesia: '' });
  const [mantenerIglesia, setMantenerIglesia] = useState(true);
  const [recientesKiosco, setRecientesKiosco] = useState([]);
  const [toastKiosco, setToastKiosco] = useState(null);
  const [guardandoManual, setGuardandoManual] = useState(false);
  const nombreKioscoRef = useRef(null);

  const coleccionActual = eventoActivo === 'pre' ? 'inscriptos' : 'inscriptos_congreso';

  useEffect(() => {
    setInscriptos([]);
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

  const cambiarPestanaEvento = (nuevoEvento) => {
    if (nuevoEvento === 'pre' && PRE_BLOQUEADO) {
      vibrar([30, 50, 30]);
      return;
    }
    setEventoActivo(nuevoEvento);
  };

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
      setScanResult({ type: 'error', msg: 'QR NO ENCONTRADO', sub: 'No figura en la base del Congreso' });
      setTimeout(() => { setScanResult(null); setUltimoEscaneo(''); }, 2200);
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
    }, 1300);
  };

  const eliminarInscripto = async (id, nombre) => {
    if (window.confirm(`¿Eliminar a ${nombre} de la lista? Esta acción no se puede deshacer.`)) {
      try { await deleteDoc(doc(db, coleccionActual, id)); } 
      catch (error) { alert('Error al eliminar el registro.'); }
    }
  };

  // INSCRIPCIÓN RÁPIDA CONTINUA (Funciona tanto en Modo Puesto como en Modal)
  const handleInscripcionManual = async (e) => {
    e.preventDefault();
    if (!manualForm.nombre.trim() || !manualForm.apellido.trim()) return;

    setGuardandoManual(true);
    const nombreLimpio = manualForm.nombre.trim();
    const apellidoLimpio = manualForm.apellido.trim();
    const iglesiaLimpia = normalizarIglesia(manualForm.iglesia || 'SIN IGLESIA');

    try {
      await addDoc(collection(db, coleccionActual), {
        nombre: nombreLimpio,
        apellido: apellidoLimpio,
        iglesia: iglesiaLimpia,
        email: 'inscripcion_puerta@iceb.com',
        edad: 0,
        fechaInscripcion: serverTimestamp(),
        asistio_pre: eventoActivo === 'pre',
        asistio_congreso: eventoActivo === 'congreso',
        evento_origen: eventoActivo === 'pre' ? 'puerta_pre' : 'puerta_congreso',
      });

      vibrar(50);

      // Guardamos en el historial reciente de este dispositivo
      const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setRecientesKiosco(prev => [
        { nombre: nombreLimpio, apellido: apellidoLimpio, iglesia: iglesiaLimpia, hora: horaActual },
        ...prev.slice(0, 4)
      ]);

      // Limpiamos nombre y apellido, pero conservamos iglesia si el tilde está activo
      setManualForm({
        nombre: '',
        apellido: '',
        iglesia: mantenerIglesia ? manualForm.iglesia : ''
      });

      if (modoVista === 'kiosco') {
        setToastKiosco(`✅ ${nombreLimpio} ${apellidoLimpio} inscripto y adentro`);
        setTimeout(() => setToastKiosco(null), 2500);
        // Devolvemos el foco al input de Nombre inmediatamente para anotar al siguiente
        setTimeout(() => nombreKioscoRef.current?.focus(), 40);
      } else {
        setIsModalOpen(false);
        setScanResult({ type: 'success', msg: 'INSCRIPTO Y ADENTRO', sub: `${nombreLimpio} ${apellidoLimpio}` });
        setTimeout(() => setScanResult(null), 1400);
      }
    } catch (error) {
      alert('Error guardando la inscripción. Revisá tu conexión.');
    } finally {
      setGuardandoManual(false);
    }
  };

  // Estadísticas y Contadores
  const totalInscriptos = inscriptos.length;
  const totalAsistentes = useMemo(() => 
    inscriptos.filter((p) => (eventoActivo === 'pre' ? p.asistio_pre : p.asistio_congreso)).length
  , [inscriptos, eventoActivo]);
  const totalPendientes = totalInscriptos - totalAsistentes;
  const capacidadMax = totalInscriptos === 0 ? 1 : totalInscriptos; 
  const porcentajeOcupacion = Math.min(Number(((totalAsistentes / capacidadMax) * 100).toFixed(1)), 100);

  const iglesiasUnicas = useMemo(() => {
    const lista = inscriptos.map((p) => p.iglesia);
    return ['TODAS', ...new Set(lista)].sort();
  }, [inscriptos]);

  // FILTRADO AVANZADO Y ORDENAMIENTO
  const inscriptosFiltrados = useMemo(() => {
    const terminos = busqueda.toLowerCase().trim().split(/\s+/).filter(Boolean);

    const filtrados = inscriptos.filter((persona) => {
      const asistio = eventoActivo === 'pre' ? persona.asistio_pre : persona.asistio_congreso;

      // 1. Filtro por Estado (Todos / Pendientes / Adentro)
      if (filtroEstado === 'PENDIENTES' && asistio) return false;
      if (filtroEstado === 'ADENTRO' && !asistio) return false;

      // 2. Filtro por Iglesia
      if (filtroIglesia !== 'TODAS' && persona.iglesia !== filtroIglesia) return false;

      // 3. Búsqueda inteligente (permite buscar nombre + apellido + iglesia)
      if (terminos.length > 0) {
        const textoCompleto = `${persona.nombre || ''} ${persona.apellido || ''} ${persona.iglesia || ''}`.toLowerCase();
        const coincideTodo = terminos.every(termino => textoCompleto.includes(termino));
        if (!coincideTodo) return false;
      }

      return true;
    });

    // 4. Ordenamiento
    return filtrados.sort((a, b) => {
      const asistioA = eventoActivo === 'pre' ? a.asistio_pre : a.asistio_congreso;
      const asistioB = eventoActivo === 'pre' ? b.asistio_pre : b.asistio_congreso;
      const nombreA = `${a.nombre || ''} ${a.apellido || ''}`.trim().toLowerCase();
      const nombreB = `${b.nombre || ''} ${b.apellido || ''}`.trim().toLowerCase();

      if (ordenPor === 'PENDIENTES_PRIMERO') {
        if (asistioA !== asistioB) return asistioA ? 1 : -1;
      } else if (ordenPor === 'IGLESIA') {
        const cmpIglesia = (a.iglesia || '').localeCompare(b.iglesia || '');
        if (cmpIglesia !== 0) return cmpIglesia;
      }
      return nombreA.localeCompare(nombreB);
    });
  }, [inscriptos, busqueda, filtroIglesia, filtroEstado, ordenPor, eventoActivo]);

  const hayFiltrosActivos = busqueda.trim() !== '' || filtroIglesia !== 'TODAS' || filtroEstado !== 'TODOS';

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroIglesia('TODAS');
    setFiltroEstado('TODOS');
    setOrdenPor('AZ');
  };

  const scannedPersonYaIngreso = scannedPerson ? (eventoActivo === 'pre' ? scannedPerson.asistio_pre : scannedPerson.asistio_congreso) : false;

  return (
    <div className="bd-root">
      {/* PANTALLA DE VALIDACIÓN DE QR ESCANEADO */}
      {scannedPerson && (
        <div className="bd-scan-validation">
          <div className={`bd-scan-val-header ${scannedPersonYaIngreso ? 'is-danger' : 'is-primary'}`}>
            <h3>{scannedPersonYaIngreso ? '⚠️ PASE YA ESCANEADO' : '✓ PASE VÁLIDO'}</h3>
            <button onClick={() => { setScannedPerson(null); setUltimoEscaneo(''); setIsScannerOpen(true); }}>✕</button>
          </div>
          
          <div className="bd-scan-val-body">
            <span className="bd-scan-val-tag">CONGRESO BRILLANDO</span>
            <h2 className="bd-scan-val-name">
              {scannedPerson.nombre} <br/> {scannedPerson.apellido}
            </h2>
            <p className="bd-scan-val-church">📍 {scannedPerson.iglesia}</p>

            {scannedPersonYaIngreso ? (
              <div className="bd-scan-val-alert">
                ❌ ESTA PERSONA YA INGRESÓ ANTES
              </div>
            ) : (
              <button onClick={confirmarIngreso} className="bd-scan-val-confirm">
                CONFIRMAR INGRESO AHORA →
              </button>
            )}

            <button onClick={() => { setScannedPerson(null); setUltimoEscaneo(''); setIsScannerOpen(true); }} className="bd-scan-val-back">
              ← Volver a la cámara
            </button>
          </div>
        </div>
      )}

      {/* FLASH DE ÉXITO O ERROR */}
      {scanResult && (
        <div className={`bd-flash bd-flash--${scanResult.type}`} role="alert">
          <svg className="bd-flash-icon" width="72" height="72" viewBox="0 0 72 72" fill="none" aria-hidden="true">
            {scanResult.type === 'success' ? (
              <path d="M14 38l14 14L58 20" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M20 20l32 32M52 20L20 52" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" />
            )}
          </svg>
          <h1 className="bd-flash-title">{scanResult.msg}</h1>
          {scanResult.sub && <p className="bd-flash-sub">{scanResult.sub}</p>}
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <header className="bd-header">
        <div className="bd-header-container">
          <div className="bd-header-top">
            <button className="bd-back" onClick={() => navigate('/')}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L4 8l6 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Salir a la web
            </button>
            <div className="bd-live">
              <span className="bd-live-dot" /> 
              Sincronizado en vivo
            </div>
          </div>

          <div className="bd-title-row">
            <h1 className="bd-title">Acceso Brillando</h1>
            
            {/* TABS DE EVENTO (CON PRE-CONGRESO BLOQUEADO) */}
            <div className="bd-event-tabs">
              <button 
                type="button"
                disabled={PRE_BLOQUEADO}
                className={`bd-event-tab ${eventoActivo === 'pre' ? 'is-active' : ''} ${PRE_BLOQUEADO ? 'is-locked' : ''}`}
                onClick={() => cambiarPestanaEvento('pre')}
                title={PRE_BLOQUEADO ? 'El Pre-Congreso está bloqueado' : 'Ver Pre-Congreso'}
              >
                <span>{PRE_BLOQUEADO ? '🔒 Pre-Congreso' : 'Pre-Congreso'}</span>
                <small>12 SEP · CERRADO</small>
              </button>
              <button 
                type="button"
                className={`bd-event-tab ${eventoActivo === 'congreso' ? 'is-active' : ''}`}
                onClick={() => cambiarPestanaEvento('congreso')}
              >
                <span>Congreso Oficial</span>
                <small>31 OCT · ACTIVO</small>
              </button>
            </div>
          </div>

          {/* SELECTOR DE MODO DE TRABAJO PARA COLABORADORES */}
          <div className="bd-mode-switcher">
            <button 
              type="button" 
              className={`bd-mode-btn ${modoVista === 'control' ? 'is-active' : ''}`}
              onClick={() => setModoVista('control')}
            >
              📋 Control de Puerta y Lista
            </button>
            <button 
              type="button" 
              className={`bd-mode-btn ${modoVista === 'kiosco' ? 'is-active' : ''}`}
              onClick={() => {
                setModoVista('kiosco');
                setTimeout(() => nombreKioscoRef.current?.focus(), 80);
              }}
            >
              ⚡ Puesto de Inscripción Rápida
            </button>
          </div>
        </div>
      </header>

      <main className="bd-main">
        {/* TARJETAS DE MÉTRICAS */}
        <div className="bd-metrics">
          <div className="bd-metric">
            <span className="bd-metric-label">Total Inscriptos</span>
            <span className="bd-metric-value">{totalInscriptos}</span>
            <span className="bd-metric-sub">En lista</span>
          </div>
          <div className="bd-metric bd-metric--verde">
            <span className="bd-metric-label">Adentro</span>
            <span className="bd-metric-value">{totalAsistentes}</span>
            <span className="bd-metric-sub">{porcentajeOcupacion}% ingresó</span>
          </div>
          <div className="bd-metric bd-metric--pendiente">
            <span className="bd-metric-label">Faltan Entrar</span>
            <span className="bd-metric-value">{totalPendientes}</span>
            <span className="bd-metric-sub">Pendientes</span>
          </div>
        </div>

        {/* ============================================================
            MODO 1: PUESTO DE INSCRIPCIÓN EN PANTALLA GRANDE (CONTINUO)
            ============================================================ */}
        {modoVista === 'kiosco' ? (
          <section className="bd-kiosco-wrap">
            {toastKiosco && (
              <div className="bd-kiosco-toast">
                {toastKiosco}
              </div>
            )}

            <div className="bd-kiosco-card">
              <div className="bd-kiosco-head">
                <div>
                  <span className="bd-kiosco-badge">MODO CONTINUO · 1 CLIC</span>
                  <h2>Inscribir e Ingresar Ahora</h2>
                  <p>Cada persona que anotes acá queda registrada en el Congreso y marcada como <b>ADENTRO</b> automáticamente.</p>
                </div>
              </div>

              <form onSubmit={handleInscripcionManual} className="bd-kiosco-form">
                <div className="bd-kiosco-grid">
                  <label className="bd-field">
                    <span>1. Nombre *</span>
                    <input 
                      ref={nombreKioscoRef}
                      type="text" 
                      placeholder="Ej: Mateo" 
                      required 
                      value={manualForm.nombre} 
                      onChange={(e) => setManualForm({ ...manualForm, nombre: e.target.value })} 
                      className="bd-input bd-input--lg" 
                      autoFocus 
                    />
                  </label>

                  <label className="bd-field">
                    <span>2. Apellido *</span>
                    <input 
                      type="text" 
                      placeholder="Ej: González" 
                      required 
                      value={manualForm.apellido} 
                      onChange={(e) => setManualForm({ ...manualForm, apellido: e.target.value })} 
                      className="bd-input bd-input--lg" 
                    />
                  </label>
                </div>

                <div className="bd-field">
                  <div className="bd-field-header">
                    <span>3. Iglesia o Ministerio *</span>
                    <label className="bd-keep-church">
                      <input 
                        type="checkbox" 
                        checked={mantenerIglesia} 
                        onChange={(e) => setMantenerIglesia(e.target.checked)} 
                      />
                      Mantener iglesia para el próximo
                    </label>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Escribí la iglesia o tocá un botón rápido abajo..." 
                    required 
                    value={manualForm.iglesia} 
                    onChange={(e) => setManualForm({ ...manualForm, iglesia: e.target.value })} 
                    className="bd-input bd-input--lg" 
                  />
                  
                  {/* BOTONES RÁPIDOS DE IGLESIA */}
                  <div className="bd-quick-churches">
                    {IGLESIAS_RAPIDAS.map((ig) => (
                      <button
                        key={ig}
                        type="button"
                        className={`bd-quick-chip ${manualForm.iglesia.toUpperCase() === ig ? 'is-selected' : ''}`}
                        onClick={() => setManualForm({ ...manualForm, iglesia: ig })}
                      >
                        {ig}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={guardandoManual} className="bd-kiosco-submit">
                  {guardandoManual ? 'GUARDANDO...' : '✚ INSCRIBIR Y DAR INGRESO (ENTER) →'}
                </button>
              </form>
            </div>

            {/* HISTORIAL DE LOS ÚLTIMOS INSCRIPTOS EN ESTE PUESTO */}
            {recientesKiosco.length > 0 && (
              <div className="bd-kiosco-recent">
                <h4>Últimos ingresados desde este puesto:</h4>
                <div className="bd-kiosco-recent-list">
                  {recientesKiosco.map((item, idx) => (
                    <div key={idx} className="bd-kiosco-recent-item">
                      <span><b>{item.nombre} {item.apellido}</b> · {item.iglesia}</span>
                      <span className="bd-kiosco-time">✅ {item.hora}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        ) : (
          /* ============================================================
             MODO 2: CONTROL DE LISTA Y FILTROS AVANZADOS
             ============================================================ */
          <>
            <section className="bd-search-card">
              {/* Barra de búsqueda con botón de borrado rápido */}
              <div className="bd-search-input-wrap">
                <span className="bd-search-icon">🔍</span>
                <input 
                  type="text" 
                  placeholder="Buscar por nombre, apellido o iglesia..." 
                  value={busqueda} 
                  onChange={(e) => setBusqueda(e.target.value)} 
                  className="bd-search-input" 
                />
                {busqueda && (
                  <button type="button" className="bd-search-clear" onClick={() => setBusqueda('')}>
                    ✕
                  </button>
                )}
              </div>

              {/* Píldoras de Filtro por Estado */}
              <div className="bd-status-pills">
                <button 
                  type="button" 
                  className={`bd-pill ${filtroEstado === 'TODOS' ? 'is-active' : ''}`}
                  onClick={() => setFiltroEstado('TODOS')}
                >
                  Todos ({totalInscriptos})
                </button>
                <button 
                  type="button" 
                  className={`bd-pill ${filtroEstado === 'PENDIENTES' ? 'is-active' : ''}`}
                  onClick={() => setFiltroEstado('PENDIENTES')}
                >
                  ⏳ Faltan entrar ({totalPendientes})
                </button>
                <button 
                  type="button" 
                  className={`bd-pill ${filtroEstado === 'ADENTRO' ? 'is-active' : ''}`}
                  onClick={() => setFiltroEstado('ADENTRO')}
                >
                  ✅ Ya adentro ({totalAsistentes})
                </button>
              </div>

              {/* Selectores de Iglesia y Orden */}
              <div className="bd-filters-row">
                <div className="bd-select-box">
                  <label>Filtrar por Iglesia</label>
                  <select value={filtroIglesia} onChange={(e) => setFiltroIglesia(e.target.value)} className="bd-select">
                    {iglesiasUnicas.map((ig) => (
                      <option key={ig} value={ig}>{ig === 'TODAS' ? '📍 Todas las iglesias' : ig}</option>
                    ))}
                  </select>
                </div>

                <div className="bd-select-box">
                  <label>Ordenar lista por</label>
                  <select value={ordenPor} onChange={(e) => setOrdenPor(e.target.value)} className="bd-select">
                    <option value="AZ">🔤 Alfabético (A - Z)</option>
                    <option value="PENDIENTES_PRIMERO">⏳ Pendientes primero</option>
                    <option value="IGLESIA">⛪ Agrupar por Iglesia</option>
                  </select>
                </div>
              </div>

              {/* Resumen de resultados */}
              <div className="bd-results-bar">
                <span>
                  Mostrando <b>{inscriptosFiltrados.length}</b> de {totalInscriptos} personas
                </span>
                {hayFiltrosActivos && (
                  <button type="button" className="bd-reset-filters" onClick={limpiarFiltros}>
                    Restablecer filtros ↺
                  </button>
                )}
              </div>
            </section>

            {/* LISTA DE INSCRIPTOS */}
            <div className="bd-list">
              {inscriptosFiltrados.length === 0 ? (
                <div className="bd-empty">
                  <p>No encontramos a nadie con esos filtros.</p>
                  <div className="bd-empty-actions">
                    {hayFiltrosActivos && (
                      <button type="button" className="bd-btn bd-btn--ghost" onClick={limpiarFiltros}>
                        Ver toda la lista
                      </button>
                    )}
                    <button 
                      type="button" 
                      className="bd-btn bd-btn--amarillo" 
                      onClick={() => {
                        setManualForm({ ...manualForm, nombre: busqueda.trim() });
                        setIsModalOpen(true);
                      }}
                    >
                      ✚ Inscribir a "{busqueda || 'nueva persona'}" ahora
                    </button>
                  </div>
                </div>
              ) : (
                inscriptosFiltrados.map((persona) => {
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
                })
              )}
            </div>
          </>
        )}
      </main>

      {/* BARRA INFERIOR FLOTANTE (Solo visible en modo Control de Lista) */}
      {modoVista === 'control' && !isScannerOpen && !scannedPerson && (
        <div className="bd-bottom-bar">
          <div className="bd-bottom-bar-inner">
            <button onClick={() => setIsScannerOpen(true)} className="bd-action-qr">
              📷 ESCANEAR QR
            </button>
            <button onClick={() => setIsModalOpen(true)} className="bd-action-manual">
              ✚ INSCRIBIR AHORA
            </button>
          </div>
        </div>
      )}

      {/* CÁMARA ESCÁNER QR */}
      {isScannerOpen && (
        <div className="bd-scanner-overlay">
          <div className="bd-scanner-top">
            <span className="bd-scanner-label">Escáner Activo · Congreso 31 Oct</span>
            <button className="bd-scanner-close" onClick={() => setIsScannerOpen(false)}>✕ Cerrar</button>
          </div>
          <div className="bd-scanner-camera">
            <Scanner onScan={(result) => handleScan(result)} onResult={(text) => handleScan(text)} options={{ delayBetweenScanAttempts: 1200 }} />
            <div className="bd-scanner-frame"><span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" /></div>
          </div>
          <p className="bd-scanner-hint">Apuntá la cámara al código QR del celular o impreso</p>
        </div>
      )}

      {/* MODAL RÁPIDO DESDE LA LISTA */}
      {isModalOpen && (
        <div className="bd-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="bd-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="bd-modal-header">
              <div>
                <h3>✚ Inscribir e Ingresar</h3>
                <p>Se anotará en el Congreso y quedará marcado como <b>ADENTRO</b>.</p>
              </div>
              <button className="bd-modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleInscripcionManual} className="bd-modal-form">
              <label className="bd-field">
                <span>Nombre *</span>
                <input type="text" placeholder="Ej: Mateo" required value={manualForm.nombre} onChange={(e) => setManualForm({ ...manualForm, nombre: e.target.value })} className="bd-input" autoFocus />
              </label>
              <label className="bd-field">
                <span>Apellido *</span>
                <input type="text" placeholder="Ej: González" required value={manualForm.apellido} onChange={(e) => setManualForm({ ...manualForm, apellido: e.target.value })} className="bd-input" />
              </label>
              <div className="bd-field">
                <span>Iglesia *</span>
                <input type="text" placeholder="Nombre de su iglesia" required value={manualForm.iglesia} onChange={(e) => setManualForm({ ...manualForm, iglesia: e.target.value })} className="bd-input" />
                <div className="bd-quick-churches">
                  {IGLESIAS_RAPIDAS.map((ig) => (
                    <button
                      key={ig}
                      type="button"
                      className={`bd-quick-chip ${manualForm.iglesia.toUpperCase() === ig ? 'is-selected' : ''}`}
                      onClick={() => setManualForm({ ...manualForm, iglesia: ig })}
                    >
                      {ig}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bd-modal-actions">
                <button type="button" className="bd-btn bd-btn--ghost" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" disabled={guardandoManual} className="bd-btn bd-btn--verde">
                  {guardandoManual ? 'Guardando...' : 'Inscribir e Ingresar ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}