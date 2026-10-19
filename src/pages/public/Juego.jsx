import React, { useState } from 'react';
import { collection, addDoc, query, where, getDocs, updateDoc, increment, arrayUnion } from "firebase/firestore";
import { Scanner } from '@yudiel/react-qr-scanner';
import { db } from '../../config/firebase';
import DashboardJugador from './DashboardJugador';
import './Juego.css';

// DICCIONARIO DE DATOS: Mapeo de QRs físicos con los juegos
const diccionarioJuegos = {
  'qr-tiro': {
    id: 1, 
    titulo: 'Tiro al Blanco',
    pregunta: '¿Qué máscara te cuesta más sacarte cuando estás con otros?',
    opciones: [
      { id: 'a', texto: 'Fingir que todo está bien todo el tiempo' },
      { id: 'b', texto: 'Editar mi personalidad para encajar' },
      { id: 'c', texto: 'Ocultar mis verdaderos gustos' }
    ],
    correcta: 'b' 
  },
  'qr-fuga': {
    id: 2,
    titulo: 'Fuga Lógica',
    pregunta: 'Vivimos rodeados de ruido. ¿A qué voces externas le estás dando el control?',
    opciones: [
      { id: 'a', texto: 'A las expectativas que otros pusieron sobre mí' },
      { id: 'b', texto: 'A mis propios principios' },
      { id: 'c', texto: 'A la verdad de Dios' }
    ],
    correcta: 'a'
  },
  'qr-minado': {
    id: 3,
    titulo: 'Campo Minado',
    pregunta: 'Al intentar salir del molde, ¿cuál es tu mayor obstáculo interno?',
    opciones: [
      { id: 'a', texto: 'El miedo al rechazo' },
      { id: 'b', texto: 'La comodidad de lo conocido' },
      { id: 'c', texto: 'No saber por dónde empezar' }
    ],
    correcta: 'a'
  },
  'qr-rompecabezas': {
    id: 4,
    titulo: 'Rompecabezas',
    pregunta: '¿Qué pieza te falta para mostrarte 100% auténtico?',
    opciones: [
      { id: 'a', texto: 'Confianza en mi diseño original' },
      { id: 'b', texto: 'Dejar de compararme con otros' },
      { id: 'c', texto: 'Aceptar mis debilidades' }
    ],
    correcta: 'b'
  }
};

export default function Juego() {
  // Inicialización perezosa: Si ya hay un PIN en memoria, arranca directo en el dashboard
  const [view, setView] = useState(() => localStorage.getItem('miGrupoPIN') ? 'dashboard' : 'inicio');
  
  const [pinInput, setPinInput] = useState('');
  const [pinGenerado, setPinGenerado] = useState('');
  const [nombreEquipo, setNombreEquipo] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estado para manejar el juego que se acaba de escanear
  const [juegoActivo, setJuegoActivo] = useState(null);

  // 1. Lógica para crear un nuevo grupo
  const handleCrearGrupo = async (e) => {
    e.preventDefault();
    if (!nombreEquipo.trim()) return alert("Ingresá un nombre para tu equipo");
    
    setLoading(true);
    const nuevoPin = Math.floor(1000 + Math.random() * 9000).toString();
    
    try {
      await addDoc(collection(db, "grupos"), {
        pin: nuevoPin,
        nombre: nombreEquipo.toUpperCase(),
        puntos: 0,
        vidas: 3,
        juegosCompletados: [],
        creadoEn: new Date(),
        integrantes: 1
      });
      
      setPinGenerado(nuevoPin);
      localStorage.setItem('miGrupoPIN', nuevoPin);
      setView('dashboard');
    } catch (error) {
      console.error("Error al crear:", error);
      alert("Error de conexión. Intentá de nuevo.");
    }
    setLoading(false);
  };

  // 2. Lógica para buscar el PIN y unirse
  const handleUnirse = async (e) => {
    if (e) e.preventDefault();
    if (pinInput.length !== 4) return;
    
    setLoading(true);
    try {
      const q = query(collection(db, "grupos"), where("pin", "==", pinInput));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert("ACCESO DENEGADO. El PIN no existe.");
      } else {
        localStorage.setItem('miGrupoPIN', pinInput);
        setView('dashboard');
      }
    } catch (error) {
      console.error("Fallo de red:", error);
      alert("Error de conexión al buscar el grupo.");
    }
    setLoading(false);
  };

  // 3. Lógica del Escáner QR
  const handleScan = (resultado) => {
    if (!resultado) return;
    
    // Soporte para versiones nuevas y viejas de la librería
    const textoQR = Array.isArray(resultado) ? resultado[0].rawValue : resultado.text || resultado;
    const juegoEncontrado = diccionarioJuegos[textoQR];
    
    if (juegoEncontrado) {
      setJuegoActivo(juegoEncontrado);
      setView('trivia');
    } else {
      alert(`Código no reconocido: ${textoQR}`);
    }
  };

  // 4. Lógica de Validación de Trivia
  const validarRespuesta = async (opcionSeleccionada) => {
    const pinGuardado = localStorage.getItem('miGrupoPIN');
    const q = query(collection(db, "grupos"), where("pin", "==", pinGuardado));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return;
    const docRef = querySnapshot.docs[0].ref;

    if (opcionSeleccionada === juegoActivo.correcta) {
      // Respuesta correcta: Sumamos 50 puntos y agregamos el juego al historial
      await updateDoc(docRef, {
        puntos: increment(50),
        juegosCompletados: arrayUnion(juegoActivo.id)
      });
      alert('¡SALA SUPERADA! +50 Puntos');
    } else {
      // Respuesta incorrecta: Restamos 1 vida
      await updateDoc(docRef, {
        vidas: increment(-1)
      });
      alert('RESPUESTA INCORRECTA. Perdiste una vida.');
    }
    
    setJuegoActivo(null);
    setView('dashboard');
  };

  // ================= VISTAS PREMIUM (TAILWIND) =================
  
  if (view === 'dashboard') {
    return (
      <DashboardJugador 
        onEscanear={() => setView('escaner')} 
        onSalir={() => { 
          localStorage.removeItem('miGrupoPIN'); 
          setPinGenerado('');
          setPinInput('');
          setNombreEquipo('');
          setView('inicio'); 
        }} 
      />
    );
  }

  if (view === 'escaner') {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center p-5">
        <h2 className="text-2xl font-black mb-4 text-yellow-400 tracking-widest uppercase mt-8">Cámara de Escaneo</h2>
        <p className="mb-8 text-gray-500 text-center text-sm">Apuntá al código QR del puesto físico.</p>
        
        <div className="w-full max-w-md rounded-2xl overflow-hidden border-2 border-yellow-400 relative mb-8">
          <Scanner 
            onScan={handleScan}
            options={{ delayBetweenScanAttempts: 1000 }} 
          />
          <div className="absolute top-1/2 left-0 w-full h-1 bg-yellow-400 shadow-[0_0_15px_#facc15] animate-pulse"></div>
        </div>

        <button 
          onClick={() => setView('dashboard')}
          className="w-full rounded-full border border-white/20 bg-white/5 py-4 text-sm font-bold uppercase tracking-widest transition-colors hover:bg-white/10 mt-auto mb-8"
        >
          Volver al Escuadrón
        </button>
      </div>
    );
  }

  if (view === 'trivia' && juegoActivo) {
    return (
      <div className="min-h-screen bg-[#050505] text-white p-6 flex flex-col">
        <header className="mb-8 mt-4">
          <span className="text-yellow-400 font-mono text-sm tracking-widest uppercase">SALA DESBLOQUEADA</span>
          <h2 className="text-3xl font-black uppercase mt-2">{juegoActivo.titulo}</h2>
        </header>
        
        <p className="text-xl text-gray-200 mb-10 leading-relaxed font-bold">{juegoActivo.pregunta}</p>
        
        <div className="flex flex-col gap-4">
          {juegoActivo.opciones.map((op) => (
            <button 
              key={op.id}
              onClick={() => validarRespuesta(op.id)}
              className="text-left bg-[#111] border-2 border-white/10 p-5 rounded-xl text-sm font-bold active:bg-yellow-400 active:text-black transition-colors"
            >
              <span className="text-yellow-400 mr-2">{op.id.toUpperCase()}.</span> {op.texto}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ================= VISTA ONBOARDING (CSS CLÁSICO) =================
  return (
    <div className="onb-screen">
      <div className="onb-visual-area">
        <div className="onb-icon-badge" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '24px', color: 'var(--amarillo)' }}>⚡</span>
        </div>

        {view === 'inicio' && (
          <div className="onb-dots">
            <span className="dot active" />
            <span className="dot" />
            <span className="dot" />
          </div>
        )}
      </div>

      <div className="onb-content">
        {view === 'inicio' && (
          <>
            <h1 className="onb-title">
              SALÍ DEL <span className="molde">MOLDE</span>.
            </h1>
            <p className="onb-desc">
              Creá tu grupo, sumá a tu gente y preparate para romper el sistema.
            </p>
          </>
        )}

        {view === 'crear' && (
          <form onSubmit={handleCrearGrupo}>
            <h1 className="onb-title small">Identidad</h1>
            <p className="onb-desc">
              Bautizá a tu escuadrón antes de generar el código de acceso.
            </p>
            <input
              className="onb-pin-input"
              style={{ letterSpacing: 'normal', textAlign: 'left', fontSize: '24px', maxWidth: '300px' }}
              type="text"
              placeholder="Ej: Los Auténticos"
              value={nombreEquipo}
              onChange={(e) => setNombreEquipo(e.target.value)}
              required
              autoFocus
            />
            <button type="submit" className="onb-btn primary mt-8" style={{ marginTop: '30px' }} disabled={loading}>
              {loading ? 'Generando...' : 'Crear y Generar PIN'}
            </button>
            <button type="button" className="onb-btn text-only" style={{ marginTop: '10px' }} onClick={() => setView('inicio')}>
              Volver
            </button>
          </form>
        )}

        {view === 'unir' && (
          <form onSubmit={handleUnirse}>
            <h1 className="onb-title small">Ingresá tu PIN</h1>
            <p className="onb-desc">
              Pedile el código de 4 dígitos al líder de tu equipo.
            </p>
            <input
              className="onb-pin-input"
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="0000"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              aria-label="Código PIN de 4 dígitos"
              required
              autoFocus
            />
          </form>
        )}
      </div>

      <div className="onb-actions">
        {view === 'inicio' && (
          <>
            <button className="onb-btn primary" onClick={() => setView('crear')}>
              Crear nuevo grupo
            </button>
            <button className="onb-btn secondary" onClick={() => setView('unir')}>
              Ya tengo un PIN
            </button>
          </>
        )}

        {view === 'unir' && (
          <>
            <button 
              className="onb-btn primary" 
              onClick={handleUnirse}
              disabled={loading || pinInput.length !== 4}
            >
              {loading ? 'Sincronizando...' : 'Sincronizar'}
            </button>
            <button className="onb-btn text-only" onClick={() => { setView('inicio'); setPinInput(''); }}>
              Volver
            </button>
          </>
        )}
      </div>
    </div>
  );
}