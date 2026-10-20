import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, updateDoc, increment, arrayUnion, onSnapshot } from "firebase/firestore";
import { Scanner } from '@yudiel/react-qr-scanner';
import { db } from '../../config/firebase';
import DashboardJugador from './DashboardJugador';
import './Juego.css';

// ============================================================================
// DICCIONARIO DE JUEGOS Y PREGUNTAS
// Mapea el texto de cada código QR físico con su sala y banco de preguntas.
// ============================================================================
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

// ============================================================================
// HELPER DE IDENTIDAD DE DISPOSITIVO 
// Crea y recupera una huella única en el navegador del celular. Permite que
// si el usuario cierra la pestaña y vuelve a poner el PIN, el sistema
// reconozca que es el mismo teléfono y no lo bloquee por cupo lleno.
// ============================================================================
const obtenerDeviceId = () => {
  let deviceId = localStorage.getItem('brillando_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    localStorage.setItem('brillando_device_id', deviceId);
  }
  return deviceId;
};

export default function Juego() {
  // Inicialización de vista y PIN activo desde localStorage para persistir sesión
  const [activePin, setActivePin] = useState(() => localStorage.getItem('miGrupoPIN') || '');
  const [view, setView] = useState(() => localStorage.getItem('miGrupoPIN') ? 'dashboard' : 'inicio');
  
  const [pinInput, setPinInput] = useState('');
  const [pinGenerado, setPinGenerado] = useState('');
  const [nombreEquipo, setNombreEquipo] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estados de la mecánica de juego
  const [juegoActivo, setJuegoActivo] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Candado Anti-Spam para bloquear múltiples clics rápidos en respuestas o escáner
  const [isProcessing, setIsProcessing] = useState(false);

  // Datos del grupo y referencia directa al documento en vivo
  const [grupoDataCache, setGrupoDataCache] = useState(null);
  const [grupoDocRef, setGrupoDocRef] = useState(null);

  // ============================================================================
  // ESCUCHADOR PERMANENTE EN TIEMPO REAL
  // Depende únicamente de `activePin` y NO de `view`. Así la conexión con
  // Firebase jamás se corta ni se recarga al cambiar entre Lobby, Escáner y Trivia.
  // ============================================================================
  useEffect(() => {
    if (!activePin) {
      setGrupoDataCache(null);
      setGrupoDocRef(null);
      return;
    }

    const q = query(collection(db, "grupos"), where("pin", "==", activePin));
    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        setGrupoDataCache(docSnap.data());
        setGrupoDocRef(docSnap.ref); // Guardamos la referencia directa para actualizar sin demoras
      }
    });

    return () => unsubscribe();
  }, [activePin]);

  // ============================================================================
  // DETECTOR DE CONCURRENCIA / RACE CONDITION
  // Si ambos compañeros escanean el mismo QR a la vez, este efecto detecta en
  // milisegundos cuando el compañero A resuelve la sala (o pierde la última vida)
  // y expulsa suavemente al compañero B de la trivia para que no toque opciones de más.
  // ============================================================================
  useEffect(() => {
    // Solo actúa si el jugador está viendo la trivia y no fue él mismo quien tocó el botón
    if (view === 'trivia' && juegoActivo && !isProcessing && !feedback) {
      
      // Caso A: El compañero respondió bien y el juego ya figura en juegosCompletados
      if (grupoDataCache?.juegosCompletados?.includes(juegoActivo.id)) {
        setFeedback({
          type: 'success',
          titulo: '¡SALA YA RESUELTA!',
          subtitulo: 'Tu compañero acaba de superar este desafío (+50 PTS)'
        });

        const timer = setTimeout(() => {
          setFeedback(null);
          setJuegoActivo(null);
          setView('dashboard');
        }, 3000);
        return () => clearTimeout(timer);
      }

      // Caso B: El compañero respondió mal en otro puesto y agotó la última vida del equipo
      if (grupoDataCache?.vidas !== undefined && grupoDataCache.vidas <= 0) {
        setFeedback({
          type: 'gameover',
          titulo: '¡ATRAPADOS!',
          subtitulo: 'Se agotaron las vidas del escuadrón.'
        });
      }
    }
  }, [grupoDataCache, view, juegoActivo, isProcessing, feedback]);

  // ============================================================================
  // 1. CREAR NUEVO GRUPO + REGISTRAR IDENTIDAD DEL CREADOR 
  // ============================================================================
  const handleCrearGrupo = async (e) => {
    e.preventDefault();
    if (!nombreEquipo.trim()) return alert("Ingresá un nombre para tu equipo");
    
    setLoading(true);
    const nuevoPin = Math.floor(1000 + Math.random() * 9000).toString();
    const miDeviceId = obtenerDeviceId();
    
    try {
      await addDoc(collection(db, "grupos"), {
        pin: nuevoPin,
        nombre: nombreEquipo.toUpperCase(),
        puntos: 0,
        vidas: 3,
        juegosCompletados: [],
        creadoEn: new Date(),
        integrantes: 1,
        dispositivos: [miDeviceId] // Guardamos la huella del celular del líder
      });
      
      setPinGenerado(nuevoPin);
      localStorage.setItem('miGrupoPIN', nuevoPin);
      setActivePin(nuevoPin); // Inicia el túnel en tiempo real inmediatamente
    } catch (error) {
      console.error("Error al crear grupo:", error);
      alert("Error de conexión. Intentá de nuevo.");
    }
    setLoading(false);
  };

  // ============================================================================
  // COMPARTIR PIN POR WHATSAPP 
  // ============================================================================
  const handleCompartirPin = async (pinParaCompartir) => {
    const codigo = pinParaCompartir || pinGenerado || activePin;
    const nombre = nombreEquipo ? nombreEquipo.toUpperCase() : (grupoDataCache?.nombre || 'nuestro escuadrón');
    const mensaje = `⚡ ¡Armé el grupo "${nombre}" para el juego de Brillando! Sumate con este código PIN: ${codigo}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Código de Escuadrón - Brillando',
          text: mensaje,
        });
      } catch (err) {
        console.log('Compartir cancelado por el usuario');
      }
    } else {
      // Si el navegador no soporta share nativo, abre WhatsApp directamente
      const urlWhatsapp = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
      window.open(urlWhatsapp, '_blank');
    }
  };

  // ============================================================================
  // 3. UNIRSE A GRUPO CON RECONOCIMIENTO DE CELULAR (SOLUCIÓN PUNTO 3)
  // ============================================================================
  const handleUnirse = async (e) => {
    if (e) e.preventDefault();
    if (pinInput.length !== 4) return;
    
    setLoading(true);
    const miDeviceId = obtenerDeviceId();

    try {
      const q = query(collection(db, "grupos"), where("pin", "==", pinInput));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert("ACCESO DENEGADO. El PIN no existe.");
      } else {
        const docSnap = querySnapshot.docs[0];
        const datosGrupo = docSnap.data();
        const dispositivosRegistrados = datosGrupo.dispositivos || [];

        // Verificamos si este celular ya pertenecía al grupo anteriormente
        const yaEsMiembro = dispositivosRegistrados.includes(miDeviceId);

        if (yaEsMiembro) {
          // Si cerró la pestaña por error y volvió a entrar, pasa directo sin ocupar nuevo cupo
          localStorage.setItem('miGrupoPIN', pinInput);
          setActivePin(pinInput);
          setView('dashboard');
        } else {
          // Si es un dispositivo nuevo, verificamos el límite estricto de 2 celulares
          const cupoActual = dispositivosRegistrados.length > 0 
            ? dispositivosRegistrados.length 
            : (datosGrupo.integrantes || 1);

          if (cupoActual >= 2) {
            alert("ACCESO DENEGADO. Este escuadrón ya está lleno (Máximo 2 dispositivos).");
          } else {
            // Registramos la huella del segundo celular y sumamos 1 integrante
            await updateDoc(docSnap.ref, {
              integrantes: increment(1),
              dispositivos: arrayUnion(miDeviceId)
            });
            localStorage.setItem('miGrupoPIN', pinInput);
            setActivePin(pinInput);
            setView('dashboard');
          }
        }
      }
    } catch (error) {
      console.error("Error al unirse:", error);
      alert("Error de conexión al buscar el grupo.");
    }
    setLoading(false);
  };

  // ============================================================================
  // LÓGICA DEL ESCÁNER QR (CON PREVENCIÓN DE DOBLE LECTURA)
  // ============================================================================
  const handleScan = (resultado) => {
    // Si no hay resultado o ya estamos procesando una lectura, ignoramos
    if (!resultado || isProcessing) return;
    
    const textoQR = Array.isArray(resultado) ? resultado[0]?.rawValue : (resultado?.text || resultado);
    if (!textoQR) return;

    const baseJuego = diccionarioJuegos[textoQR.trim()];
    
    if (baseJuego) {
      // Validamos contra el cache en vivo si el equipo ya superó esta estación
      if (grupoDataCache?.juegosCompletados?.includes(baseJuego.id)) {
        alert("⚠️ MISIÓN YA COMPLETADA. Busquen otro puesto para seguir sumando.");
        setView('dashboard');
        return;
      }

      // Selección aleatoria del banco de preguntas de esa estación
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
      alert(`Código QR no reconocido en el sistema.`);
    }
  };

  // ============================================================================
  // VALIDACIÓN DE TRIVIA BLINDADA 
  // ============================================================================
  const validarRespuesta = async (opcionSeleccionada) => {
    // CANDADO ANTI-SPAM: Si ya tocó un botón o no hay juego activo, bloqueamos clics extra
    if (isProcessing || !juegoActivo || !grupoDocRef) return;
    setIsProcessing(true);

    try {
      // Verifica por última vez si el compañero ya ganó esta sala hace un instante
      if (grupoDataCache?.juegosCompletados?.includes(juegoActivo.id)) {
        setFeedback({ type: 'success', titulo: '¡SALA YA RESUELTA!', subtitulo: 'Tu compañero ya sumó estos puntos' });
        setTimeout(() => {
          setFeedback(null);
          setJuegoActivo(null);
          setIsProcessing(false);
          setView('dashboard');
        }, 2500);
        return;
      }

      if (opcionSeleccionada === juegoActivo.correcta) {
        // RESPUESTA CORRECTA: Usa grupoDocRef directo (sin hacer getDocs extra)
        await updateDoc(grupoDocRef, {
          puntos: increment(50),
          juegosCompletados: arrayUnion(juegoActivo.id)
        });
        
        setFeedback({ type: 'success', titulo: '¡SALA SUPERADA!', subtitulo: '+50 PUNTOS' });
        
        setTimeout(() => {
          setFeedback(null);
          setJuegoActivo(null);
          setIsProcessing(false);
          setView('dashboard');
        }, 3000);

      } else {
        // RESPUESTA INCORRECTA: Calculamos las vidas con seguridad matemática sobre el estado en vivo
        const vidasActuales = grupoDataCache?.vidas !== undefined ? Number(grupoDataCache.vidas) : 3;

        if (vidasActuales <= 1) {
          // MUERTE SÚBITA REAL: Era su última vida (vidasActuales === 1)
          // Dejamos vidas en 0 y puntos en 0 hasta que toquen el botón de reiniciar
          await updateDoc(grupoDocRef, {
            puntos: 0,
            vidas: 0
          });
          setFeedback({ type: 'gameover', titulo: '¡ATRAPADOS!', subtitulo: 'Quedaron encerrados en la sala de escape.' });
          setIsProcessing(false);
        } else {
          // AÚN TIENEN VIDAS (tenían 3 o 2 vidas): Restamos exactamente 1 vida
          const nuevasVidas = Math.max(1, vidasActuales - 1);
          await updateDoc(grupoDocRef, {
            vidas: nuevasVidas
          });
          setFeedback({ type: 'error', titulo: 'SISTEMA COMPROMETIDO', subtitulo: '-1 VIDA' });
          
          setTimeout(() => {
            setFeedback(null);
            setJuegoActivo(null);
            setIsProcessing(false);
            setView('dashboard');
          }, 3000);
        }
      }
    } catch (error) {
      console.error("Error al validar respuesta:", error);
      alert("Hubo una micro-caída de red. Intentá tocar la opción nuevamente.");
      setIsProcessing(false);
    }
  };

  // ============================================================================
  // REINICIO MANUAL DESPUÉS DE GAME OVER 
  // Restaura las 3 vidas limpias en Firebase cuando el equipo acepta el Game Over
  // ============================================================================
  const handleReiniciarMision = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (grupoDocRef) {
        await updateDoc(grupoDocRef, {
          vidas: 3,
          puntos: 0
        });
      }
    } catch (error) {
      console.error("Error al reiniciar vidas:", error);
    }
    setFeedback(null);
    setJuegoActivo(null);
    setIsProcessing(false);
    setView('dashboard');
  };

  // ================= VISTAS DE FEEDBACK A PANTALLA COMPLETA =================

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
            onClick={handleReiniciarMision}
            disabled={isProcessing}
            className="w-full max-w-sm py-5 bg-red-600 text-white font-black text-sm uppercase tracking-widest rounded-full shadow-[0_0_20px_rgba(220,38,38,0.4)] active:scale-95 transition-transform disabled:opacity-50"
          >
            {isProcessing ? 'Reiniciando Sistema...' : 'Reiniciar Misión a Cero'}
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
  
  // ================= VISTA: DASHBOARD DEL JUGADOR =================
  if (view === 'dashboard') {
    return (
      <DashboardJugador 
        onEscanear={() => setView('escaner')} 
        onSalir={() => { 
          // Al salir volvemos al inicio, pero su deviceId sigue registrado en Firebase
          // por si desea volver a ingresar el mismo PIN más tarde.
          localStorage.removeItem('miGrupoPIN'); 
          setActivePin('');
          setPinGenerado('');
          setPinInput('');
          setNombreEquipo('');
          setView('inicio'); 
        }} 
      />
    );
  }

  // ================= VISTA: ESCÁNER QR =================
  if (view === 'escaner') {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center p-5">
        <h2 className="text-2xl font-black mb-4 text-yellow-400 tracking-widest uppercase mt-8">Cámara de Escaneo</h2>
        <p className="mb-8 text-gray-500 text-center text-sm">Apuntá al código QR del puesto físico.</p>
        
        <div className="w-full max-w-md rounded-2xl overflow-hidden border-2 border-yellow-400 relative mb-8">
          <Scanner 
            onScan={handleScan}
            options={{ delayBetweenScanAttempts: 1200 }} 
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

  // ================= VISTA: TRIVIA =================
  if (view === 'trivia' && juegoActivo) {
    const vidasMostradas = grupoDataCache?.vidas !== undefined ? grupoDataCache.vidas : 3;

    return (
      <div className="min-h-screen bg-[#050505] text-white p-6 flex flex-col">
        <header className="mb-6 mt-4 flex justify-between items-center">
          <span className="text-yellow-400 font-mono text-sm tracking-widest uppercase">SALA DESBLOQUEADA</span>
          <div className="flex gap-1">
            {[1, 2, 3].map((vida) => (
              <span key={vida} className={`text-xl ${vida <= vidasMostradas ? 'opacity-100' : 'opacity-30'}`}>❤️</span>
            ))}
          </div>
        </header>

        {/* Alerta parpadeante cuando al equipo le queda exactamente 1 vida */}
        {vidasMostradas === 1 && (
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
              disabled={isProcessing} // Bloquea los botones apenas se toca una respuesta
              className="text-left bg-[#111] border-2 border-white/10 p-5 rounded-xl text-sm font-bold active:bg-yellow-400 active:text-black transition-colors disabled:opacity-50"
            >
              <span className="text-yellow-400 mr-2">{op.id.toUpperCase()}.</span> {op.texto}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ================= VISTAS DE ONBOARDING (INICIO / CREAR / UNIR) =================
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
            
            {/* Caja de PIN generado + Botón para compartir por WhatsApp (SOLUCIÓN PUNTO 2) */}
            {pinGenerado && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ padding: '15px', background: 'var(--amarillo)', color: 'var(--tinta)', textAlign: 'center', fontSize: '32px', fontWeight: '900', letterSpacing: '10px', borderRadius: '12px' }}>
                  {pinGenerado}
                </div>
                <button 
                  type="button"
                  onClick={() => handleCompartirPin(pinGenerado)}
                  className="onb-btn secondary"
                  style={{ marginTop: '12px', width: '100%', borderColor: 'var(--amarillo)', color: 'var(--amarillo)', fontWeight: 'bold' }}
                >
                  📲 Compartir PIN por WhatsApp
                </button>
              </div>
            )}

            {!pinGenerado ? (
              <button type="submit" className="onb-btn primary mt-8" style={{ marginTop: '30px' }} disabled={loading}>
                {loading ? 'Generando...' : 'Crear y Generar PIN'}
              </button>
            ) : (
              <button type="button" className="onb-btn primary mt-8" style={{ marginTop: '16px' }} onClick={() => setView('dashboard')}>
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