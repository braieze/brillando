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
// HELPER 1: IDENTIDAD DE DISPOSITIVO
// Genera y guarda una huella única en el navegador del celular para reconocer
// al Capitán 1 o Capitán 2 aunque cierren la pestaña por accidente.
// ============================================================================
const obtenerDeviceId = () => {
  let deviceId = localStorage.getItem('brillando_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    localStorage.setItem('brillando_device_id', deviceId);
  }
  return deviceId;
};

// ============================================================================
// HELPER 2: TIMEOUT ANTI-CONGELAMIENTO (SOLUCIÓN PUNTO 5)
// Envuelve cualquier promesa de Firebase con un límite de 5 segundos.
// Si el Wi-Fi o 4G del salón colapsa en ese instante, evita que el celular
// quede bloqueado para siempre y lanza un error controlado.
// ============================================================================
const ejecutarConTimeout = (promesa, ms = 5000) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("TIMEOUT_RED"));
    }, ms);
  });
  return Promise.race([promesa, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

export default function Juego() {
  // Estados de sesión e identidad
  const [activePin, setActivePin] = useState(() => localStorage.getItem('miGrupoPIN') || '');
  const [view, setView] = useState(() => localStorage.getItem('miGrupoPIN') ? 'dashboard' : 'inicio');
  
  const [pinInput, setPinInput] = useState('');
  const [pinGenerado, setPinGenerado] = useState('');
  const [nombreEquipo, setNombreEquipo] = useState('');
  
  // Nuevos estados para los nombres de Capitán 1 (creador) y Capitán 2 (quien se une)
  const [nombreCapitan1, setNombreCapitan1] = useState('');
  const [nombreCapitan2, setNombreCapitan2] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estados de la mecánica de juego y trivia
  const [juegoActivo, setJuegoActivo] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // SOLUCIÓN PUNTO 2 (ANTI-TOQUE ACCIDENTAL):
  // Controla si las opciones de la trivia ya se desplegaron o siguen ocultas
  const [mostrarOpciones, setMostrarOpciones] = useState(false);

  // SOLUCIÓN PUNTO 4 (PREVENCIÓN DE DOBLE INSTANCIA DE CÁMARA):
  // Bloquea por 1 segundo el botón de abrir cámara para evitar doble invocación
  const [scannerCooldown, setScannerCooldown] = useState(false);

  // Candado Anti-Spam general para respuestas
  const [isProcessing, setIsProcessing] = useState(false);

  // Datos en tiempo real del grupo y ranking
  const [grupoDataCache, setGrupoDataCache] = useState(null);
  const [grupoDocRef, setGrupoDocRef] = useState(null);
  const [rankingActual, setRankingActual] = useState('-');

  // ============================================================================
  // 1. ESCUCHADOR PERMANENTE DEL GRUPO EN TIEMPO REAL
  // Mantiene los datos del escuadrón sincronizados sin cortarse entre vistas.
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
        setGrupoDocRef(docSnap.ref);
      }
    });

    return () => unsubscribe();
  }, [activePin]);

  // ============================================================================
  // 2. ESCUCHADOR DE RANKING GLOBAL EN VIVO (SOLUCIÓN PUNTO 3: "TOP -")
  // Escucha todos los grupos, los ordena por puntaje de mayor a menor y calcula
  // en qué puesto exacto está parado este escuadrón. Además sincroniza el campo
  // `ranking` en el documento para que DashboardJugador lo muestre al instante.
  // ============================================================================
  useEffect(() => {
    if (!activePin) return;

    const qTodos = query(collection(db, "grupos"));
    const unsubscribeRanking = onSnapshot(qTodos, (snap) => {
      const listaGrupos = snap.docs.map(doc => ({
        pin: doc.data().pin,
        puntos: Number(doc.data().puntos || 0),
        rankingGuardado: doc.data().ranking
      }));

      // Ordenamos de mayor a menor puntaje
      listaGrupos.sort((a, b) => b.puntos - a.puntos);

      // Buscamos la posición de nuestro PIN
      const index = listaGrupos.findIndex(g => g.pin === activePin);
      if (index !== -1 && listaGrupos[index].puntos > 0) {
        const puestoCalculado = index + 1;
        setRankingActual(puestoCalculado);

        // Si el documento en Firebase todavía tiene '-' o un puesto viejo, lo actualizamos
        // para que DashboardJugador.jsx (que lee data.ranking) reciba el número real
        if (grupoDocRef && listaGrupos[index].rankingGuardado !== puestoCalculado) {
          updateDoc(grupoDocRef, { ranking: puestoCalculado }).catch(() => {});
        }
      } else {
        setRankingActual('-');
        if (grupoDocRef && listaGrupos[index]?.rankingGuardado !== '-') {
          updateDoc(grupoDocRef, { ranking: '-' }).catch(() => {});
        }
      }
    });

    return () => unsubscribeRanking();
  }, [activePin, grupoDocRef]);

  // ============================================================================
  // 3. DETECTOR DE CONCURRENCIA ENTRE CAPITÁN 1 Y CAPITÁN 2
  // Si ambos capitanes escanean el mismo QR a la vez, avisa cuando el otro
  // compañero resuelve la sala o pierde la última vida.
  // ============================================================================
  useEffect(() => {
    if (view === 'trivia' && juegoActivo && !isProcessing && !feedback) {
      
      // Caso A: El otro capitán ya superó esta sala
      if (grupoDataCache?.juegosCompletados?.includes(juegoActivo.id)) {
        setFeedback({
          type: 'success',
          titulo: '¡SALA YA RESUELTA!',
          subtitulo: 'El otro Capitán acaba de superar este desafío (+50 PTS)'
        });

        const timer = setTimeout(() => {
          setFeedback(null);
          setJuegoActivo(null);
          setMostrarOpciones(false);
          setView('dashboard');
        }, 3000);
        return () => clearTimeout(timer);
      }

      // Caso B: El otro capitán perdió la última vida del equipo
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
  // 4. CREAR GRUPO Y REGISTRAR AL CAPITÁN 1 (DISPOSITIVO 1)
  // ============================================================================
  const handleCrearGrupo = async (e) => {
    e.preventDefault();
    if (!nombreEquipo.trim()) return alert("Ingresá un nombre para tu escuadrón.");
    if (!nombreCapitan1.trim()) return alert("Ingresá tu nombre como Capitán 1.");
    
    setLoading(true);
    const nuevoPin = Math.floor(1000 + Math.random() * 9000).toString();
    const miDeviceId = obtenerDeviceId();
    
    try {
      await ejecutarConTimeout(
        addDoc(collection(db, "grupos"), {
          pin: nuevoPin,
          nombre: nombreEquipo.trim().toUpperCase(),
          capitan1: nombreCapitan1.trim().toUpperCase(),
          capitan2: 'PENDIENTE',
          puntos: 0,
          vidas: 3,
          ranking: '-',
          juegosCompletados: [],
          creadoEn: new Date(),
          integrantes: 1,
          dispositivos: [miDeviceId]
        })
      );
      
      setPinGenerado(nuevoPin);
      localStorage.setItem('miGrupoPIN', nuevoPin);
      localStorage.setItem('miRolCapitan', 'CAPITÁN 1: ' + nombreCapitan1.trim().toUpperCase());
      setActivePin(nuevoPin);
    } catch (error) {
      console.error("Error al crear grupo:", error);
      alert(error.message === "TIMEOUT_RED" 
        ? "Señal débil. Volvé a intentarlo." 
        : "Error de conexión. Intentá de nuevo.");
    }
    setLoading(false);
  };

  // ============================================================================
  // 5. COMPARTIR PIN POR WHATSAPP CON LINK Y REGLA DE LOS 2 CAPITANES
  // ============================================================================
  const handleCompartirPin = async (pinParaCompartir) => {
    const codigo = pinParaCompartir || pinGenerado || activePin;
    const equipo = nombreEquipo ? nombreEquipo.trim().toUpperCase() : (grupoDataCache?.nombre || 'NUESTRO ESCUADRÓN');
    const cap1 = nombreCapitan1 ? nombreCapitan1.trim().toUpperCase() : (grupoDataCache?.capitan1 || 'CAPITÁN 1');

    // Mensaje estructurado con link oficial y aclaración de Capitanes 1 y 2
    const mensaje = 
`⚡ *¡ARMÉ EL ESCUADRÓN "${equipo}" PARA EL JUEGO DE BRILLANDO!* ⚡

🔑 *Código PIN:* ${codigo}
🌐 *Entrá acá para unirte:* https://brillando.vercel.app/juego

👥 *IMPORTANTE:* Cada equipo tiene *2 Capitanes* (Capitán 1 y Capitán 2, uno por cada celular conectado).
• *Capitán 1 (Dispositivo 1):* ${cap1}
• *Capitán 2 (Dispositivo 2):* ¡Entrá al link, tocá "Ya tengo un PIN" y sumate como Capitán 2!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Escuadrón ${equipo} - Brillando`,
          text: mensaje,
        });
      } catch (err) {
        console.log('Compartir cancelado por el usuario');
      }
    } else {
      const urlWhatsapp = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
      window.open(urlWhatsapp, '_blank');
    }
  };

  // ============================================================================
  // 6. UNIRSE AL GRUPO Y REGISTRAR AL CAPITÁN 2 (DISPOSITIVO 2)
  // ============================================================================
  const handleUnirse = async (e) => {
    if (e) e.preventDefault();
    if (pinInput.length !== 4) return;
    if (!nombreCapitan2.trim()) return alert("Ingresá tu nombre de Capitán para continuar.");
    
    setLoading(true);
    const miDeviceId = obtenerDeviceId();
    const nombreCapLimpio = nombreCapitan2.trim().toUpperCase();

    try {
      const q = query(collection(db, "grupos"), where("pin", "==", pinInput));
      const querySnapshot = await ejecutarConTimeout(getDocs(q));

      if (querySnapshot.empty) {
        alert("ACCESO DENEGADO. El PIN no existe.");
      } else {
        const docSnap = querySnapshot.docs[0];
        const datosGrupo = docSnap.data();
        const dispositivosRegistrados = datosGrupo.dispositivos || [];

        // Verificamos si este celular ya estaba registrado como Capitán 1 o Capitán 2
        const indiceDispositivo = dispositivosRegistrados.indexOf(miDeviceId);

        if (indiceDispositivo !== -1) {
          // Reconoció el celular: reingresa sin ocupar un cupo extra
          localStorage.setItem('miGrupoPIN', pinInput);
          localStorage.setItem('miRolCapitan', `CAPITÁN ${indiceDispositivo + 1}: ${nombreCapLimpio}`);
          setActivePin(pinInput);
          setView('dashboard');
        } else {
          // Es un celular nuevo: validamos el máximo estricto de 2 dispositivos (Capitán 1 y Capitán 2)
          const cupoActual = dispositivosRegistrados.length > 0 
            ? dispositivosRegistrados.length 
            : (datosGrupo.integrantes || 1);

          if (cupoActual >= 2) {
            alert("ACCESO DENEGADO. Este escuadrón ya tiene a sus 2 Capitanes conectados (Máximo 2 dispositivos).");
          } else {
            await ejecutarConTimeout(
              updateDoc(docSnap.ref, {
                integrantes: increment(1),
                dispositivos: arrayUnion(miDeviceId),
                capitan2: nombreCapLimpio
              })
            );
            localStorage.setItem('miGrupoPIN', pinInput);
            localStorage.setItem('miRolCapitan', `CAPITÁN 2: ${nombreCapLimpio}`);
            setActivePin(pinInput);
            setView('dashboard');
          }
        }
      }
    } catch (error) {
      console.error("Error al unirse:", error);
      alert(error.message === "TIMEOUT_RED" 
        ? "Señal débil. Volvé a intentarlo." 
        : "Error de conexión al buscar el grupo.");
    }
    setLoading(false);
  };

  // ============================================================================
  // 7. APERTURA SEGURA DE CÁMARA (SOLUCIÓN PUNTO 4: ANTI-DOBLE TOQUE)
  // Bloquea durante 1 segundo el cambio a la cámara para evitar que un doble
  // toque rápido trabe el hardware del celular.
  // ============================================================================
  const handleAbrirEscanerSeguro = () => {
    if (scannerCooldown || isProcessing) return;
    setScannerCooldown(true);
    setView('escaner');
    setTimeout(() => {
      setScannerCooldown(false);
    }, 1000);
  };

  // ============================================================================
  // 8. LECTURA DEL CÓDIGO QR + PREPARACIÓN DE TRIVIA SIN TOQUE ACCIDENTAL
  // ============================================================================
  const handleScan = (resultado) => {
    if (!resultado || isProcessing) return;
    
    const textoQR = Array.isArray(resultado) ? resultado[0]?.rawValue : (resultado?.text || resultado);
    if (!textoQR) return;

    const baseJuego = diccionarioJuegos[textoQR.trim()];
    
    if (baseJuego) {
      // Bloquea si el juego ya está dentro de juegosCompletados
      if (grupoDataCache?.juegosCompletados?.includes(baseJuego.id)) {
        alert("⚠️ MISIÓN YA COMPLETADA. Busquen otro puesto para seguir sumando.");
        setView('dashboard');
        return;
      }

      // Sorteamos una pregunta aleatoria del banco de esa estación
      const randomIndex = Math.floor(Math.random() * baseJuego.preguntas.length);
      const preguntaSorteada = baseJuego.preguntas[randomIndex];

      // SOLUCIÓN PUNTO 2: Iniciamos con las opciones ocultas para que no respondan sin querer al enfocar
      setMostrarOpciones(false);
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
  // 9. VALIDACIÓN DE TRIVIA CON TIMEOUT DE 5s Y RESETEO TOTAL EN GAME OVER
  // ============================================================================
  const validarRespuesta = async (opcionSeleccionada) => {
    if (isProcessing || !juegoActivo || !grupoDocRef) return;
    setIsProcessing(true);

    try {
      // Verifica si el otro Capitán ya ganó esta sala hace un instante
      if (grupoDataCache?.juegosCompletados?.includes(juegoActivo.id)) {
        setFeedback({ type: 'success', titulo: '¡SALA YA RESUELTA!', subtitulo: 'El otro Capitán ya sumó estos puntos' });
        setTimeout(() => {
          setFeedback(null);
          setJuegoActivo(null);
          setMostrarOpciones(false);
          setIsProcessing(false);
          setView('dashboard');
        }, 2500);
        return;
      }

      if (opcionSeleccionada === juegoActivo.correcta) {
        // RESPUESTA CORRECTA: Protegida con timeout de 5 segundos
        await ejecutarConTimeout(
          updateDoc(grupoDocRef, {
            puntos: increment(50),
            juegosCompletados: arrayUnion(juegoActivo.id)
          })
        );
        
        setFeedback({ type: 'success', titulo: '¡SALA SUPERADA!', subtitulo: '+50 PUNTOS' });
        
        setTimeout(() => {
          setFeedback(null);
          setJuegoActivo(null);
          setMostrarOpciones(false);
          setIsProcessing(false);
          setView('dashboard');
        }, 3000);

      } else {
        // RESPUESTA INCORRECTA
        const vidasActuales = grupoDataCache?.vidas !== undefined ? Number(grupoDataCache.vidas) : 3;

        if (vidasActuales <= 1) {
          // SOLUCIÓN PUNTO 1 (EL RESETEO TOTAL ABSOLUTO):
          // Al perder la última vida, limpiamos puntos: 0, vidas: 0 y vaciamos juegosCompletados: []
          // para que puedan volver a escanear cualquier QR desde cero sin quedar bloqueados.
          await ejecutarConTimeout(
            updateDoc(grupoDocRef, {
              puntos: 0,
              vidas: 0,
              ranking: '-',
              juegosCompletados: [] // <-- Historial en blanco para poder rejugar todas las estaciones
            })
          );
          setFeedback({ type: 'gameover', titulo: '¡ATRAPADOS!', subtitulo: 'Quedaron encerrados en la sala de escape.' });
          setIsProcessing(false);
        } else {
          // Aún les quedan vidas: restamos 1 vida
          const nuevasVidas = Math.max(1, vidasActuales - 1);
          await ejecutarConTimeout(
            updateDoc(grupoDocRef, {
              vidas: nuevasVidas
            })
          );
          setFeedback({ type: 'error', titulo: 'SISTEMA COMPROMETIDO', subtitulo: '-1 VIDA' });
          
          setTimeout(() => {
            setFeedback(null);
            setJuegoActivo(null);
            setMostrarOpciones(false);
            setIsProcessing(false);
            setView('dashboard');
          }, 3000);
        }
      }
    } catch (error) {
      console.error("Error al validar respuesta:", error);
      // SOLUCIÓN PUNTO 5: Si Firebase tarda más de 5 segundos, soltamos el candado y avisamos
      alert("Señal débil. Volvé a intentarlo.");
      setIsProcessing(false);
    }
  };

  // ============================================================================
  // 10. REINICIO MANUAL DESPUÉS DE GAME OVER (SOLUCIÓN PUNTO 1)
  // Restaura las 3 vidas, deja puntos en 0 y asegura juegosCompletados vacío []
  // ============================================================================
  const handleReiniciarMision = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (grupoDocRef) {
        await ejecutarConTimeout(
          updateDoc(grupoDocRef, {
            vidas: 3,
            puntos: 0,
            ranking: '-',
            juegosCompletados: [] // Garantiza que todos los puestos vuelvan a estar "Pendientes"
          })
        );
      }
      setFeedback(null);
      setJuegoActivo(null);
      setMostrarOpciones(false);
      setIsProcessing(false);
      setView('dashboard');
    } catch (error) {
      console.error("Error al reiniciar misión:", error);
      alert("Señal débil. Volvé a intentarlo.");
      setIsProcessing(false);
    }
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
            {feedback.subtitulo}<br/>
            <span className="text-white">Perdieron sus puntos y las misiones se reiniciaron a cero.</span>
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
      <div className="relative">
        {/* Barra superior de Capitanes + Botón rápido para reenviar PIN e invitación por WhatsApp */}
        <div className="bg-[#0a0f1c] border-b border-blue-500/20 px-5 py-2.5 flex items-center justify-between text-[11px] font-mono text-gray-300">
          <div className="truncate pr-2">
            <span className="text-yellow-400 font-bold">CAP 1:</span> {grupoDataCache?.capitan1 || '---'} 
            <span className="mx-2 text-gray-600">|</span>
            <span className="text-blue-400 font-bold">CAP 2:</span> {grupoDataCache?.capitan2 || 'ESPERANDO...'}
          </div>
          <button
            onClick={() => handleCompartirPin(activePin)}
            className="shrink-0 rounded-full bg-yellow-400/10 border border-yellow-400/40 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-yellow-400 active:scale-95"
          >
            📲 Invitar Cap 2
          </button>
        </div>

        <DashboardJugador 
          rankingEnVivo={rankingActual}
          onEscanear={handleAbrirEscanerSeguro} 
          onSalir={() => { 
            localStorage.removeItem('miGrupoPIN'); 
            setActivePin('');
            setPinGenerado('');
            setPinInput('');
            setNombreEquipo('');
            setView('inicio'); 
          }} 
        />
      </div>
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

  // ================= VISTA: TRIVIA (CON TRANSICIÓN ANTI-TOQUE ACCIDENTAL) =================
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
        
        {/* Contenedor de la pregunta que se desplaza suavemente hacia arriba al tocar "RESPONDER" */}
        <div className={`transition-all duration-500 ease-out flex flex-col ${mostrarOpciones ? 'mt-0 mb-6' : 'my-auto py-8'}`}>
          <h2 className="text-3xl font-black uppercase mb-4 text-yellow-400">{juegoActivo.titulo}</h2>
          <p className={`text-gray-100 leading-relaxed font-bold transition-all duration-500 ${mostrarOpciones ? 'text-lg' : 'text-2xl'}`}>
            {juegoActivo.pregunta}
          </p>
        </div>
        
        {/* SOLUCIÓN PUNTO 2: Primero mostramos el botón "RESPONDER", luego las opciones en fila */}
        {!mostrarOpciones ? (
          <div className="mt-auto mb-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setMostrarOpciones(true)}
              className="w-full rounded-full bg-yellow-400 py-5 text-sm font-black uppercase tracking-widest text-black shadow-[0_0_25px_rgba(250,204,21,0.3)] transition-transform active:scale-95"
            >
              Responder Pregunta
            </button>
            <button
              type="button"
              onClick={() => { setJuegoActivo(null); setMostrarOpciones(false); setView('dashboard'); }}
              className="w-full rounded-full border border-white/15 bg-white/5 py-3.5 text-xs font-bold uppercase tracking-widest text-gray-400"
            >
              Volver al Escuadrón
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 mt-auto mb-4 animate-fadeIn">
            {juegoActivo.opciones.map((op) => (
              <button 
                key={op.id}
                onClick={() => validarRespuesta(op.id)}
                disabled={isProcessing}
                className="text-left bg-[#111] border-2 border-white/10 p-5 rounded-xl text-sm font-bold active:bg-yellow-400 active:text-black transition-all disabled:opacity-50"
              >
                <span className="text-yellow-400 mr-2">{op.id.toUpperCase()}.</span> {op.texto}
              </button>
            ))}
          </div>
        )}
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
              Cada escuadrón cuenta con <strong>2 Capitanes</strong> (Capitán 1 y Capitán 2, un dispositivo cada uno). Creá tu grupo o sumate con tu PIN.
            </p>
          </>
        )}

        {view === 'crear' && (
          <form onSubmit={!pinGenerado ? handleCrearGrupo : (e) => { e.preventDefault(); setView('dashboard'); }}>
            <h1 className="onb-title small">Capitán 1</h1>
            <p className="onb-desc">
              Nombrá a tu escuadrón y registrate como el <strong>Capitán 1</strong> (Dispositivo 1).
            </p>
            
            <input
              className="onb-pin-input"
              style={{ letterSpacing: 'normal', textAlign: 'left', fontSize: '20px', maxWidth: '300px', marginBottom: '12px' }}
              type="text"
              placeholder="Nombre del Escuadrón"
              value={nombreEquipo}
              onChange={(e) => setNombreEquipo(e.target.value)}
              required
              autoFocus
              disabled={!!pinGenerado} 
            />

            <input
              className="onb-pin-input"
              style={{ letterSpacing: 'normal', textAlign: 'left', fontSize: '20px', maxWidth: '300px' }}
              type="text"
              placeholder="Tu nombre (Capitán 1)"
              value={nombreCapitan1}
              onChange={(e) => setNombreCapitan1(e.target.value)}
              required
              disabled={!!pinGenerado} 
            />
            
            {/* Caja de PIN generado + Botón para compartir por WhatsApp con el link oficial */}
            {pinGenerado && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ padding: '15px', background: 'var(--amarillo)', color: 'var(--tinta)', textAlign: 'center', fontSize: '32px', fontWeight: '900', letterSpacing: '10px', borderRadius: '12px' }}>
                  {pinGenerado}
                </div>
                <p style={{ fontSize: '12px', opacity: 0.8, marginTop: '8px', textAlign: 'center' }}>
                  Compartile este PIN al <strong>Capitán 2</strong> para que conecte el segundo dispositivo:
                </p>
                <button 
                  type="button"
                  onClick={() => handleCompartirPin(pinGenerado)}
                  className="onb-btn secondary"
                  style={{ marginTop: '10px', width: '100%', borderColor: 'var(--amarillo)', color: 'var(--amarillo)', fontWeight: 'bold' }}
                >
                  📲 Compartir PIN y Link por WhatsApp
                </button>
              </div>
            )}

            {!pinGenerado ? (
              <button type="submit" className="onb-btn primary mt-8" style={{ marginTop: '24px' }} disabled={loading}>
                {loading ? 'Generando...' : 'Crear y Generar PIN'}
              </button>
            ) : (
              <button type="button" className="onb-btn primary mt-8" style={{ marginTop: '14px' }} onClick={() => setView('dashboard')}>
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
            <h1 className="onb-title small">Capitán 2</h1>
            <p className="onb-desc">
              Ingresá tu nombre como <strong>Capitán 2</strong> (Dispositivo 2) y el PIN de 4 dígitos que te pasó el Capitán 1.
            </p>
            <input
              className="onb-pin-input"
              style={{ letterSpacing: 'normal', textAlign: 'left', fontSize: '20px', maxWidth: '300px', marginBottom: '14px' }}
              type="text"
              placeholder="Tu nombre (Capitán 2)"
              value={nombreCapitan2}
              onChange={(e) => setNombreCapitan2(e.target.value)}
              required
              autoFocus
            />
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
            />
          </form>
        )}
      </div>

      <div className="onb-actions">
        {view === 'inicio' && (
          <>
            <button className="onb-btn primary" onClick={() => setView('crear')}>
              Crear grupo (Capitán 1)
            </button>
            <button className="onb-btn secondary" onClick={() => setView('unir')}>
              Ya tengo un PIN (Capitán 2)
            </button>
          </>
        )}

        {view === 'unir' && (
          <>
            <button 
              className="onb-btn primary" 
              onClick={handleUnirse}
              disabled={loading || pinInput.length !== 4 || !nombreCapitan2.trim()}
            >
              {loading ? 'Sincronizando...' : 'Sincronizar como Capitán 2'}
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