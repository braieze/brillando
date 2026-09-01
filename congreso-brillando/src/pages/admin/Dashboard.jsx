import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function Dashboard() {
  const navigate = useNavigate();
  const [inscriptos, setInscriptos] = useState([]);
  const [eventoActivo, setEventoActivo] = useState('pre'); // 'pre' o 'congreso'
  const [busqueda, setBusqueda] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [ultimoEscaneo, setUltimoEscaneo] = useState('');

  // Sincronización en vivo con Firebase
  useEffect(() => {
    const inscriptosRef = collection(db, "inscriptos");
    const unsubscribe = onSnapshot(inscriptosRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setInscriptos(data);
    });
    return () => unsubscribe();
  }, []);

  // Lógica de marcado de asistencia
  const marcarAsistencia = async (id, estadoActual) => {
    try {
      const inscriptoRef = doc(db, "inscriptos", id);
      const campoAsistencia = eventoActivo === 'pre' ? 'asistio_pre' : 'asistio_congreso';
      await updateDoc(inscriptoRef, { [campoAsistencia]: !estadoActual });
      return true;
    } catch (error) {
      console.error("Error al actualizar asistencia:", error);
      return false;
    }
  };

  // Procesamiento del QR leído por la cámara
  const handleScan = (text) => {
    if (!text || text === ultimoEscaneo) return; // Evita escaneos múltiples del mismo código en 1 segundo
    setUltimoEscaneo(text);
    
    const persona = inscriptos.find(i => i.id === text);
    if (persona) {
      const estadoActual = eventoActivo === 'pre' ? persona.asistio_pre : persona.asistio_congreso;
      if (estadoActual) {
        alert(`❌ ALERTA: El pase de ${persona.nombre} ${persona.apellido} YA FUE USADO.`);
      } else {
        marcarAsistencia(text, false);
        alert(`✅ ÉXITO: Ingresó ${persona.nombre} ${persona.apellido}`);
      }
    } else {
      alert("⚠️ CÓDIGO INVÁLIDO: No pertenece a Brillando 2026.");
    }

    // Limpia la memoria del último escaneo después de 3 segundos
    setTimeout(() => setUltimoEscaneo(''), 3000);
  };

  // Filtros y contadores
  const inscriptosFiltrados = inscriptos.filter(persona => {
    const termino = busqueda.toLowerCase();
    return (
      persona.nombre?.toLowerCase().includes(termino) ||
      persona.apellido?.toLowerCase().includes(termino) ||
      persona.iglesia?.toLowerCase().includes(termino) ||
      persona.email?.toLowerCase().includes(termino)
    );
  });

  const totalAsistentes = inscriptos.filter(p => 
    eventoActivo === 'pre' ? p.asistio_pre : p.asistio_congreso
  ).length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--crema)', padding: '20px', fontFamily: 'var(--f-body)' }}>
      
      {/* Cabecera */}
      <header style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontFamily: 'var(--f-display)', color: 'var(--tinta)', margin: 0, fontSize: '24px', textTransform: 'uppercase' }}>
            Control de Puerta
          </h1>
          <button 
            onClick={() => navigate('/')}
            style={{ background: 'transparent', border: 'none', textDecoration: 'underline', color: 'var(--tinta)', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ← Volver
          </button>
        </div>

        {/* Interruptor de Eventos */}
        <div style={{ display: 'flex', border: '3px solid var(--tinta)', background: 'var(--tinta)' }}>
          <button 
            onClick={() => setEventoActivo('pre')}
            style={{ flex: 1, padding: '12px', border: 'none', background: eventoActivo === 'pre' ? 'var(--amarillo)' : 'var(--tinta)', color: eventoActivo === 'pre' ? 'var(--tinta)' : 'var(--crema)', fontFamily: 'var(--f-mono)', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', transition: '0.2s' }}
          >
            PRE-CONGRESO
          </button>
          <button 
            onClick={() => setEventoActivo('congreso')}
            style={{ flex: 1, padding: '12px', border: 'none', background: eventoActivo === 'congreso' ? 'var(--amarillo)' : 'var(--tinta)', color: eventoActivo === 'congreso' ? 'var(--tinta)' : 'var(--crema)', fontFamily: 'var(--f-mono)', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', transition: '0.2s' }}
          >
            CONGRESO
          </button>
        </div>
      </header>

      {/* Tablero de Ocupación */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
        <div style={{ background: 'var(--crema-2)', border: '3px solid var(--tinta)', padding: '20px', boxShadow: '6px 6px 0 var(--tinta)' }}>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', color: 'var(--tinta)' }}>Total Pases</span>
          <div style={{ fontSize: '36px', fontFamily: 'var(--f-display)', color: 'var(--azul)', marginTop: '5px' }}>{inscriptos.length}</div>
        </div>
        <div style={{ background: 'var(--azul)', border: '3px solid var(--tinta)', padding: '20px', boxShadow: '6px 6px 0 var(--tinta)' }}>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', textTransform: 'uppercase', color: 'var(--crema)' }}>Adentro</span>
          <div style={{ fontSize: '36px', fontFamily: 'var(--f-display)', color: 'var(--amarillo)', marginTop: '5px' }}>{totalAsistentes}</div>
        </div>
      </div>

      {/* Módulo de Escáner */}
      <div style={{ marginBottom: '30px' }}>
        <button 
          onClick={() => setIsScannerOpen(!isScannerOpen)}
          style={{ width: '100%', padding: '20px', background: isScannerOpen ? 'red' : 'var(--tinta)', color: 'white', border: 'none', fontFamily: 'var(--f-mono)', fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '6px 6px 0 var(--amarillo)' }}
        >
          {isScannerOpen ? 'CERRAR CÁMARA [X]' : 'ESCANEAR QR [+]'}
        </button>
        
        {isScannerOpen && (
          <div style={{ border: '4px solid var(--tinta)', marginTop: '15px', background: 'black', height: '300px', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
            <Scanner 
              onResult={(text) => handleScan(text)}
              onError={(error) => console.log(error?.message)}
              options={{ delayBetweenScanAttempts: 1000 }}
            />
          </div>
        )}
      </div>

      {/* Buscador */}
      <div style={{ marginBottom: '20px' }}>
        <input 
          type="text" 
          placeholder="Buscar por nombre, apellido o iglesia..." 
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ width: '100%', padding: '15px', border: '3px solid var(--tinta)', background: 'var(--crema-2)', fontFamily: 'var(--f-mono)', fontSize: '14px', outline: 'none' }}
        />
      </div>

      {/* Lista de Gestión Manual */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {inscriptosFiltrados.map((persona) => {
          const asistio = eventoActivo === 'pre' ? persona.asistio_pre : persona.asistio_congreso;
          
          return (
            <div key={persona.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: asistio ? 'rgba(36, 56, 224, 0.1)' : 'var(--crema-2)', border: '2px solid var(--tinta)', padding: '15px' }}>
              <div>
                <h4 style={{ margin: '0 0 5px 0', fontSize: '16px', color: 'var(--tinta)', textTransform: 'uppercase' }}>
                  {persona.nombre} {persona.apellido}
                </h4>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--azul)', fontWeight: 'bold' }}>
                  {persona.iglesia}
                </span>
              </div>
              
              <button 
                onClick={() => marcarAsistencia(persona.id, asistio)}
                style={{ padding: '10px 15px', border: '2px solid var(--tinta)', background: asistio ? 'var(--amarillo)' : 'transparent', color: 'var(--tinta)', fontFamily: 'var(--f-mono)', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', minWidth: '110px' }}
              >
                {asistio ? 'ADENTRO ✓' : 'INGRESAR'}
              </button>
            </div>
          );
        })}

        {inscriptosFiltrados.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px', fontFamily: 'var(--f-mono)', color: 'rgba(10,10,12,0.5)' }}>
            No se encontraron registros.
          </div>
        )}
      </div>
    </div>
  );
}