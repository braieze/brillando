import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function Dashboard() {
  const navigate = useNavigate();
  
  // 1. Estados Centrales
  const [inscriptos, setInscriptos] = useState([]);
  const [eventoActivo, setEventoActivo] = useState('pre'); // 'pre' | 'congreso'
  
  // 2. Estados de Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroIglesia, setFiltroIglesia] = useState('TODAS');
  
  // 3. Estados de Escáner y Validación
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [ultimoEscaneo, setUltimoEscaneo] = useState('');
  const [scanResult, setScanResult] = useState(null); // { type: 'success' | 'error', msg: '' }
  
  // 4. Estados de Modo Rescate
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ nombre: '', apellido: '', iglesia: '' });

  // Capacidades de los auditorios para medir ocupación
  const CAPACIDAD_PRE = 600; // Capacidad Auditorio CDS
  const CAPACIDAD_CONGRESO = 2500; // Capacidad De Vicenzo

  // --- CONEXIÓN EN VIVO ---
  useEffect(() => {
    const inscriptosRef = collection(db, "inscriptos");
    const unsubscribe = onSnapshot(inscriptosRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInscriptos(data);
    });
    return () => unsubscribe();
  }, []);

  // --- LÓGICA DE ESCÁNER Y ASISTENCIA ---
  const marcarAsistencia = async (id, estadoActual) => {
    try {
      const inscriptoRef = doc(db, "inscriptos", id);
      const campoAsistencia = eventoActivo === 'pre' ? 'asistio_pre' : 'asistio_congreso';
      await updateDoc(inscriptoRef, { [campoAsistencia]: !estadoActual });
    } catch (error) {
      console.error("Error al actualizar asistencia:", error);
    }
  };

  const handleScan = async (text) => {
    if (!text || text === ultimoEscaneo) return; 
    setUltimoEscaneo(text);
    
    const persona = inscriptos.find(i => i.id === text);
    
    if (persona) {
      const estadoActual = eventoActivo === 'pre' ? persona.asistio_pre : persona.asistio_congreso;
      if (estadoActual) {
        setScanResult({ type: 'error', msg: `RECHAZADO: ${persona.nombre} YA INGRESÓ` });
      } else {
        await marcarAsistencia(text, false);
        setScanResult({ type: 'success', msg: `ADMITIDO: ${persona.nombre} ${persona.apellido}` });
      }
    } else {
      setScanResult({ type: 'error', msg: "CÓDIGO INVÁLIDO O NO REGISTRADO" });
    }
    
    // Limpia la pantalla de validación después de 2 segundos
    setTimeout(() => {
      setScanResult(null);
      setUltimoEscaneo('');
    }, 2000);
  };

  // --- ELIMINAR Y MODO RESCATE ---
  const eliminarInscripto = async (id, nombre) => {
    if(window.confirm(`¿Estás seguro de eliminar a ${nombre} del sistema? Esta acción no se puede deshacer.`)) {
      try {
        await deleteDoc(doc(db, "inscriptos", id));
      } catch (error) {
        alert("Error al eliminar el registro.");
      }
    }
  };

  const handleInscripcionManual = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "inscriptos"), {
        nombre: manualForm.nombre,
        apellido: manualForm.apellido,
        iglesia: manualForm.iglesia,
        email: 'inscripcion_puerta@iceb.com',
        edad: 0,
        fechaInscripcion: serverTimestamp(),
        asistio_pre: eventoActivo === 'pre',
        asistio_congreso: eventoActivo === 'congreso',
        evento_origen: 'puerta_emergencia'
      });
      setIsModalOpen(false);
      setManualForm({ nombre: '', apellido: '', iglesia: '' });
    } catch (error) {
      alert("Error guardando el registro manual.");
    }
  };

  // --- FILTROS Y MÉTRICAS DINÁMICAS ---
  const iglesiasUnicas = useMemo(() => {
    const lista = inscriptos.map(p => p.iglesia?.trim().toUpperCase()).filter(Boolean);
    return ['TODAS', ...new Set(lista)].sort();
  }, [inscriptos]);

  const inscriptosFiltrados = inscriptos.filter(persona => {
    const textoBuscado = busqueda.toLowerCase();
    const coincideTexto = (persona.nombre?.toLowerCase().includes(textoBuscado) || persona.apellido?.toLowerCase().includes(textoBuscado));
    const coincideIglesia = filtroIglesia === 'TODAS' || persona.iglesia?.trim().toUpperCase() === filtroIglesia;
    return coincideTexto && coincideIglesia;
  });

  const totalAsistentes = inscriptos.filter(p => eventoActivo === 'pre' ? p.asistio_pre : p.asistio_congreso).length;
  const capacidadMax = eventoActivo === 'pre' ? CAPACIDAD_PRE : CAPACIDAD_CONGRESO;
  const porcentajeOcupacion = Math.min(((totalAsistentes / capacidadMax) * 100).toFixed(1), 100);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--crema)', padding: '20px', fontFamily: 'var(--f-body)', position: 'relative' }}>
      
      {/* PANTALLA DE VALIDACIÓN VISUAL (Sobrescribe toda la pantalla al escanear) */}
      {scanResult && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: scanResult.type === 'success' ? '#10b981' : '#ef4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--f-display)', fontSize: '10vw', textTransform: 'uppercase', lineHeight: '1.1' }}>
            {scanResult.msg}
          </h1>
        </div>
      )}

      {/* CABECERA */}
      <header style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontFamily: 'var(--f-display)', color: 'var(--tinta)', margin: 0, fontSize: '24px', textTransform: 'uppercase' }}>
            Control de Puerta
          </h1>
          <button onClick={() => navigate('/')} style={{ background: 'transparent', border: 'none', textDecoration: 'underline', color: 'var(--tinta)', cursor: 'pointer', fontWeight: 'bold' }}>
            ← Volver a la Web
          </button>
        </div>

        {/* SELECTOR GLOBAL (EL SWITCH) */}
        <div style={{ display: 'flex', border: '3px solid var(--tinta)', background: 'var(--tinta)' }}>
          <button onClick={() => setEventoActivo('pre')} style={{ flex: 1, padding: '12px', border: 'none', background: eventoActivo === 'pre' ? 'var(--amarillo)' : 'var(--tinta)', color: eventoActivo === 'pre' ? 'var(--tinta)' : 'var(--crema)', fontFamily: 'var(--f-mono)', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
            PRE-CONGRESO (12 SEP)
          </button>
          <button onClick={() => setEventoActivo('congreso')} style={{ flex: 1, padding: '12px', border: 'none', background: eventoActivo === 'congreso' ? 'var(--amarillo)' : 'var(--tinta)', color: eventoActivo === 'congreso' ? 'var(--tinta)' : 'var(--crema)', fontFamily: 'var(--f-mono)', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
            CONGRESO (31 OCT)
          </button>
        </div>
      </header>

      {/* MÉTRICAS DE TRINCHERA */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        <div style={{ background: 'var(--crema-2)', border: '2px solid var(--tinta)', padding: '10px', textAlign: 'center', boxShadow: '3px 3px 0 var(--tinta)' }}>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', color: 'var(--tinta)', display: 'block' }}>Inscriptos</span>
          <span style={{ fontSize: '22px', fontFamily: 'var(--f-display)', color: 'var(--tinta)' }}>{inscriptos.length}</span>
        </div>
        <div style={{ background: 'var(--azul)', border: '2px solid var(--tinta)', padding: '10px', textAlign: 'center', boxShadow: '3px 3px 0 var(--tinta)' }}>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', color: 'var(--crema)', display: 'block' }}>Adentro</span>
          <span style={{ fontSize: '22px', fontFamily: 'var(--f-display)', color: 'var(--amarillo)' }}>{totalAsistentes}</span>
        </div>
        <div style={{ background: porcentajeOcupacion > 90 ? '#ef4444' : 'var(--crema-2)', border: '2px solid var(--tinta)', padding: '10px', textAlign: 'center', boxShadow: '3px 3px 0 var(--tinta)', color: porcentajeOcupacion > 90 ? 'white' : 'var(--tinta)' }}>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', display: 'block' }}>Ocupación</span>
          <span style={{ fontSize: '22px', fontFamily: 'var(--f-display)' }}>{porcentajeOcupacion}%</span>
        </div>
      </div>

      {/* ACCIONES RÁPIDAS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setIsScannerOpen(!isScannerOpen)} style={{ flex: 2, padding: '15px', background: isScannerOpen ? 'red' : 'var(--tinta)', color: 'white', border: 'none', fontFamily: 'var(--f-mono)', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '4px 4px 0 var(--amarillo)' }}>
          {isScannerOpen ? '[X] CERRAR LECTOR' : '[+] ABRIR ESCÁNER'}
        </button>
        <button onClick={() => setIsModalOpen(true)} style={{ flex: 1, padding: '15px', background: 'var(--amarillo)', color: 'var(--tinta)', border: '3px solid var(--tinta)', fontFamily: 'var(--f-mono)', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '4px 4px 0 var(--tinta)' }}>
          RESCATE ✎
        </button>
      </div>

      {/* MÓDULO DE CÁMARA */}
      {isScannerOpen && (
        <div style={{ border: '4px solid var(--tinta)', marginBottom: '20px', background: 'black', height: '250px', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
          <Scanner onResult={(text) => handleScan(text)} options={{ delayBetweenScanAttempts: 1500 }} />
        </div>
      )}

      {/* GESTIÓN DE LA TROPA (BÚSQUEDA Y FILTROS) */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <input 
          type="text" 
          placeholder="Buscar nombre o apellido..." 
          value={busqueda} 
          onChange={(e) => setBusqueda(e.target.value)} 
          style={{ flex: 2, padding: '12px', border: '3px solid var(--tinta)', background: 'var(--crema-2)', fontFamily: 'var(--f-mono)', fontSize: '12px', outline: 'none' }} 
        />
        <select 
          value={filtroIglesia}
          onChange={(e) => setFiltroIglesia(e.target.value)}
          style={{ flex: 1, padding: '12px', border: '3px solid var(--tinta)', background: 'var(--crema-2)', fontFamily: 'var(--f-mono)', fontSize: '10px', textTransform: 'uppercase', outline: 'none', cursor: 'pointer' }}
        >
          {iglesiasUnicas.map(ig => <option key={ig} value={ig}>{ig}</option>)}
        </select>
      </div>

      {/* LISTA COMPLETA */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '40px' }}>
        {inscriptosFiltrados.map((persona) => {
          const asistio = eventoActivo === 'pre' ? persona.asistio_pre : persona.asistio_congreso;
          return (
            <div key={persona.id} style={{ display: 'flex', flexDirection: 'column', background: asistio ? 'rgba(36, 56, 224, 0.15)' : 'var(--crema-2)', border: '2px solid var(--tinta)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px' }}>
                <div style={{ overflow: 'hidden', paddingRight: '10px' }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--tinta)', textTransform: 'uppercase', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    {persona.nombre} {persona.apellido}
                  </h4>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: '10px', color: 'var(--azul)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    📍 {persona.iglesia}
                  </span>
                </div>
                
                <button onClick={() => marcarAsistencia(persona.id, asistio)} style={{ padding: '8px 12px', border: '2px solid var(--tinta)', background: asistio ? 'var(--amarillo)' : 'transparent', color: 'var(--tinta)', fontFamily: 'var(--f-mono)', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', minWidth: '95px' }}>
                  {asistio ? 'ADENTRO ✓' : 'INGRESAR'}
                </button>
              </div>

              {/* BOTÓN ELIMINAR (Franja inferior del bloque) */}
              <button 
                onClick={() => eliminarInscripto(persona.id, `${persona.nombre} ${persona.apellido}`)}
                style={{ width: '100%', background: 'var(--tinta)', color: 'var(--crema)', border: 'none', borderTop: '2px solid var(--tinta)', padding: '6px', fontFamily: 'var(--f-mono)', fontSize: '9px', textTransform: 'uppercase', cursor: 'pointer', textAlign: 'right', paddingRight: '15px' }}
              >
                Eliminar Registro 🗑
              </button>
            </div>
          );
        })}
      </div>

      {/* MODAL MODO RESCATE (INSCRIPCIÓN MANUAL EXPRÉS) */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(10,10,12,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999, padding: '20px' }}>
          <div style={{ background: 'var(--crema)', width: '100%', maxWidth: '400px', border: '4px solid var(--tinta)', padding: '20px', boxShadow: '8px 8px 0 var(--amarillo)' }}>
            <h3 style={{ fontFamily: 'var(--f-display)', marginTop: 0, textTransform: 'uppercase', color: 'var(--tinta)' }}>Modo Rescate</h3>
            <p style={{ fontFamily: 'var(--f-body)', fontSize: '12px', marginTop: '-10px', marginBottom: '15px', color: 'var(--tinta)' }}>Anota al instante al joven que llegó sin pase. Quedará ingresado automáticamente.</p>
            
            <form onSubmit={handleInscripcionManual} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" placeholder="Nombre" required value={manualForm.nombre} onChange={e => setManualForm({...manualForm, nombre: e.target.value})} style={{ padding: '12px', border: '3px solid var(--tinta)', fontFamily: 'var(--f-mono)', outline: 'none' }} />
              <input type="text" placeholder="Apellido" required value={manualForm.apellido} onChange={e => setManualForm({...manualForm, apellido: e.target.value})} style={{ padding: '12px', border: '3px solid var(--tinta)', fontFamily: 'var(--f-mono)', outline: 'none' }} />
              <input type="text" placeholder="Nombre de su Iglesia" required value={manualForm.iglesia} onChange={e => setManualForm({...manualForm, iglesia: e.target.value})} style={{ padding: '12px', border: '3px solid var(--tinta)', fontFamily: 'var(--f-mono)', outline: 'none' }} />
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '3px solid var(--tinta)', color: 'var(--tinta)', fontFamily: 'var(--f-mono)', fontWeight: 'bold', cursor: 'pointer' }}>CANCELAR</button>
                <button type="submit" style={{ flex: 1, padding: '12px', background: 'var(--azul)', color: 'var(--crema)', border: '3px solid var(--tinta)', fontFamily: 'var(--f-mono)', fontWeight: 'bold', cursor: 'pointer' }}>ADMITIR AHORA</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}