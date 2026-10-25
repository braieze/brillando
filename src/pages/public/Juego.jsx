import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, updateDoc, increment, arrayUnion, onSnapshot } from "firebase/firestore";
import { Scanner } from '@yudiel/react-qr-scanner';
import { db } from '../../config/firebase';
import DashboardJugador from './DashboardJugador';
import './Juego.css';

// ============================================================================
// DICCIONARIO DE JUEGOS Y PREGUNTAS (NIVEL EXTREMO - LÓGICA Y TIEMPO)
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
        texto: 'Participás de una maratón. Adelantás al corredor que va en la última posición. ¿En qué lugar quedás?',
        opciones: [
          { id: 'a', texto: 'Anteúltimo' },
          { id: 'b', texto: 'Último' },
          { id: 'c', texto: 'Imposible adelantarlo' }
        ],
        correcta: 'c' 
      },
      {
        texto: 'La palabra "MÁSCARA" tiene 7 letras. Si la escribís al revés, ¿cuál es la tercera letra?',
        opciones: [
          { id: 'a', texto: 'A' },
          { id: 'b', texto: 'C' },
          { id: 'c', texto: 'S' }
        ],
        correcta: 'b' 
      },
      {
        texto: 'Hay 3 botones. El Rojo explota. El Azul es seguro SOLO si tocaste el Verde primero. ¿Qué tocás para salir?',
        opciones: [
          { id: 'a', texto: 'El Rojo' },
          { id: 'b', texto: 'El Verde' },
          { id: 'c', texto: 'El Azul' }
        ],
        correcta: 'b' 
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
        texto: 'Un pozo en la tierra mide 3 metros de ancho, 3 de largo y 3 de profundidad. ¿Cuánta tierra hay adentro del pozo?',
        opciones: [
          { id: 'a', texto: '27 metros cúbicos' },
          { id: 'b', texto: 'Ninguna' },
          { id: 'c', texto: '9 metros cúbicos' }
        ],
        correcta: 'b'
      },
      {
        texto: 'SISTEMA COMPROMETIDO: Elija la opción incorrecta para sobrevivir.',
        opciones: [
          { id: 'a', texto: 'El agua moja' },
          { id: 'b', texto: '2 + 2 = 4' },
          { id: 'c', texto: 'El hielo está caliente' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Tenés 10 botellas. Tirás todas menos 3. ¿Cuántas botellas te quedan paradas?',
        opciones: [
          { id: 'a', texto: '3' },
          { id: 'b', texto: '7' },
          { id: 'c', texto: 'Ninguna' }
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
        texto: 'Leé rápido esta lista: Manzana, Pera, Uva, Banana, Naranja, Kiwi, Manzana, Limón. ¿Cuántas veces apareció la letra "K"?',
        opciones: [
          { id: 'a', texto: 'Cero' },
          { id: 'b', texto: 'Una' },
          { id: 'c', texto: 'Dos' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Estás mirando al Norte. Girás a la derecha, luego a la derecha, y otra vez a la derecha. ¿Hacia dónde estás mirando ahora?',
        opciones: [
          { id: 'a', texto: 'Oeste' },
          { id: 'b', texto: 'Sur' },
          { id: 'c', texto: 'Este' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Entrás a una habitación oscura. Tenés UN solo fósforo. Hay una estufa, una vela y una chimenea. ¿Qué encendés primero?',
        opciones: [
          { id: 'a', texto: 'La vela' },
          { id: 'b', texto: 'El fósforo' },
          { id: 'c', texto: 'La estufa' }
        ],
        correcta: 'b'
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
        texto: 'Sumá rápido en tu cabeza: 1000 + 40 + 1000 + 30 + 1000 + 20 + 1000 + 10 = ?',
        opciones: [
          { id: 'a', texto: '5000' },
          { id: 'b', texto: '4100' },
          { id: 'c', texto: '4000' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Algunos meses tienen 31 días. Otros 30. ¿Qué mes tiene 32 días?',
        opciones: [
          { id: 'a', texto: 'Ninguno' },
          { id: 'b', texto: 'Diciembre' },
          { id: 'c', texto: 'Enero' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cuántas veces podés restarle un filtro a una foto que tiene 10 filtros?',
        opciones: [
          { id: 'a', texto: '10 veces' },
          { id: 'b', texto: '1 vez' },
          { id: 'c', texto: 'Ninguna' }
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
        texto: 'Entrás corriendo a una sala con 3 puertas. La 1 tiene fuego. La 2 está llena de leones que no comen hace un año. La 3 tiene ácido. ¿Por cuál escapás?',
        opciones: [
          { id: 'a', texto: 'La 1' },
          { id: 'b', texto: 'La 3' },
          { id: 'c', texto: 'La 2' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Identificá rápido qué palabra NO pertenece al grupo: MASCARA - FILTRO - IDENTIDAD - ENGAÑO.',
        opciones: [
          { id: 'a', texto: 'Filtro' },
          { id: 'b', texto: 'Engaño' },
          { id: 'c', texto: 'Identidad' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Si dividís 30 por la mitad (1/2) y le sumás 10, ¿cuánto te da?',
        opciones: [
          { id: 'a', texto: '70' },
          { id: 'b', texto: '25' },
          { id: 'c', texto: '40' }
        ],
        correcta: 'a'
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
        texto: 'El padre de María tiene tres hijas: Abril, Mayo y... ¿cómo se llama la tercera?',
        opciones: [
          { id: 'a', texto: 'María' },
          { id: 'b', texto: 'Junio' },
          { id: 'c', texto: 'Marzo' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Escribí mentalmente la palabra "ESCAPE". Sacale las vocales. ¿Cuántas consonantes te quedan?',
        opciones: [
          { id: 'a', texto: '4' },
          { id: 'b', texto: '2' },
          { id: 'c', texto: '3' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Un joven camina bajo la lluvia sin paraguas ni gorra, pero no se moja ni un solo pelo de la cabeza. ¿Por qué?',
        opciones: [
          { id: 'a', texto: 'Corría muy rápido' },
          { id: 'b', texto: 'Llevaba capucha' },
          { id: 'c', texto: 'Es calvo' }
        ],
        correcta: 'c'
      }
    ]
  },
  'qr-cronometro': {
    id: 7,
    titulo: 'El Cronómetro',
    puntos: 70,
    tipo: 'normal',
    info: 'Desafío de tiempo: Tienen que tocar el espacio en la notebook, iniciar el cronómetro y pararlo en 10 segundos clavados. Quien esté más cerca, gana. Vale 70 puntos.',
    preguntas: [
      {
        texto: '¿Cuántos meses del año tienen exactamente 28 días?',
        opciones: [
          { id: 'a', texto: 'Todos los meses' },
          { id: 'b', texto: 'Solo febrero' },
          { id: 'c', texto: 'Ninguno' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Si un "filtro" recorta la mitad de la luz, y ponés otro "filtro" encima, ¿cuánta luz original te queda?',
        opciones: [
          { id: 'a', texto: 'La mitad' },
          { id: 'b', texto: 'Un cuarto (25%)' },
          { id: 'c', texto: 'Ninguna' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Estás manejando un colectivo. Suben 5 personas, bajan 2, sube 1. ¿De qué color es el pelo del colectivero?',
        opciones: [
          { id: 'a', texto: 'Del color de mi propio pelo' },
          { id: 'b', texto: 'Castaño' },
          { id: 'c', texto: 'Negro' }
        ],
        correcta: 'a'
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
        texto: 'Tenés un hilo de 1 metro y lo cortás por la mitad. Luego cortás por la mitad uno de esos pedazos. ¿Cuántos pedazos tenés en total?',
        opciones: [
          { id: 'a', texto: 'Dos' },
          { id: 'b', texto: 'Tres' },
          { id: 'c', texto: 'Cuatro' }
        ],
        correcta: 'b'
      },
      {
        texto: '¿Qué número falta en esta serie matemática? 2, 4, 6, 8, __, 12, 14.',
        opciones: [
          { id: 'a', texto: '10' },
          { id: 'b', texto: '11' },
          { id: 'c', texto: '9' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Rápido: Si 1 = 5, 2 = 10, 3 = 15, 4 = 20... ¿Entonces 5 = ?',
        opciones: [
          { id: 'a', texto: '25' },
          { id: 'b', texto: '30' },
          { id: 'c', texto: '1' }
        ],
        correcta: 'c'
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
    titulo: 'SISTEMA COMPROMETIDO',
    puntos: -100,
    tipo: 'trampa',
    info: '¡Cuidado! Escaneaste el QR trampa escondido en el salón. Resta 50 puntos automáticamente al equipo que lo escanee.',
    preguntas: []
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

  // TEMPORIZADOR DE 20 SEGUNDOS PARA RESPONDER (NUEVA LÓGICA)
  const [timeLeft, setTimeLeft] = useState(20);

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
      
      // Caso A: El otro capitán ya superó esta sala (JUEGO YA COMPLETADO)
      if (grupoDataCache?.juegosCompletados?.includes(juegoActivo.id)) {
        setFeedback({
          type: 'success',
          titulo: '¡SALA YA RESUELTA!',
          subtitulo: 'El otro Capitán acaba de superar este desafío'
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
  // TEMPORIZADOR DE 20 SEGUNDOS (LÓGICA DEL COUNTDOWN)
  // Empieza a correr NI BIEN escanean el QR y se abre la pantalla de trivia
  // ============================================================================
  useEffect(() => {
    let timerId;
    if (view === 'trivia' && juegoActivo && !isProcessing && !feedback) {
      if (timeLeft > 0) {
        timerId = setTimeout(() => {
          setTimeLeft(prev => prev - 1);
        }, 1000);
      } else {
        // Si el tiempo llega a 0, se considera respuesta incorrecta (pierde vida)
        validarRespuesta(null, true);
      }
    }
    return () => clearTimeout(timerId);
  }, [view, juegoActivo, isProcessing, feedback, timeLeft]);


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
      
      // ========================================================================
      // REGLA: LOS QR (NORMALES Y SECRETOS) SOLO SE PUEDEN ESCANEAR Y GANAR 1 VEZ.
      // Si ya está en juegosCompletados, se rebota.
      // Si perdieron un juego normal (no está completado), pueden volver a intentarlo.
      // ========================================================================
      if (grupoDataCache?.juegosCompletados?.includes(baseJuego.id)) {
        alert("⚠️ MISIÓN YA COMPLETADA POR EL ESCUADRÓN. Busquen otro puesto.");
        setView('dashboard');
        return;
      }

      // CASO ESPECIAL 1: Si es uno de los 2 QR secretos de 100 puntos gratis (tipo 'bonus')
      if (baseJuego.tipo === 'bonus') {
        if (!grupoDocRef) return;
        setIsProcessing(true);
        try {
          await ejecutarConTimeout(
            updateDoc(grupoDocRef, {
              puntos: increment(baseJuego.puntos),
              juegosCompletados: arrayUnion(baseJuego.id), // Se marca completado, no se puede escanear de nuevo
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
          alert("Señal débil. Volvé a intentarlo.");
          setIsProcessing(false);
        }
        return;
      }

      // CASO ESPECIAL 2: Si es el QR Trampa (-50 pts directo sin pregunta)
      if (baseJuego.tipo === 'trampa') {
        if (!grupoDocRef) return;
        setIsProcessing(true);
        try {
          const puntosActuales = Number(grupoDataCache?.puntos || 0);
          const puntosRestados = Math.max(0, puntosActuales - 50); // Mínimo 0 puntos

          await ejecutarConTimeout(
            updateDoc(grupoDocRef, {
              puntos: puntosRestados,
              juegosCompletados: arrayUnion(baseJuego.id), // Queda completado para no restar eternamente
              ultimaActualizacionPuntos: Date.now()
            })
          );
          setFeedback({
            type: 'error',
            titulo: '¡CAÍSTE EN LA TRAMPA!',
            subtitulo: '-50 PUNTOS'
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
          alert("Señal débil. Volvé a intentarlo.");
          setIsProcessing(false);
        }
        return;
      }

      // CASO NORMAL: Sorteamos pregunta y vamos a la Trivia (con tiempo de 20s)
      const randomIndex = Math.floor(Math.random() * baseJuego.preguntas.length);
      const preguntaSorteada = baseJuego.preguntas[randomIndex];

      setMostrarOpciones(false);
      setMostrarInfoJuego(false);
      setTimeLeft(20); // Resetea el reloj a 20s y empieza a correr ni bien entra a la vista 'trivia'
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
  // 9. VALIDACIÓN DE TRIVIA (Si fallan, pueden reintentar. Si ganan, se bloquea)
  // ============================================================================
  const validarRespuesta = async (opcionSeleccionada, agotadoTiempo = false) => {
    if (isProcessing || !juegoActivo || !grupoDocRef) return;
    setIsProcessing(true);

    try {
      // Por si justo el otro capitán lo superó mientras éste leía la pregunta
      if (grupoDataCache?.juegosCompletados?.includes(juegoActivo.id)) {
        setFeedback({ type: 'success', titulo: '¡SALA YA RESUELTA!', subtitulo: 'El otro Capitán ya sumó estos puntos' });
        setTimeout(() => {
          setFeedback(null); setJuegoActivo(null); setMostrarOpciones(false); setMostrarInfoJuego(false); setIsProcessing(false); setView('dashboard');
        }, 2500);
        return;
      }

      // Si respondió bien a tiempo
      if (!agotadoTiempo && opcionSeleccionada === juegoActivo.correcta) {
        const puntosDelJuego = Number(juegoActivo.puntos || 50);

        // Al ganar, se anota en juegosCompletados para bloquear el re-escaneo
        await ejecutarConTimeout(
          updateDoc(grupoDocRef, {
            puntos: increment(puntosDelJuego),
            juegosCompletados: arrayUnion(juegoActivo.id), 
            ultimaActualizacionPuntos: Date.now()
          })
        );
        
        setFeedback({ type: 'success', titulo: '¡DESAFÍO SUPERADO!', subtitulo: `+${puntosDelJuego} PUNTOS` });
        
        setTimeout(() => {
          setFeedback(null); setJuegoActivo(null); setMostrarOpciones(false); setMostrarInfoJuego(false); setIsProcessing(false); setView('dashboard');
        }, 3000);

      } else {
        // RESPUESTA INCORRECTA O SE AGOTÓ EL TIEMPO
        const vidasActuales = grupoDataCache?.vidas !== undefined ? Number(grupoDataCache.vidas) : 3;

        // IMPORTANTE: NO GUARDAMOS EL JUEGO EN juegosCompletados, así pueden volver a escanearlo y reintentar.

        if (vidasActuales <= 1) {
          // GAME OVER: Se limpia TODO el historial, dándoles chance de volver a escanear incluso los QR secretos.
          await ejecutarConTimeout(
            updateDoc(grupoDocRef, {
              puntos: 0,
              vidas: 0,
              ranking: '-',
              juegosCompletados: [], // <-- Reseteo absoluto
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
          
          if (agotadoTiempo) {
            setFeedback({ type: 'error', titulo: 'TIEMPO AGOTADO', subtitulo: '-1 VIDA' });
          } else {
            setFeedback({ type: 'error', titulo: 'SISTEMA COMPROMETIDO', subtitulo: '-1 VIDA' });
          }
          
          setTimeout(() => {
            setFeedback(null); setJuegoActivo(null); setMostrarOpciones(false); setMostrarInfoJuego(false); setIsProcessing(false); setView('dashboard');
          }, 3000);
        }
      }
    } catch (error) {
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
      setFeedback(null); setJuegoActivo(null); setMostrarOpciones(false); setMostrarInfoJuego(false); setIsProcessing(false); setView('dashboard');
    } catch (error) {
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

  // ================= VISTA: TRIVIA CON TEMPORIZADOR Y BOTÓN "i" =================
  if (view === 'trivia' && juegoActivo) {
    const vidasMostradas = grupoDataCache?.vidas !== undefined ? grupoDataCache.vidas : 3;

    return (
      <div className="min-h-screen bg-[#050505] text-white p-6 flex flex-col relative overflow-hidden">
        
        {/* BARRA SUPERIOR DE ESTADO */}
        <header className="mb-6 mt-4 flex justify-between items-center relative z-10">
          <span className="font-mono text-sm tracking-widest uppercase text-yellow-400">
            SALA DESBLOQUEADA · ⏱️ {timeLeft}s
          </span>
          <div className="flex gap-1">
            {[1, 2, 3].map((vida) => (
              <span key={vida} className={`text-xl ${vida <= vidasMostradas ? 'opacity-100' : 'opacity-30'}`}>❤️</span>
            ))}
          </div>
        </header>

        {/* ALERTA DE ÚLTIMA VIDA */}
        {vidasMostradas === 1 && (
          <div className="bg-red-600 text-white p-4 rounded-xl mb-6 border-4 border-black animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.5)] relative z-10">
            <h3 className="font-black uppercase text-xl mb-1 text-center">¡CUIDADO! ÚLTIMA VIDA</h3>
            <p className="font-bold text-xs text-center uppercase tracking-widest">
              Si responden mal pierden TODOS sus puntos y vuelven a cero.
            </p>
          </div>
        )}

        {/* INDICADOR DE TIEMPO (Visible desde el instante en que se escanea el QR) */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-800 z-0">
          <div 
            className={`h-full transition-all duration-1000 ease-linear ${timeLeft <= 5 ? 'bg-red-500' : 'bg-yellow-400'}`}
            style={{ width: `${(timeLeft / 20) * 100}%` }}
          ></div>
        </div>
        
        {/* CONTENEDOR PRINCIPAL: PREGUNTA Y BOTÓN DE INFO */}
        <div className={`transition-all duration-500 ease-out flex flex-col relative z-10 ${mostrarOpciones ? 'mt-0 mb-4' : 'my-auto py-8'}`}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-3xl font-black uppercase text-yellow-400 truncate">
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

          {/* Cuadro de explicación desplegable */}
          {mostrarInfoJuego && juegoActivo.info && (
            <div className="mb-5 rounded-2xl border border-blue-500/40 bg-[#0a1224] p-4 text-xs text-gray-200 leading-relaxed shadow-lg">
              <p className="font-mono text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">
                ℹ️ ¿Qué hay que hacer en este juego?
              </p>
              <p>{juegoActivo.info}</p>
            </div>
          )}

          {/* LA PREGUNTA */}
          <p className={`text-gray-100 leading-relaxed font-bold transition-all duration-500 ${mostrarOpciones ? 'text-lg' : 'text-2xl'}`}>
            {juegoActivo.pregunta}
          </p>

          {/* Reloj numérico gigante si quedan 5 segundos o menos */}
          {timeLeft <= 5 && (
            <div className="text-center mt-4 animate-ping">
              <span className="text-5xl font-black text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">
                {timeLeft}
              </span>
            </div>
          )}
        </div>
        
        {/* BOTONERA INFERIOR (Opciones ocultas vs visibles) */}
        {!mostrarOpciones ? (
          <div className="mt-auto mb-8 flex flex-col gap-3 relative z-10">
            <button
              type="button"
              onClick={() => setMostrarOpciones(true)}
              className="w-full rounded-full bg-yellow-400 py-5 text-sm font-black uppercase tracking-widest text-black shadow-[0_0_25px_rgba(250,204,21,0.3)] transition-transform active:scale-95"
            >
              Responder ({timeLeft}s restantes)
            </button>
            <button
              type="button"
              onClick={() => { setJuegoActivo(null); setMostrarOpciones(false); setMostrarInfoJuego(false); setView('dashboard'); }}
              className="w-full rounded-full border border-white/15 bg-white/5 py-3.5 text-xs font-bold uppercase tracking-widest text-gray-400"
            >
              Huir y volver a la fila
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-auto mb-4 animate-fadeIn relative z-10">
            {juegoActivo.opciones.map((op) => (
              <button 
                key={op.id}
                onClick={() => validarRespuesta(op.id, false)}
                disabled={isProcessing}
                className="text-left bg-[#111] border-2 border-white/10 p-5 rounded-xl text-sm font-bold active:bg-yellow-400 active:text-black transition-all disabled:opacity-50"
              >
                <span className="text-yellow-400 mr-2 font-black">{op.id.toUpperCase()}.</span> {op.texto}
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