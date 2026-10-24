import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, updateDoc, increment, arrayUnion, onSnapshot } from "firebase/firestore";
import { Scanner } from '@yudiel/react-qr-scanner';
import { db } from '../../config/firebase';
import DashboardJugador from './DashboardJugador';
import './Juego.css';

// ============================================================================
// DICCIONARIO DE JUEGOS Y PREGUNTAS
// Mapea el texto de cada código QR físico con su sala, puntaje, info y banco de preguntas.
// ============================================================================
const diccionarioJuegos = {
  'qr-basquet': {
    id: 1, 
    titulo: 'Aro de Basquet',
    puntos: 25,
    tipo: 'normal',
    info: 'Embocar la pelota de basquet: tienen 3 tiros y ganan si embocan al menos 1 de esos tiros. Vale 25 puntos porque se juega de una.',
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
  'qr-bowling': {
    id: 2,
    titulo: 'Bowling con botellas de agua',
    puntos: 25,
    tipo: 'normal',
    info: 'Se enfrentan 2 equipos: quien tire más botellas con la pelota tirada con la mano gana el acceso al QR. Vale 25 puntos.',
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
  'qr-ppt': {
    id: 3,
    titulo: 'Piedra papel o tijera',
    puntos: 25,
    tipo: 'normal',
    info: 'Se enfrentan 2 equipos y el ganador a 3 rounds (no se cuentan los empates) accede al QR. El juego termina 2-0 o 2-1. Vale 25 puntos.',
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
  'qr-arco': {
    id: 4,
    titulo: 'Arco con Agujeritos',
    puntos: 50,
    tipo: 'normal',
    info: 'Hay un arco con una tela con agujeros: se enfrentan 2 equipos y quien emboque la mayor cantidad en 3 oportunidades gana. Vale 50 puntos.',
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
  },
  'qr-aro': {
    id: 5,
    titulo: 'Embocar el aro',
    puntos: 50,
    tipo: 'normal',
    info: 'Son 3 intentos: si embocás al menos 1 de 3 veces el aro en la botella, accedés al QR. Vale 50 puntos.',
    preguntas: [
      {
        texto: 'Cuando nadie te está mirando, ¿quién sos realmente?',
        opciones: [
          { id: 'a', texto: 'La misma persona que muestro en público' },
          { id: 'b', texto: 'Alguien totalmente distinto' },
          { id: 'c', texto: 'Depende del estado de ánimo' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Qué hacés frente a la presión de tu grupo de amigos?',
        opciones: [
          { id: 'a', texto: 'Cedo para no quedar afuera' },
          { id: 'b', texto: 'Mantengo mis convicciones con respeto' },
          { id: 'c', texto: 'Cambio de tema para zafar' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Salir del molde requiere principalmente...',
        opciones: [
          { id: 'a', texto: 'Tener muchos seguidores' },
          { id: 'b', texto: 'Valentía para vivir en la verdad' },
          { id: 'c', texto: 'No escuchar a nadie nunca' }
        ],
        correcta: 'b'
      }
    ]
  },
  'qr-vasitos': {
    id: 6,
    titulo: 'Torre de vasitos',
    puntos: 50,
    tipo: 'normal',
    info: 'Se enfrentan 2 equipos con 2 torres: quien primero junte todos los vasitos accede al QR. Dificultad: hay una pelota en la cima que no se tiene que caer ni tocar con la mano. Vale 50 puntos.',
    preguntas: [
      {
        texto: 'Para construir una vida firme que no se derrumbe, la base debe ser:',
        opciones: [
          { id: 'a', texto: 'La aprobación de la gente' },
          { id: 'b', texto: 'La roca de la palabra de Dios' },
          { id: 'c', texto: 'Mis propios logros y esfuerzos' }
        ],
        correcta: 'b'
      },
      {
        texto: '¿Qué pasa cuando intentamos sostener todo por nuestra propia fuerza?',
        opciones: [
          { id: 'a', texto: 'Nos agotamos y tarde o temprano caemos' },
          { id: 'b', texto: 'Nos volvemos invencibles' },
          { id: 'c', texto: 'No necesitamos de nadie más' }
        ],
        correcta: 'a'
      },
      {
        texto: 'El equilibrio y el dominio propio en momentos de presión vienen de:',
        opciones: [
          { id: 'a', texto: 'Reprimir lo que siento' },
          { id: 'b', texto: 'Un corazón en paz conectado con Dios' },
          { id: 'c', texto: 'Hacer todo a las apuradas' }
        ],
        correcta: 'b'
      }
    ]
  },
  'qr-elastico': {
    id: 7,
    titulo: 'Elastico Vaso',
    puntos: 70,
    tipo: 'normal',
    info: 'Se juega en equipo: quien agarra 3 vasos y los emboca en otro vaso en menor tiempo gana. Dificultad: los vasos se llevan únicamente con un elástico. Vale 70 puntos.',
    preguntas: [
      {
        texto: '¿Por qué Dios nos diseñó para caminar en equipo y no aislados?',
        opciones: [
          { id: 'a', texto: 'Porque juntos llegamos adonde solos no podemos' },
          { id: 'b', texto: 'Para echarle la culpa a otro si algo sale mal' },
          { id: 'c', texto: 'Para competir entre nosotros' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Cuando un amigo de tu grupo está tirando para atrás o pasando un mal momento, ¿qué hacés?',
        opciones: [
          { id: 'a', texto: 'Lo dejo de lado para avanzar más rápido' },
          { id: 'b', texto: 'Lo escucho, lo levanto y tiramos juntos' },
          { id: 'c', texto: 'Hago de cuenta que no pasa nada' }
        ],
        correcta: 'b'
      },
      {
        texto: 'La verdadera unidad en un escuadrón se logra cuando:',
        opciones: [
          { id: 'a', texto: 'Uno manda a los gritos y el resto obedece' },
          { id: 'b', texto: 'Hay empatía, comunicación y un mismo propósito' },
          { id: 'c', texto: 'Cada uno hace la suya' }
        ],
        correcta: 'b'
      }
    ]
  },
  'qr-tateti': {
    id: 8,
    titulo: 'Tateti con botellas',
    puntos: 80,
    tipo: 'normal',
    info: 'Se enfrentan 2 equipos (3 personas por equipo, una detrás de otra): hacen bottle challenge y quien deja la botella de pie corre a mover la ficha del tatetí hasta que un equipo gane. Vale 80 puntos.',
    preguntas: [
      {
        texto: 'Cada decisión diaria es una jugada en tu vida. ¿Cómo elegís dar el próximo paso?',
        opciones: [
          { id: 'a', texto: 'Por impulso y sin pensar en las consecuencias' },
          { id: 'b', texto: 'Con propósito y mirando la meta correcta' },
          { id: 'c', texto: 'Copiando lo que hace la mayoría' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Si intentás algo bueno y fallás en el primer intento, ¿cuál es la actitud correcta?',
        opciones: [
          { id: 'a', texto: 'Abandonar porque no nací para eso' },
          { id: 'b', texto: 'Perseverar y volver a levantarme con fe' },
          { id: 'c', texto: 'Enojarme con mi equipo' }
        ],
        correcta: 'b'
      },
      {
        texto: 'En la carrera de la fe, ganar de verdad significa:',
        opciones: [
          { id: 'a', texto: 'Mantenerme fiel al llamado de Dios hasta el final' },
          { id: 'b', texto: 'Pasar por encima de los demás' },
          { id: 'c', texto: 'Aparentar que nunca me equivoco' }
        ],
        correcta: 'a'
      }
    ]
  },
  'qr-secreto-1': {
    id: 9,
    titulo: 'QR Secreto #1',
    puntos: 100,
    tipo: 'bonus',
    info: '¡Encontraste uno de los 2 códigos QR escondidos en el salón! Sumás 100 puntos gratis de forma directa.',
    preguntas: []
  },
  'qr-secreto-2': {
    id: 10,
    titulo: 'QR Secreto #2',
    puntos: 100,
    tipo: 'bonus',
    info: '¡Encontraste uno de los 2 códigos QR escondidos en el salón! Sumás 100 puntos gratis de forma directa.',
    preguntas: []
  },
  'qr-trampa': {
    id: 11,
    titulo: 'QR Escondido · Trampa',
    puntos: -100,
    tipo: 'trampa',
    info: '¡Cuidado! Escaneaste el QR trampa escondido en el salón. Si respondés bien la pregunta mantenés tus puntos intactos; si respondés mal se te restan 100 puntos.',
    preguntas: [
      {
        texto: '¡ALERTA DE TRAMPA! No todo lo que brilla es oro. ¿Cómo detectás un engaño que quiere atraparte?',
        opciones: [
          { id: 'a', texto: 'Me dejo llevar por lo que parece fácil y atractivo' },
          { id: 'b', texto: 'Pruebo todo sin medir las consecuencias' },
          { id: 'c', texto: 'Lo confronto con la verdad de Dios antes de actuar' }
        ],
        correcta: 'c'
      },
      {
        texto: '¡ALERTA DE TRAMPA! Cuando aparece una tentación disfrazada de atajo, ¿qué hacés?',
        opciones: [
          { id: 'a', texto: 'Me aparto a tiempo y cuido mi corazón' },
          { id: 'b', texto: 'Caigo porque nadie se va a enterar' },
          { id: 'c', texto: 'Le digo a otro que pruebe primero' }
        ],
        correcta: 'a'
      },
      {
        texto: '¡ALERTA DE TRAMPA! ¿Qué nos protege de caer en las trampas del molde actual?',
        opciones: [
          { id: 'a', texto: 'Seguir todas las modas sin cuestionar' },
          { id: 'b', texto: 'Tener discernimiento, identidad clara y amigos reales' },
          { id: 'c', texto: 'Creer que soy más inteligente que todos' }
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
  
  // Nombres de Capitán 1 (creador) y Capitán 2 (quien se une)
  const [nombreCapitan1, setNombreCapitan1] = useState('');
  const [nombreCapitan2, setNombreCapitan2] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estados de la mecánica de juego y trivia
  const [juegoActivo, setJuegoActivo] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Controla si las opciones de la trivia ya se desplegaron o siguen ocultas
  const [mostrarOpciones, setMostrarOpciones] = useState(false);

  // Controla si el cuadro de información (botón "i") del juego está desplegado
  const [mostrarInfoJuego, setMostrarInfoJuego] = useState(false);

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
  // 2. ESCUCHADOR DE RANKING GLOBAL CON DESEMPATE POR TIEMPO
  // Ordena por mayor puntaje y, en caso de empate, queda arriba quien llegó
  // primero a ese puntaje (`ultimaActualizacionPuntos` menor).
  // ============================================================================
  useEffect(() => {
    if (!activePin) return;

    const qTodos = query(collection(db, "grupos"));
    const unsubscribeRanking = onSnapshot(qTodos, (snap) => {
      const listaGrupos = snap.docs.map(doc => {
        const data = doc.data();
        return {
          pin: data.pin,
          puntos: Number(data.puntos || 0),
          tiempo: Number(data.ultimaActualizacionPuntos || Number.MAX_SAFE_INTEGER),
          rankingGuardado: data.ranking
        };
      });

      // Ordenamos de mayor a menor puntaje; si empatan, gana quien llegó antes
      listaGrupos.sort((a, b) => {
        if (b.puntos !== a.puntos) return b.puntos - a.puntos;
        return a.tiempo - b.tiempo;
      });

      const index = listaGrupos.findIndex(g => g.pin === activePin);
      if (index !== -1 && listaGrupos[index].puntos > 0) {
        const puestoCalculado = index + 1;
        setRankingActual(puestoCalculado);

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
  // ============================================================================
  useEffect(() => {
    if (view === 'trivia' && juegoActivo && !isProcessing && !feedback) {
      
      // Caso A: El otro capitán ya superó esta sala
      if (grupoDataCache?.juegosCompletados?.includes(juegoActivo.id)) {
        const textoSubtitulo = juegoActivo.tipo === 'trampa'
          ? 'El otro Capitán ya resolvió este QR trampa'
          : `El otro Capitán acaba de superar este desafío (+${juegoActivo.puntos} PTS)`;

        setFeedback({
          type: 'success',
          titulo: '¡SALA YA RESUELTA!',
          subtitulo: textoSubtitulo
        });

        const timer = setTimeout(() => {
          setFeedback(null);
          setJuegoActivo(null);
          setMostrarOpciones(false);
          setMostrarInfoJuego(false);
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
          ultimaActualizacionPuntos: 0, // Inicializado en 0 para desempates
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

        const indiceDispositivo = dispositivosRegistrados.indexOf(miDeviceId);

        if (indiceDispositivo !== -1) {
          // Si este celular ya pertenecía al grupo, actualiza su nombre si era el Cap 2 y entra directo
          if (indiceDispositivo === 1 && datosGrupo.capitan2 === 'PENDIENTE') {
            await ejecutarConTimeout(
              updateDoc(docSnap.ref, { capitan2: nombreCapLimpio })
            );
          }
          localStorage.setItem('miGrupoPIN', pinInput);
          localStorage.setItem('miRolCapitan', `CAPITÁN ${indiceDispositivo + 1}: ${nombreCapLimpio}`);
          setActivePin(pinInput);
          setView('dashboard');
        } else {
          // Celular nuevo: validamos el máximo estricto de 2 dispositivos
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
  // 7. APERTURA SEGURA DE CÁMARA (ANTI-DOBLE TOQUE)
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
  // 8. LECTURA DEL CÓDIGO QR + PREPARACIÓN DE TRIVIA / BONUS / TRAMPA
  // ============================================================================
  const handleScan = async (resultado) => {
    if (!resultado || isProcessing) return;
    
    const textoQR = Array.isArray(resultado) ? resultado[0]?.rawValue : (resultado?.text || resultado);
    if (!textoQR) return;

    const baseJuego = diccionarioJuegos[textoQR.trim()];
    
    if (baseJuego) {
      if (grupoDataCache?.juegosCompletados?.includes(baseJuego.id)) {
        alert("⚠️ MISIÓN YA COMPLETADA. Busquen otro puesto para seguir sumando.");
        setView('dashboard');
        return;
      }

      // CASO ESPECIAL: Si es uno de los 2 QR escondidos de 100 puntos gratis (tipo 'bonus')
      if (baseJuego.tipo === 'bonus') {
        if (!grupoDocRef) return;
        setIsProcessing(true);
        try {
          await ejecutarConTimeout(
            updateDoc(grupoDocRef, {
              puntos: increment(baseJuego.puntos),
              juegosCompletados: arrayUnion(baseJuego.id),
              ultimaActualizacionPuntos: Date.now()
            })
          );
          setFeedback({
            type: 'success',
            titulo: `¡${baseJuego.titulo.toUpperCase()}!`,
            subtitulo: `+${baseJuego.puntos} PUNTOS GRATIS`
          });
          setTimeout(() => {
            setFeedback(null);
            setJuegoActivo(null);
            setMostrarOpciones(false);
            setMostrarInfoJuego(false);
            setIsProcessing(false);
            setView('dashboard');
          }, 3000);
        } catch (error) {
          console.error("Error al acreditar QR secreto:", error);
          alert("Señal débil. Volvé a intentarlo.");
          setIsProcessing(false);
        }
        return;
      }

      const randomIndex = Math.floor(Math.random() * baseJuego.preguntas.length);
      const preguntaSorteada = baseJuego.preguntas[randomIndex];

      setMostrarOpciones(false);
      setMostrarInfoJuego(false);
      setJuegoActivo({
        id: baseJuego.id,
        titulo: baseJuego.titulo,
        puntos: baseJuego.puntos,
        tipo: baseJuego.tipo || 'normal',
        info: baseJuego.info || '',
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
  // 9. VALIDACIÓN DE TRIVIA CON PUNTAJES PERSONALIZADOS, QR TRAMPA Y DESEMPATE
  // ============================================================================
  const validarRespuesta = async (opcionSeleccionada) => {
    if (isProcessing || !juegoActivo || !grupoDocRef) return;
    setIsProcessing(true);

    try {
      if (grupoDataCache?.juegosCompletados?.includes(juegoActivo.id)) {
        setFeedback({ type: 'success', titulo: '¡SALA YA RESUELTA!', subtitulo: 'El otro Capitán ya sumó estos puntos' });
        setTimeout(() => {
          setFeedback(null);
          setJuegoActivo(null);
          setMostrarOpciones(false);
          setMostrarInfoJuego(false);
          setIsProcessing(false);
          setView('dashboard');
        }, 2500);
        return;
      }

      // LÓGICA ESPECIAL SI EL QR ESCANEADO ES EL QR TRAMPA (-100 PUNTOS SI FALLA / MANTIENE SI ACIERTA)
      if (juegoActivo.tipo === 'trampa') {
        if (opcionSeleccionada === juegoActivo.correcta) {
          // Si responde bien el QR trampa, mantiene sus puntos como están
          await ejecutarConTimeout(
            updateDoc(grupoDocRef, {
              juegosCompletados: arrayUnion(juegoActivo.id)
            })
          );

          setFeedback({
            type: 'success',
            titulo: '¡ZAFASTE DE LA TRAMPA!',
            subtitulo: 'MANTENÉS TUS PUNTOS INTACTOS'
          });
        } else {
          // Si responde mal el QR trampa, se le restan 100 puntos (sin bajar de 0)
          const puntosActuales = Number(grupoDataCache?.puntos || 0);
          const puntosRestados = Math.max(0, puntosActuales - 100);

          await ejecutarConTimeout(
            updateDoc(grupoDocRef, {
              puntos: puntosRestados,
              juegosCompletados: arrayUnion(juegoActivo.id),
              ultimaActualizacionPuntos: Date.now()
            })
          );

          setFeedback({
            type: 'error',
            titulo: '¡CAÍSTE EN LA TRAMPA!',
            subtitulo: '-100 PUNTOS'
          });
        }

        setTimeout(() => {
          setFeedback(null);
          setJuegoActivo(null);
          setMostrarOpciones(false);
          setMostrarInfoJuego(false);
          setIsProcessing(false);
          setView('dashboard');
        }, 3000);
        return;
      }

      // LÓGICA NORMAL PARA LOS 8 JUEGOS DE LA KERMESSE (25, 50, 70 u 80 PUNTOS)
      if (opcionSeleccionada === juegoActivo.correcta) {
        const puntosDelJuego = Number(juegoActivo.puntos || 50);

        // RESPUESTA CORRECTA: Sumamos los puntos específicos del juego y guardamos la hora exacta
        await ejecutarConTimeout(
          updateDoc(grupoDocRef, {
            puntos: increment(puntosDelJuego),
            juegosCompletados: arrayUnion(juegoActivo.id),
            ultimaActualizacionPuntos: Date.now()
          })
        );
        
        setFeedback({ type: 'success', titulo: '¡SALA SUPERADA!', subtitulo: `+${puntosDelJuego} PUNTOS` });
        
        setTimeout(() => {
          setFeedback(null);
          setJuegoActivo(null);
          setMostrarOpciones(false);
          setMostrarInfoJuego(false);
          setIsProcessing(false);
          setView('dashboard');
        }, 3000);

      } else {
        // RESPUESTA INCORRECTA
        const vidasActuales = grupoDataCache?.vidas !== undefined ? Number(grupoDataCache.vidas) : 3;

        if (vidasActuales <= 1) {
          // RESETEO TOTAL ABSOLUTO: Puntos a 0, vidas a 0, historial vacío y tiempo en 0
          await ejecutarConTimeout(
            updateDoc(grupoDocRef, {
              puntos: 0,
              vidas: 0,
              ranking: '-',
              juegosCompletados: [],
              ultimaActualizacionPuntos: 0
            })
          );
          setFeedback({ type: 'gameover', titulo: '¡ATRAPADOS!', subtitulo: 'Quedaron encerrados en la sala de escape.' });
          setIsProcessing(false);
        } else {
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
            setMostrarInfoJuego(false);
            setIsProcessing(false);
            setView('dashboard');
          }, 3000);
        }
      }
    } catch (error) {
      console.error("Error al validar respuesta:", error);
      alert("Señal débil. Volvé a intentarlo.");
      setIsProcessing(false);
    }
  };

  // ============================================================================
  // 10. REINICIO MANUAL DESPUÉS DE GAME OVER
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
            juegosCompletados: [],
            ultimaActualizacionPuntos: 0
          })
        );
      }
      setFeedback(null);
      setJuegoActivo(null);
      setMostrarOpciones(false);
      setMostrarInfoJuego(false);
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

  // ================= VISTA: TRIVIA (CON TRANSICIÓN ANTI-TOQUE ACCIDENTAL Y BOTÓN DE INFO "i") =================
  if (view === 'trivia' && juegoActivo) {
    const vidasMostradas = grupoDataCache?.vidas !== undefined ? grupoDataCache.vidas : 3;

    return (
      <div className="min-h-screen bg-[#050505] text-white p-6 flex flex-col">
        <header className="mb-6 mt-4 flex justify-between items-center">
          <span className={`font-mono text-sm tracking-widest uppercase ${juegoActivo.tipo === 'trampa' ? 'text-red-500 font-black' : 'text-yellow-400'}`}>
            {juegoActivo.tipo === 'trampa' ? '⚠️ ALERTA: QR TRAMPA (-100 PTS SI FALLÁS)' : `SALA DESBLOQUEADA · VALE +${juegoActivo.puntos} PTS`}
          </span>
          <div className="flex gap-1">
            {[1, 2, 3].map((vida) => (
              <span key={vida} className={`text-xl ${vida <= vidasMostradas ? 'opacity-100' : 'opacity-30'}`}>❤️</span>
            ))}
          </div>
        </header>

        {/* Alerta parpadeante cuando al equipo le queda exactamente 1 vida */}
        {vidasMostradas === 1 && juegoActivo.tipo !== 'trampa' && (
          <div className="bg-red-600 text-white p-4 rounded-xl mb-6 border-4 border-black animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.5)]">
            <h3 className="font-black uppercase text-xl mb-1 text-center">¡CUIDADO! ÚLTIMA VIDA</h3>
            <p className="font-bold text-xs text-center uppercase tracking-widest">
              Presten suma atención. Si responden mal pierden TODOS sus puntos y vuelven a cero.
            </p>
          </div>
        )}
        
        {/* Contenedor de la pregunta que se desplaza suavemente hacia arriba al tocar "RESPONDER" */}
        <div className={`transition-all duration-500 ease-out flex flex-col ${mostrarOpciones ? 'mt-0 mb-6' : 'my-auto py-8'}`}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className={`text-3xl font-black uppercase ${juegoActivo.tipo === 'trampa' ? 'text-red-500' : 'text-yellow-400'}`}>
              {juegoActivo.titulo}
            </h2>
            
            {/* Botón "i" (Información del juego) */}
            {juegoActivo.info && (
              <button
                type="button"
                onClick={() => setMostrarInfoJuego(!mostrarInfoJuego)}
                title="Ver instrucciones del juego"
                className="shrink-0 size-9 rounded-full border-2 border-yellow-400/60 bg-yellow-400/10 text-yellow-400 font-mono font-black text-sm flex items-center justify-center active:scale-95 transition-transform"
              >
                i
              </button>
            )}
          </div>

          {/* Cuadro desplegable con la explicación de qué hay que hacer en ese juego */}
          {mostrarInfoJuego && juegoActivo.info && (
            <div className="mb-5 rounded-2xl border border-blue-500/40 bg-[#0a1224] p-4 text-xs text-gray-200 leading-relaxed shadow-lg">
              <p className="font-mono text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">
                ℹ️ ¿Qué hay que hacer en este juego?
              </p>
              <p>{juegoActivo.info}</p>
            </div>
          )}

          <p className={`text-gray-100 leading-relaxed font-bold transition-all duration-500 ${mostrarOpciones ? 'text-lg' : 'text-2xl'}`}>
            {juegoActivo.pregunta}
          </p>
        </div>
        
        {/* Primero mostramos el botón "Responder Pregunta", luego las opciones en fila */}
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
              onClick={() => { setJuegoActivo(null); setMostrarOpciones(false); setMostrarInfoJuego(false); setView('dashboard'); }}
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