import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import {
  Zap,
  Camera,
  LogOut,
  Share2,
  Users,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Lock,
  X,
  Package,
  UsersRound
} from 'lucide-react';

// ============================================================================
// CATÁLOGO OFICIAL DE LOS 23 JUEGOS + ESPECIALES (RESPALDO INTEGRADO)
// ============================================================================
const CATALOGO_POR_DEFECTO = [
  {
    id: 1,
    titulo: 'Crono 10"',
    icono: '⏱️',
    puntos: 50,
    color: 'rojo',
    modalidad: '2 Grupos (1 vs 1)',
    materiales: 'Computadora o celular con cronómetro y mesa.',
    info: 'Se enfrentan 2 grupos (primero 1 y luego el otro). El jugador debe detener el cronómetro intentando clavarlo exactamente en 10.00 segundos. Gana quien quede más cerca de los 10 segundos.',
    tipo: 'normal'
  },
  {
    id: 2,
    titulo: 'Básquet',
    icono: '🏀',
    puntos: 30,
    color: 'amarillo',
    modalidad: 'Individual',
    materiales: 'Aro de básquet y pelotas.',
    info: 'Desafío individual de puntería. Gana el jugador que logre encestar la cantidad objetivo de veces en sus 3 intentos.',
    tipo: 'normal'
  },
  {
    id: 3,
    titulo: 'Pasajero',
    icono: '🚶‍♂️',
    puntos: 50,
    color: 'verde',
    modalidad: '2 Grupos en simultáneo',
    materiales: 'Vasos y pelotita para dos equipos.',
    info: 'Se enfrentan 2 grupos al mismo tiempo. Gana el primero que junte todos los vasos manteniendo la pelotita encima sin que se caiga.',
    tipo: 'normal'
  },
  {
    id: 4,
    titulo: 'Piedra, Papel o Tijera (Emojis)',
    icono: '✊',
    puntos: 40,
    color: 'azul',
    modalidad: '2 Grupos en simultáneo',
    materiales: 'Cartas o tarjetas con emojis.',
    info: 'Duelo entre 2 grupos en simultáneo al mejor de 3 intentos. Gana el equipo que logre vencer 2 de los 3 enfrentamientos.',
    tipo: 'normal'
  },
  {
    id: 5,
    titulo: 'Emboca Emboca',
    icono: '🎯',
    puntos: 30,
    color: 'rojo',
    modalidad: 'Individual',
    materiales: 'Botellas, aros y mesa.',
    info: 'Desafío individual de puntería con aros. Gana quien logre embocar la cantidad requerida de aros en las botellas.',
    tipo: 'normal'
  },
  {
    id: 6,
    titulo: 'Bowling (Pinos)',
    icono: '🎳',
    puntos: 30,
    color: 'amarillo',
    modalidad: 'Individual',
    materiales: 'Pinos, bola y camino.',
    info: 'Estación 1 de Bowling (con pinos). Gana el jugador que logre derribar 5 pinos en 2 intentos.',
    tipo: 'normal'
  },
  {
    id: 7,
    titulo: 'Dados Chinos',
    icono: '🎲',
    puntos: 40,
    color: 'verde',
    modalidad: 'Individual',
    materiales: 'Más de 5 dados, palitos chinos y mesa.',
    info: 'El jugador debe apilar los dados uno sobre otro tomándolos únicamente con palitos chinos sin que la torre se caiga.',
    tipo: 'normal'
  },
  {
    id: 8,
    titulo: 'Tejo',
    icono: '🥏',
    puntos: 50,
    color: 'azul',
    modalidad: '4 Grupos en simultáneo',
    materiales: '2 tableros de tejo, tapitas y mesa.',
    info: 'Compiten 2 grupos por tablero (4 en simultáneo). Gana el equipo que logre pasar todas sus tapitas al otro lado primero.',
    tipo: 'normal'
  },
  {
    id: 9,
    titulo: 'Pasa Vasos',
    icono: '🥤',
    puntos: 40,
    color: 'rojo',
    modalidad: 'Individual',
    materiales: '15 vasos iguales más 1 vaso de color diferente.',
    info: 'El jugador debe pasar los vasos de arriba hacia abajo a toda velocidad hasta que el vaso de color diferente dé toda la vuelta y vuelva a quedar arriba.',
    tipo: 'normal'
  },
  {
    id: 10,
    titulo: 'Malabarista',
    icono: '🤹',
    puntos: 40,
    color: 'amarillo',
    modalidad: 'Individual',
    materiales: 'Globos (2 globos inflados por turno).',
    info: 'El jugador debe mantener los globos en el aire usando sus manos. Gana si logra que ningún globo toque el piso durante 1 minuto completo.',
    tipo: 'normal'
  },
  {
    id: 11,
    titulo: 'Al Dente',
    icono: '🍝',
    puntos: 50,
    color: 'verde',
    modalidad: 'Individual',
    materiales: '6 fideos mostachol, 1 fideo espagueti por turno y mesa.',
    info: 'Los fideos mostachol se colocan sobre la mesa. El jugador debe sostener el espagueti con la boca y levantar los 6 mostacholes sin usar las manos.',
    tipo: 'normal'
  },
  {
    id: 12,
    titulo: 'Pa Pe Ti',
    icono: '⚔️',
    puntos: 50,
    color: 'azul',
    modalidad: '2 Grupos en simultáneo',
    materiales: 'Tablero de Ta-Te-Ti, fichas y mesa.',
    info: 'Se enfrentan 2 grupos haciendo Piedra, Papel o Tijera. Solo está habilitado a poner una ficha en el tablero el equipo que gane el turno de Piedra, Papel o Tijera. ¡Gana el que arme Ta-Te-Ti!',
    tipo: 'normal'
  },
  {
    id: 13,
    titulo: 'Vuelta de Tuerca',
    icono: '🔩',
    puntos: 40,
    color: 'rojo',
    modalidad: 'Individual',
    materiales: '5 o más tuercas, un palito chino y mesa.',
    info: 'Comienza con todas las tuercas enhebradas dentro del palito. El jugador debe deslizarlas y apilarlas una arriba de la otra en vertical sin usar las manos para tocar las tuercas.',
    tipo: 'normal'
  },
  {
    id: 14,
    titulo: 'Ta Te Ti',
    icono: '❌',
    puntos: 30,
    color: 'amarillo',
    modalidad: '2 Grupos en simultáneo',
    materiales: 'Fichas de Ta-Te-Ti y tablero.',
    info: 'Duelo de velocidad y estrategia entre 2 grupos. Tienen un mini-reto antes de colocar cada pieza en el tablero. Gana el primer equipo que logre formar Ta-Te-Ti.',
    tipo: 'normal'
  },
  {
    id: 15,
    titulo: 'Rompecabezas',
    icono: '🧩',
    puntos: 40,
    color: 'verde',
    modalidad: 'Individual',
    materiales: 'Rompecabezas, antifaz (venda para los ojos) y mesa.',
    info: 'El jugador debe armar el rompecabezas completo a ciegas (o siguiendo las indicaciones de su equipo) antes de que se termine el tiempo.',
    tipo: 'normal'
  },
  {
    id: 16,
    titulo: 'Pirámide',
    icono: '🔺',
    puntos: 40,
    color: 'azul',
    modalidad: 'Individual',
    materiales: '28 vasos mínimo (base de 7) y mesa.',
    info: 'El jugador debe armar la pirámide completa de vasos (con base de 7) y luego volver a juntar todos los vasos en una sola pila usando únicamente 1 mano (o con ambas manos usando guantes de boxeo).',
    tipo: 'normal'
  },
  {
    id: 17,
    titulo: 'Memoria',
    icono: '🧠',
    puntos: 50,
    color: 'rojo',
    modalidad: 'Individual',
    materiales: 'Pelotitas de colores por partida doble, cajas/soportes donde alinear las pelotitas (x2) y mesa.',
    info: 'El colaborador arma 3 secuencias ocultas de pelotitas de colores. El jugador las mira unos segundos y debe replicar de memoria. Gana si logra recordar y acertar las 3 secuencias.',
    tipo: 'normal'
  },
  {
    id: 18,
    titulo: 'Minions Nerds',
    icono: '🤓',
    puntos: 40,
    color: 'azul',
    modalidad: '2 Grupos en simultáneo',
    materiales: 'Hojas, lapiceras, dos antifaces/máscaras de Minions y mesa.',
    info: 'Compiten 2 grupos en simultáneo. Con la máscara de Minion puesta en la cara, gana el grupo que en 1 minuto escriba más palabras correctas que empiecen con la letra indicada.',
    tipo: 'normal'
  },
  {
    id: 19,
    titulo: 'Bowling (Botellas)',
    icono: '🎳',
    puntos: 40,
    color: 'verde',
    modalidad: 'Individual',
    materiales: 'Botellas, bola y camino.',
    info: 'Estación 2 de Bowling (con botellas). Gana el jugador que logre derribar 5 botellas en sus 2 intentos.',
    tipo: 'normal'
  },
  {
    id: 20,
    titulo: 'Pescador',
    icono: '🎣',
    puntos: 50,
    color: 'amarillo',
    modalidad: '4 Grupos en simultáneo',
    materiales: 'Cañas de pescar, peces y pecera.',
    info: 'Compiten hasta 4 grupos al mismo tiempo. Gana quien logre pescar más peces en 1 minuto o el primero en alcanzar la cantidad objetivo de peces.',
    tipo: 'normal'
  },
  {
    id: 21,
    titulo: 'Enhebralo',
    icono: '🧵',
    puntos: 40,
    color: 'rojo',
    modalidad: '2 Grupos en simultáneo',
    materiales: 'Botones, hilo y mesa.',
    info: 'Duelo de pulso y precisión entre 2 grupos. Gana el equipo que logre pasar el hilo y enhebrar la mayor cantidad de botones en el tiempo asignado.',
    tipo: 'normal'
  },
  {
    id: 22,
    titulo: 'Pong Acuático',
    icono: '🏓',
    puntos: 40,
    color: 'amarillo',
    modalidad: '2 Grupos en simultáneo',
    materiales: '12 vasos con agua, pelotitas de ping-pong y 1 mesa larga.',
    info: 'Se colocan 6 vasos llenos de agua en cada extremo opuesto de la mesa. Turnándose para lanzar, gana quien emboque más pelotitas de ping-pong en 1 minuto o complete todos los vasos del oponente primero.',
    tipo: 'normal'
  },
  {
    id: 23,
    titulo: 'Jenga Reverso',
    icono: '🧱',
    puntos: 50,
    color: 'verde',
    modalidad: '2 Grupos en simultáneo',
    materiales: 'Piezas de Jenga y mesa.',
    info: 'Sin apilar las piezas de forma tradicional (solo apoyadas de lado), gana el equipo que logre apilar la mayor cantidad de maderitas en 1 minuto manteniendo el equilibrio sin que se derrumbe.',
    tipo: 'normal'
  }
];

const DESAFIOS_ESPECIALES = [
  {
    id: 101,
    titulo: 'QR Secreto #1',
    icono: '✨',
    puntos: 100,
    color: 'amarillo',
    modalidad: 'Búsqueda en el salón',
    materiales: 'Ojos bien abiertos.',
    info: 'Código QR escondido en el salón. Si lo encuentran y lo escanean, suman 100 puntos gratis directos.',
    tipo: 'bonus'
  },
  {
    id: 102,
    titulo: 'QR Secreto #2',
    icono: '✨',
    puntos: 100,
    color: 'amarillo',
    modalidad: 'Búsqueda en el salón',
    materiales: 'Ojos bien abiertos.',
    info: 'Código QR escondido en el salón. Si lo encuentran y lo escanean, suman 100 puntos gratis directos.',
    tipo: 'bonus'
  },
  {
    id: 103,
    titulo: 'QR Escondido · Trampa',
    icono: '⚠️',
    puntos: -50,
    color: 'rojo',
    modalidad: '¡Cuidado al escanear!',
    materiales: 'Camuflado como un QR secreto.',
    info: '¡Cuidado! Hay un código QR trampa escondido en el salón. Si lo escanean por error, resta 50 puntos automáticamente al escuadrón.',
    tipo: 'trampa'
  }
];

// Estilos visuales según el color de tu planilla (Rojo, Amarillo, Verde, Azul)
const COLOR_ESTILOS = {
  rojo: {
    badge: 'bg-red-500/15 text-red-400 border-red-500/30',
    iconBg: 'from-red-500/30 to-red-900/20 border-red-500/30',
    modalHeader: 'from-red-600/30 via-red-900/20 to-transparent border-red-500/30'
  },
  amarillo: {
    badge: 'bg-yellow-400/15 text-yellow-300 border-yellow-400/30',
    iconBg: 'from-yellow-400/30 to-amber-700/20 border-yellow-400/30',
    modalHeader: 'from-yellow-400/25 via-amber-800/15 to-transparent border-yellow-400/30'
  },
  verde: {
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    iconBg: 'from-emerald-500/30 to-emerald-900/20 border-emerald-500/30',
    modalHeader: 'from-emerald-500/25 via-emerald-900/15 to-transparent border-emerald-500/30'
  },
  azul: {
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    iconBg: 'from-blue-500/30 to-blue-900/20 border-blue-500/30',
    modalHeader: 'from-blue-500/25 via-blue-900/15 to-transparent border-blue-500/30'
  }
};

// ============================================================================
// TARJETA DE JUEGO (SIN BOTÓN "i": TOCAR LA TARJETA ABRE EL MODAL SI NO SE GANÓ)
// ============================================================================
function DesafioCard({ desafio, numeroOrden, isDone, onSelect }) {
  const esTrampa = desafio.tipo === 'trampa';
  const paleta = COLOR_ESTILOS[desafio.color] || COLOR_ESTILOS.azul;

  const handleCardClick = () => {
    // Si ya lo ganaron/completaron, NO se abre el modal
    if (isDone) return;
    onSelect(desafio);
  };

  return (
    <article
      onClick={handleCardClick}
      role={isDone ? 'article' : 'button'}
      tabIndex={isDone ? -1 : 0}
      onKeyDown={(e) => {
        if (!isDone && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect(desafio);
        }
      }}
      className={`group relative flex flex-col rounded-2xl border p-4 transition-all ${
        isDone
          ? esTrampa
            ? 'border-red-500/40 bg-red-950/20 opacity-75 cursor-default'
            : 'border-emerald-500/40 bg-emerald-950/20 opacity-80 cursor-default'
          : 'border-white/10 bg-[#0c0c0e] hover:border-yellow-400/50 active:scale-[0.98] cursor-pointer shadow-lg'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Ícono del juego con número de estación */}
          <div
            className={`relative flex size-12 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br ${
              isDone
                ? 'from-emerald-500/20 to-emerald-900/20 border-emerald-500/40'
                : paleta.iconBg
            }`}
          >
            <span className="text-2xl select-none">{isDone && !esTrampa ? '✅' : desafio.icono || '🎯'}</span>
            {numeroOrden <= 23 && (
              <span className="absolute -top-1.5 -left-1.5 rounded-md bg-black border border-white/20 px-1.5 py-0.2 text-[9px] font-mono font-black text-gray-300">
                #{numeroOrden}
              </span>
            )}
          </div>

          {/* Título y etiquetas de modalidad/estado */}
          <div className="min-w-0">
            <h3 className={`text-sm font-black uppercase tracking-wide truncate ${isDone ? 'text-gray-300 line-through decoration-emerald-400/60' : 'text-white'}`}>
              {desafio.titulo}
            </h3>

            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {isDone ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                  <CheckCircle2 className="size-3" />
                  Ganado · Bloqueado
                </span>
              ) : (
                <>
                  <span className={`inline-block rounded-md border px-2 py-0.5 text-[9px] font-mono font-bold uppercase ${paleta.badge}`}>
                    {desafio.modalidad || 'Desafío'}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400 group-hover:text-yellow-400 transition-colors">
                    Tocá para ver reglas →
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Puntaje a la derecha */}
        <div className="text-right shrink-0 pl-2">
          <span
            className={`inline-block rounded-xl px-2.5 py-1 font-mono text-sm font-black ${
              esTrampa
                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                : isDone
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-white/5 text-yellow-400 border border-white/10'
            }`}
          >
            {desafio.puntos > 0 ? `+${desafio.puntos}` : desafio.puntos}
          </span>
        </div>
      </div>
    </article>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL: DASHBOARD DEL JUGADOR
// ============================================================================
export default function DashboardJugador({
  grupoData,
  catalogoJuegos,
  onEscanear,
  onSalir,
  rankingEnVivo
}) {
  // Inicialización instantánea desde props o caché local (NUNCA MÁS QUEDA EN "CARGANDO...")
  const [grupoLocal, setGrupoLocal] = useState(() => {
    if (grupoData) return grupoData;
    try {
      const cache = localStorage.getItem('brillando_grupo_cache');
      if (cache) return JSON.parse(cache);
    } catch (_) {}
    return null;
  });

  // Juego seleccionado para mostrar en el Modal Explicativo
  const [juegoModal, setJuegoModal] = useState(null);

  // Filtro rápido de misiones ('TODAS' | 'PENDIENTES' | 'GANADAS')
  const [filtroMisiones, setFiltroMisiones] = useState('TODAS');

  const [abriendoCamara, setAbriendoCamara] = useState(false);
  const miRolLocal = localStorage.getItem('miRolCapitan') || '';
  const pinGuardado = localStorage.getItem('miGrupoPIN') || '----';

  // Sincroniza inmediatamente cuando Juego.jsx actualiza `grupoData`
  useEffect(() => {
    if (grupoData) {
      setGrupoLocal(grupoData);
    }
  }, [grupoData]);

  // Listener de respaldo únicamente si `grupoData` aún no llegó desde el padre
  useEffect(() => {
    if (grupoData || !pinGuardado || pinGuardado === '----') return;

    const q = query(collection(db, "grupos"), where("pin", "==", pinGuardado));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setGrupoLocal(data);
        try {
          localStorage.setItem('brillando_grupo_cache', JSON.stringify(data));
        } catch (_) {}
      }
    });

    return () => unsubscribe();
  }, [grupoData, pinGuardado]);

  // Normalización segura de los datos del grupo
  const grupoActual = useMemo(() => {
    const raw = grupoData || grupoLocal || {};
    const completadosNumeros = Array.isArray(raw.juegosCompletados)
      ? raw.juegosCompletados.map(Number)
      : [];

    return {
      nombre: raw.nombre || `ESCUADRÓN #${pinGuardado}`,
      pin: raw.pin || pinGuardado,
      capitan1: raw.capitan1 || 'CAPITÁN 1',
      capitan2: raw.capitan2 || 'PENDIENTE',
      puntosTotales: Number(raw.puntos || 0),
      vidas: raw.vidas !== undefined ? Number(raw.vidas) : 3,
      ranking: raw.ranking || '-',
      juegosCompletados: completadosNumeros
    };
  }, [grupoData, grupoLocal, pinGuardado]);

  // Lista combinada de los 23 juegos oficiales + los 3 códigos especiales
  const todosLosDesafios = useMemo(() => {
    const base = Array.isArray(catalogoJuegos) && catalogoJuegos.length > 0
      ? catalogoJuegos
      : CATALOGO_POR_DEFECTO;
    return [...base, ...DESAFIOS_ESPECIALES];
  }, [catalogoJuegos]);

  const desafíosFiltrados = useMemo(() => {
    return todosLosDesafios.filter((d) => {
      const ganado = grupoActual.juegosCompletados.includes(Number(d.id));
      if (filtroMisiones === 'PENDIENTES') return !ganado;
      if (filtroMisiones === 'GANADAS') return ganado;
      return true;
    });
  }, [todosLosDesafios, grupoActual.juegosCompletados, filtroMisiones]);

  // Si el otro capitán completa el juego mientras este capitán tenía el modal abierto, lo cierra automáticamente
  useEffect(() => {
    if (juegoModal && grupoActual.juegosCompletados.includes(Number(juegoModal.id))) {
      setJuegoModal(null);
    }
  }, [grupoActual.juegosCompletados, juegoModal]);

  // Compartir PIN por WhatsApp
  const handleCompartirWhatsapp = async () => {
    const mensaje = 
`⚡ *¡SUMATE A MI ESCUADRÓN "${grupoActual.nombre}" EN BRILLANDO!* ⚡

🔑 *Código PIN:* ${grupoActual.pin}
🌐 *Link del Juego:* https://brillando.vercel.app/juego

👥 *REGLA DE EQUIPO:* Cada grupo permite máximo *2 dispositivos conectados* (Capitán 1 y Capitán 2).
• *Capitán 1:* ${grupoActual.capitan1}
• *Capitán 2:* ${grupoActual.capitan2 === 'PENDIENTE' ? '¡Lugar disponible para vos!' : grupoActual.capitan2}

Entrá al link, tocá *"Ya tengo un PIN"* e ingresá el código *${grupoActual.pin}*.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Escuadrón ${grupoActual.nombre} - Brillando`,
          text: mensaje,
        });
      } catch (_) {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
    }
  };

  const handleClickEscanear = () => {
    if (abriendoCamara) return;
    setAbriendoCamara(true);
    setJuegoModal(null);
    onEscanear();
    setTimeout(() => setAbriendoCamara(false), 900);
  };

  const puestoFinal = rankingEnVivo && rankingEnVivo !== '-'
    ? rankingEnVivo
    : grupoActual.ranking;

  const totalJuegosNormales = 23;
  const completadosNormales = grupoActual.juegosCompletados.filter((id) => id <= 23).length;

  return (
    <main className="min-h-screen bg-[#050505] text-white pb-32">
      
      {/* TOP BAR */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/10 bg-[#050505]/95 px-5 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <Zap className="size-5 text-yellow-400 shrink-0" />
          <span className="text-sm font-black tracking-widest text-white uppercase">Brillando</span>
          {miRolLocal && (
            <span className="ml-1 truncate rounded-full bg-yellow-400/10 border border-yellow-400/30 px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase text-yellow-400">
              {miRolLocal}
            </span>
          )}
        </div>
        <button 
          onClick={onSalir} 
          title="Salir del escuadrón"
          className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-mono text-gray-400 hover:text-white transition-colors"
        >
          <LogOut className="size-4" />
          <span>Salir</span>
        </button>
      </header>

      <div className="px-5 py-6 max-w-xl mx-auto">
        
        {/* TARJETA PRINCIPAL DEL EQUIPO */}
        <div className="relative mb-7 overflow-hidden rounded-3xl border border-blue-500/25 bg-gradient-to-b from-[#0b1326] to-[#070709] p-5 shadow-2xl shadow-blue-950/30">
          <div className="absolute -right-10 -top-10 size-32 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
          
          {/* Cabecera: PIN, Nombre del Escuadrón y Ranking en Vivo */}
          <div className="flex justify-between items-start gap-2 mb-4 relative z-10">
            <div className="min-w-0">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-blue-400">
                PIN DE EQUIPO: #{grupoActual.pin}
              </p>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white truncate">
                {grupoActual.nombre}
              </h2>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Posición</p>
              <p className="text-xl font-black text-yellow-400">
                {puestoFinal !== '-' && puestoActualValido(puestoFinal, grupoActual.puntosTotales)
                  ? `TOP #${puestoFinal}`
                  : 'EN JUEGO'}
              </p>
            </div>
          </div>

          {/* Bloque de Capitanes + Botón Compartir PIN */}
          <div className="relative z-10 mb-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <Users className="size-4 text-blue-400 shrink-0" />
              <div>
                <span className="text-yellow-400 font-bold">CAP 1:</span>{' '}
                <span className="text-white">{grupoActual.capitan1}</span>
                <span className="mx-2 text-gray-600">|</span>
                <span className="text-blue-400 font-bold">CAP 2:</span>{' '}
                <span className={grupoActual.capitan2 === 'PENDIENTE' ? 'text-gray-400 italic' : 'text-white'}>
                  {grupoActual.capitan2}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCompartirWhatsapp}
              className="flex items-center gap-1.5 rounded-full bg-yellow-400/15 border border-yellow-400/40 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-yellow-400 active:scale-95 transition-transform"
            >
              <Share2 className="size-3" />
              Invitar Cap 2
            </button>
          </div>

          {/* Contador de Energía Total y Vidas Restantes */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-black/60 py-5 ring-1 ring-white/10 relative z-10">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400 mb-1">
              Puntaje del Escuadrón
            </p>
            <div className="flex items-center gap-2">
              <span className="text-5xl font-black text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                {grupoActual.puntosTotales}
              </span>
              <Zap className="size-8 text-yellow-400" />
            </div>
            
            <div className="mt-4 flex gap-2.5">
              {[1, 2, 3].map((vida) => (
                <div 
                  key={vida} 
                  className={`size-3.5 rounded-full transition-all ${
                    vida <= grupoActual.vidas 
                      ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)] scale-100' 
                      : 'bg-gray-800 scale-90'
                  }`} 
                />
              ))}
            </div>
            <p className="mt-2 text-[10px] font-mono uppercase tracking-widest text-gray-400">
              {grupoActual.vidas === 1 ? '⚠️ ¡Última Vida Disponible!' : `${grupoActual.vidas} Vidas Restantes`}
            </p>
          </div>
        </div>

        {/* CABECERA Y FILTROS DE LOS 23 JUEGOS */}
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-white">
              Estaciones de Juego (23)
            </h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Tocá cualquier juego pendiente para ver cómo se juega
            </p>
          </div>
          <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[10px] font-mono font-bold uppercase text-emerald-300">
            {completadosNormales} / {totalJuegosNormales} Ganados
          </span>
        </div>

        {/* Píldoras de filtro para encontrar rápido qué juegos faltan */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setFiltroMisiones('TODAS')}
            className={`rounded-xl py-2 text-[11px] font-mono font-bold uppercase border transition-all ${
              filtroMisiones === 'TODAS'
                ? 'bg-yellow-400 text-black border-yellow-400 font-black'
                : 'bg-white/5 text-gray-300 border-white/10'
            }`}
          >
            Todos ({todosLosDesafios.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroMisiones('PENDIENTES')}
            className={`rounded-xl py-2 text-[11px] font-mono font-bold uppercase border transition-all ${
              filtroMisiones === 'PENDIENTES'
                ? 'bg-yellow-400 text-black border-yellow-400 font-black'
                : 'bg-white/5 text-gray-300 border-white/10'
            }`}
          >
            Faltan ({todosLosDesafios.length - grupoActual.juegosCompletados.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroMisiones('GANADAS')}
            className={`rounded-xl py-2 text-[11px] font-mono font-bold uppercase border transition-all ${
              filtroMisiones === 'GANADAS'
                ? 'bg-emerald-400 text-black border-emerald-400 font-black'
                : 'bg-white/5 text-gray-300 border-white/10'
            }`}
          >
            Ganados ({grupoActual.juegosCompletados.length})
          </button>
        </div>
        
        {/* GRILLA DE TARJETAS */}
        <div className="flex flex-col gap-3">
          {desafíosFiltrados.map((desafio) => {
            const isDone = grupoActual.juegosCompletados.includes(Number(desafio.id));
            return (
              <DesafioCard
                key={desafio.id}
                desafio={desafio}
                numeroOrden={desafio.id}
                isDone={isDone}
                onSelect={(juegoElegido) => setJuegoModal(juegoElegido)}
              />
            );
          })}
        </div>

      </div>

      {/* ========================================================================
          MODAL EXPLICATIVO AL HACER CLIC EN UN JUEGO PENDIENTE
          ======================================================================== */}
      {juegoModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setJuegoModal(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl border-2 border-white/15 bg-[#0e0e12] text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Modal */}
            <div
              className={`flex items-start justify-between gap-3 border-b bg-gradient-to-br p-5 ${
                (COLOR_ESTILOS[juegoModal.color] || COLOR_ESTILOS.azul).modalHeader
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-black/50 border border-white/15 text-3xl">
                  {juegoModal.icono || '🎯'}
                </div>
                <div>
                  <span className="inline-block rounded-md bg-black/60 border border-white/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-yellow-400 mb-1">
                    {juegoModal.id <= 23 ? `Estación #${juegoModal.id}` : 'Código Especial'} ·{' '}
                    {juegoModal.puntos > 0 ? `+${juegoModal.puntos} PTS` : `${juegoModal.puntos} PTS`}
                  </span>
                  <h3 className="text-xl font-black uppercase leading-tight text-white">
                    {juegoModal.titulo}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setJuegoModal(null)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-black/40 text-gray-300 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Cuerpo del Modal: Modalidad, Materiales y Explicación */}
            <div className="p-5 space-y-4">
              {juegoModal.modalidad && (
                <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5">
                  <UsersRound className="size-4 text-yellow-400 shrink-0" />
                  <div className="text-xs">
                    <span className="font-mono uppercase text-gray-400">Modalidad: </span>
                    <span className="font-bold text-white uppercase">{juegoModal.modalidad}</span>
                  </div>
                </div>
              )}

              {juegoModal.materiales && (
                <div className="flex items-start gap-2.5 rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2.5">
                  <Package className="size-4 text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <span className="font-mono uppercase text-gray-400">Materiales en mesa: </span>
                    <span className="font-semibold text-gray-200">{juegoModal.materiales}</span>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-yellow-400/25 bg-yellow-400/[0.06] p-4">
                <p className="font-mono text-[10px] font-black uppercase tracking-widest text-yellow-400 mb-1.5">
                  📋 ¿Cómo se juega y cómo se gana?
                </p>
                <p className="text-sm text-gray-100 leading-relaxed font-medium">
                  {juegoModal.info}
                </p>
              </div>

              {/* Botones de Acción del Modal */}
              <div className="pt-2 flex flex-col gap-2.5">
                {juegoModal.tipo !== 'trampa' && (
                  <button
                    type="button"
                    onClick={handleClickEscanear}
                    className="flex w-full items-center justify-center gap-2.5 rounded-full bg-yellow-400 py-4 text-sm font-black uppercase tracking-widest text-black shadow-[0_0_25px_rgba(250,204,21,0.3)] active:scale-95 transition-transform"
                  >
                    <Camera className="size-5" />
                    ¡Ganamos! Escanear QR ahora
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setJuegoModal(null)}
                  className="w-full rounded-full border border-white/15 bg-white/5 py-3 text-xs font-bold uppercase tracking-widest text-gray-300 hover:bg-white/10"
                >
                  Cerrar explicación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOTÓN FLOTANTE INFERIOR DE ESCÁNER */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent p-4 pb-6">
        <div className="max-w-xl mx-auto">
          <button 
            onClick={handleClickEscanear}
            disabled={abriendoCamara}
            className="flex w-full items-center justify-center gap-3 rounded-full bg-yellow-400 py-4 text-sm font-black uppercase tracking-widest text-black shadow-[0_0_30px_rgba(250,204,21,0.35)] transition-transform active:scale-95 disabled:opacity-60"
          >
            <Camera className="size-5" />
            {abriendoCamara ? 'Abriendo Cámara...' : 'Escanear QR del Juego'}
          </button>
        </div>
      </div>

    </main>
  );
}

function puestoActualValido(puesto, puntos) {
  return puesto && puesto !== '-' && Number(puntos) > 0;
}