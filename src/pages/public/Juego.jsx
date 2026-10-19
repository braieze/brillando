import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, updateDoc, increment, arrayUnion, onSnapshot } from "firebase/firestore";
import { Scanner } from '@yudiel/react-qr-scanner';
import { db } from '../../config/firebase';
import DashboardJugador from './DashboardJugador';
import './Juego.css';

const diccionarioJuegos = {
  'qr-tiro': {
    id: 1, 
    titulo: 'Tiro al Blanco',
    preguntas: [
      {
        texto: '¿Qué máscara te cuesta más sacarte cuando estás con otros?',
        opciones: [
          { id: 'a', texto: 'Fingir que todo está bien todo el tiempo' },
          { id: 'b', texto: 'Editar mi personalidad para encajar' },
          { id: 'c', texto: 'Ocultar mis verdaderos gustos' }
        ],
        correcta: 'b' 
      },
      {
        texto: 'En una discusión, ¿qué actitud tomás para "no quedar mal"?',
        opciones: [
          { id: 'a', texto: 'Defiendo mi punto con respeto pero firmeza' },
          { id: 'b', texto: 'Me callo para evitar conflicto aunque tenga razón' },
          { id: 'c', texto: 'Le doy la razón al otro para que se calle' }
        ],
        correcta: 'a' 
      },
      {
        texto: 'Si te invitan a un lugar que no va con tus principios, ¿qué hacés?',
        opciones: [
          { id: 'a', texto: 'Invento una excusa para no ir' },
          { id: 'b', texto: 'Voy un rato pero no participo' },
          { id: 'c', texto: 'Digo la verdad de por qué no asisto' }
        ],
        correcta: 'c' 
      }
    ]
  },
  'qr-fuga': {
    id: 2,
    titulo: 'Fuga Lógica',
    preguntas: [
      {
        texto: 'Vivimos rodeados de ruido. ¿A qué voces externas le estás dando el control?',
        opciones: [
          { id: 'a', texto: 'A las expectativas que otros pusieron sobre mí' },
          { id: 'b', texto: 'A mis propios principios' },
          { id: 'c', texto: 'A la verdad de Dios' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Cuando tomás una decisión difícil, ¿qué pesa más en tu mente?',
        opciones: [
          { id: 'a', texto: 'La opinión de Dios' },
          { id: 'b', texto: 'El "qué dirán" mis amigos' },
          { id: 'c', texto: 'Lo que me haga sentir bien en el momento' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Qué pensamiento automático te frena de intentar algo nuevo?',
        opciones: [
          { id: 'a', texto: '"No soy lo suficientemente bueno"' },
          { id: 'b', texto: '"Voy a aprender en el proceso"' },
          { id: 'c', texto: '"Si me esfuerzo lo logro"' }
        ],
        correcta: 'a'
      }
    ]
  },
  'qr-minado': {
    id: 3,
    titulo: 'Campo Minado',
    preguntas: [
      {
        texto: 'Al intentar salir del molde, ¿cuál es tu mayor obstáculo interno?',
        opciones: [
          { id: 'a', texto: 'El miedo al rechazo' },
          { id: 'b', texto: 'La comodidad de lo conocido' },
          { id: 'c', texto: 'No saber por dónde empezar' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cómo reaccionás cuando te señalan un error en tu carácter?',
        opciones: [
          { id: 'a', texto: 'Me pongo a la defensiva y ataco' },
          { id: 'b', texto: 'Lo analizo e intento mejorar' },
          { id: 'c', texto: 'Me deprimo y me aislo' }
        ],
        correcta: 'b'
      },
      {
        texto: 'El verdadero arrepentimiento implica...',
        opciones: [
          { id: 'a', texto: 'Sentir culpa un rato y seguir igual' },
          { id: 'b', texto: 'Pedir perdón para zafar' },
          { id: 'c', texto: 'Un cambio de dirección en mis acciones' }
        ],
        correcta: 'c'
      }
    ]
  },
  'qr-rompecabezas': {
    id: 4,
    titulo: 'Rompecabezas',
    preguntas: [
      {
        texto: '¿Qué pieza te falta para mostrarte 100% auténtico?',
        opciones: [
          { id: 'a', texto: 'Confianza en mi diseño original' },
          { id: 'b', texto: 'Dejar de compararme con otros' },
          { id: 'c', texto: 'Aceptar mis debilidades' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Dios no te llamó a ser una copia. Te llamó a ser...',
        opciones: [
          { id: 'a', texto: 'Original' },
          { id: 'b', texto: 'Famoso' },
          { id: 'c', texto: 'Perfecto' }
        ],
        correcta: 'a'
      },
      {
        texto: 'El diseño de Dios para tu vida se descubre...',
        opciones: [
          { id: 'a', texto: 'Buscando en tu interior lo que te gusta' },
          { id: 'b', texto: 'Pasando tiempo con el Creador' },
          { id: 'c', texto: 'Preguntándole a tus padres' }
        ],
        correcta: 'b'
      }
    ]
  }
};

export default function Juego() {
  const [view, setView] = useState(() => localStorage.getItem('miGrupoPIN') ? 'dashboard' : 'inicio');
  
  const [pinInput, setPinInput] = useState('');
  const [pinGenerado, setPinGenerado] = useState('');
  const [nombreEquipo, setNombreEquipo] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [juegoActivo, setJuegoActivo] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Escucha en TIEMPO REAL a Firebase para evitar trampas
  const [grupoDataCache, setGrupoDataCache] = useState(null);

  useEffect(() => {
    let unsubscribe;
    const fetchGrupoLive = () => {
      const pinGuardado = localStorage.getItem('miGrupoPIN');
      if (pinGuardado) {
        const q = query(collection(db, "grupos"), where("pin", "==", pinGuardado));
        unsubscribe = onSnapshot(q, (snap) => {
          if (!snap.empty) {
            setGrupoDataCache(snap.docs[0].data());
          }
        });
      }
    };
    fetchGrupoLive();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [view]); 

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
    } catch (error) {
      alert("Error de conexión. Intentá de nuevo.");
    }
    setLoading(false);
  };

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
        const docRef = querySnapshot.docs[0];
        const datosGrupo = docRef.data();

        if (datosGrupo.integrantes >= 2) {
          alert("ACCESO DENEGADO. Este escuadrón ya está lleno (Máximo 2 dispositivos).");
        } else {
          await updateDoc(docRef.ref, {
            integrantes: increment(1)
          });
          localStorage.setItem('miGrupoPIN', pinInput);
          setView('dashboard');
        }
      }
    } catch (error) {
      alert("Error de conexión al buscar el grupo.");
    }
    setLoading(false);
  };

  const handleScan = (resultado) => {
    if (!resultado) return;
    
    const textoQR = Array.isArray(resultado) ? resultado[0].rawValue : resultado.text || resultado;
    const baseJuego = diccionarioJuegos[textoQR];
    
    if (baseJuego) {
      // 1. REGLA: Usamos el Cache en Tiempo Real para bloquear dobles escaneos
      if (grupoDataCache?.juegosCompletados?.includes(baseJuego.id)) {
        alert("⚠️ MISIÓN YA COMPLETADA. Busquen otro puesto para seguir sumando.");
        setView('dashboard');
        return;
      }

      // 2. REGLA: Pregunta 100% Aleatoria
      const randomIndex = Math.floor(Math.random() * baseJuego.preguntas.length);
      const preguntaSorteada = baseJuego.preguntas[randomIndex];

      setJuegoActivo({
        id: baseJuego.id,
        titulo: baseJuego.titulo,
        pregunta: preguntaSorteada.texto,
        opciones: preguntaSorteada.opciones,
        correcta: preguntaSorteada.correcta
      });
      
      setView('trivia');
    } else {
      alert(`Código no reconocido en el sistema.`);
    }
  };

  const validarRespuesta = async (opcionSeleccionada) => {
    const pinGuardado = localStorage.getItem('miGrupoPIN');
    const q = query(collection(db, "grupos"), where("pin", "==", pinGuardado));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return;
    const docRef = querySnapshot.docs[0].ref;
    const datosServer = querySnapshot.docs[0].data();

    if (opcionSeleccionada === juegoActivo.correcta) {
      await updateDoc(docRef, {
        puntos: increment(50),
        juegosCompletados: arrayUnion(juegoActivo.id)
      });
      setFeedback({ type: 'success', titulo: '¡SALA SUPERADA!', subtitulo: '+50 PUNTOS' });
      
      setTimeout(() => {
        setFeedback(null);
        setJuegoActivo(null);
        setView('dashboard');
      }, 3000);
      
    } else {
      // 3. REGLA: Muerte Súbita
      if (datosServer.vidas <= 1) {
        await updateDoc(docRef, {
          puntos: 0,
          vidas: 3
        });
        // Dispara la pantalla de GAME OVER sin temporizador
        setFeedback({ type: 'gameover', titulo: '¡ATRAPADOS!', subtitulo: 'Quedaron encerrados en la sala de escape.' });
      } else {
        await updateDoc(docRef, { vidas: increment(-1) });
        setFeedback({ type: 'error', titulo: 'SISTEMA COMPROMETIDO', subtitulo: '-1 VIDA' });
        
        setTimeout(() => {
          setFeedback(null);
          setJuegoActivo(null);
          setView('dashboard');
        }, 3000);
      }
    }
  };

  // ================= VISTAS PREMIUM =================

  if (feedback) {
    if (feedback.type === 'gameover') {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#050505] text-white">
          <div className="mb-6">
            <span className="text-9xl drop-shadow-xl">🔒</span>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-4 leading-none text-red-600">
            {feedback.titulo}
          </h1>
          <p className="text-lg font-bold uppercase tracking-widest text-gray-400 mb-10 leading-relaxed">
            {feedback.subtitulo}<br/><span className="text-white">Han perdido todos sus puntos.</span>
          </p>
          <button 
            onClick={() => { setFeedback(null); setJuegoActivo(null); setView('dashboard'); }}
            className="w-full max-w-sm py-5 bg-red-600 text-white font-black text-sm uppercase tracking-widest rounded-full shadow-[0_0_20px_rgba(220,38,38,0.4)] active:scale-95 transition-transform"
          >
            Reiniciar Misión a Cero
          </button>
        </div>
      );
    }

    const isSuccess = feedback.type === 'success';
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center ${isSuccess ? 'bg-yellow-400 text-black' : 'bg-red-600 text-white'}`}>
        <div className="mb-8 animate-bounce">
          <span className="text-8xl drop-shadow-xl">{isSuccess ? '⚡' : '❌'}</span>
        </div>
        <h1 className="text-5xl font-black uppercase tracking-tighter mb-4 leading-none">
          {feedback.titulo}
        </h1>
        <h2 className={`text-2xl font-black font-mono uppercase tracking-widest px-6 py-2 border-4 ${isSuccess ? 'border-black' : 'border-white'} rounded-full`}>
          {feedback.subtitulo}
        </h2>
      </div>
    );
  }
  
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
        <header className="mb-6 mt-4 flex justify-between items-center">
          <span className="text-yellow-400 font-mono text-sm tracking-widest uppercase">SALA DESBLOQUEADA</span>
          <div className="flex gap-1">
            {[1, 2, 3].map((vida) => (
              <span key={vida} className={`text-xl ${vida <= (grupoDataCache?.vidas || 3) ? 'opacity-100' : 'opacity-30'}`}>❤️</span>
            ))}
          </div>
        </header>

        {/* 4. REGLA: Alerta gigante cuando queda 1 sola vida */}
        {grupoDataCache?.vidas === 1 && (
          <div className="bg-red-600 text-white p-4 rounded-xl mb-6 border-4 border-black animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.5)]">
            <h3 className="font-black uppercase text-xl mb-1 text-center">¡CUIDADO! ÚLTIMA VIDA</h3>
            <p className="font-bold text-xs text-center uppercase tracking-widest">
              Presten suma atención. Si responden mal pierden TODOS sus puntos y vuelven a cero.
            </p>
          </div>
        )}
        
        <h2 className="text-3xl font-black uppercase mb-6 text-white">{juegoActivo.titulo}</h2>
        <p className="text-lg text-gray-200 mb-8 leading-relaxed font-bold">{juegoActivo.pregunta}</p>
        
        <div className="flex flex-col gap-4 mt-auto mb-4">
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
          <form onSubmit={!pinGenerado ? handleCrearGrupo : (e) => { e.preventDefault(); setView('dashboard'); }}>
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
              disabled={!!pinGenerado} 
            />
            
            {pinGenerado && (
              <div style={{ marginTop: '20px', padding: '15px', background: 'var(--amarillo)', color: 'var(--tinta)', textAlign: 'center', fontSize: '32px', fontWeight: '900', letterSpacing: '10px' }}>
                {pinGenerado}
              </div>
            )}

            {!pinGenerado ? (
              <button type="submit" className="onb-btn primary mt-8" style={{ marginTop: '30px' }} disabled={loading}>
                {loading ? 'Generando...' : 'Crear y Generar PIN'}
              </button>
            ) : (
              <button type="button" className="onb-btn primary mt-8" style={{ marginTop: '30px' }} onClick={() => setView('dashboard')}>
                Entrar a la Sala
              </button>
            )}
            
            <button type="button" className="onb-btn text-only" style={{ marginTop: '10px' }} onClick={() => { setView('inicio'); setPinGenerado(''); }}>
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