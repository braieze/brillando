import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase'; // Asegurá que esta ruta coincida con tu proyecto
import {
  Zap,
  Camera,
  Trophy,
  ShieldCheck,
  Flame,
  Target,
  LogOut,
  Share2,
  Users,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

// ============================================================================
// CONFIGURACIÓN DE ESTACIONES / DESAFÍOS DE LA KERMESSE (11 QRs SINCRONIZADOS CON JUEGO.JSX)
// El estado ('Completado' o 'Pendiente') se calcula en vivo según `juegosCompletados`.
// ============================================================================
const desafios = [
  {
    id: 1,
    titulo: 'Aro de Basquet',
    puntos: 25,
    tipo: 'normal',
    icon: Target,
    tone: 'yellow',
    info: 'Embocar la pelota de basquet: tienen 3 tiros y ganan si embocan al menos 1 de esos tiros. Vale 25 puntos porque se juega de una.'
  },
  {
    id: 2,
    titulo: 'Bowling con botellas de agua',
    puntos: 25,
    tipo: 'normal',
    icon: Flame,
    tone: 'blue',
    info: 'Se enfrentan 2 equipos: quien tire más botellas con la pelota tirada con la mano gana el acceso al QR. Vale 25 puntos.'
  },
  {
    id: 3,
    titulo: 'Piedra papel o tijera',
    puntos: 25,
    tipo: 'normal',
    icon: ShieldCheck,
    tone: 'blue',
    info: 'Se enfrentan 2 equipos y el ganador a 3 rounds (no se cuentan los empates) accede al QR. El juego termina 2-0 o 2-1. Vale 25 puntos.'
  },
  {
    id: 4,
    titulo: 'Arco con Agujeritos',
    puntos: 50,
    tipo: 'normal',
    icon: Target,
    tone: 'yellow',
    info: 'Hay un arco con una tela con agujeros: se enfrentan 2 equipos y quien emboque la mayor cantidad en 3 oportunidades gana. Vale 50 puntos.'
  },
  {
    id: 5,
    titulo: 'Embocar el aro',
    puntos: 50,
    tipo: 'normal',
    icon: Trophy,
    tone: 'yellow',
    info: 'Son 3 intentos: si embocás al menos 1 de 3 veces el aro en la botella, accedés al QR. Vale 50 puntos.'
  },
  {
    id: 6,
    titulo: 'Torre de vasitos',
    puntos: 50,
    tipo: 'normal',
    icon: Flame,
    tone: 'blue',
    info: 'Se enfrentan 2 equipos con 2 torres: quien primero junte todos los vasitos accede al QR. Hay una pelota en la cima que no se tiene que caer ni tocar con la mano. Vale 50 puntos.'
  },
  {
    id: 7,
    titulo: 'El Cronómetro',
    puntos: 70,
    tipo: 'normal',
    icon: ShieldCheck,
    tone: 'blue',
    info: 'Desafío de tiempo: Tienen que tocar el espacio en la notebook, iniciar el cronómetro y pararlo en 10 segundos clavados. Quien esté más cerca, gana. Vale 70 puntos.'
  },
  {
    id: 8,
    titulo: 'Tateti con botellas',
    puntos: 80,
    tipo: 'normal',
    icon: Trophy,
    tone: 'yellow',
    info: 'Se enfrentan 2 equipos (3 personas por equipo, una detrás de otra): hacen bottle challenge y quien deja la botella de pie puede ir a mover la ficha para el tatetí hasta que uno gane. Vale 80 puntos.'
  },
  {
    id: 9,
    titulo: 'QR Secreto #1',
    puntos: 100,
    tipo: 'bonus',
    icon: Sparkles,
    tone: 'yellow',
    info: 'Código QR escondido en el salón. Si lo encuentran y lo escanean, suman 100 puntos gratis.'
  },
  {
    id: 10,
    titulo: 'QR Secreto #2',
    puntos: 100,
    tipo: 'bonus',
    icon: Sparkles,
    tone: 'yellow',
    info: 'Código QR escondido en el salón. Si lo encuentran y lo escanean, suman 100 puntos gratis.'
  },
  {
    id: 11,
    titulo: 'QR Escondido · Trampa',
    puntos: -100,
    tipo: 'trampa',
    icon: AlertTriangle,
    tone: 'red',
    info: 'Código QR trampa escondido en el salón. Te da una pregunta: si respondés bien mantenés tus puntos como están; si respondés mal se te restan 100 puntos.'
  }
];

// Mapeo de gradientes brutalistas
const toneClasses = {
  yellow: 'from-yellow-300 via-yellow-500 to-orange-600',
  blue: 'from-blue-400 via-blue-600 to-blue-900',
  red: 'from-red-500 via-red-600 to-red-950'
};

// ============================================================================
// COMPONENTE DE TARJETA DE CADA MISIÓN (CON BOTÓN DE INFORMACIÓN "i")
// ============================================================================
function DesafioCard({ desafio, isDone }) {
  const [mostrarInfo, setMostrarInfo] = useState(false);
  const Icon = desafio.icon;
  const esTrampa = desafio.tipo === 'trampa';

  return (
    <article
      className={`flex flex-col rounded-2xl border ${
        isDone
          ? esTrampa
            ? 'border-red-500/40 bg-red-500/5'
            : 'border-yellow-400/30 bg-yellow-400/5'
          : 'border-white/[0.05] bg-[#0a0a0a]'
      } p-4 shadow-lg transition-colors`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative flex size-12 shrink-0 items-center justify-center">
            <div className={`absolute inset-0 rotate-45 rounded-xl bg-gradient-to-br ${toneClasses[desafio.tone] || toneClasses.blue} opacity-20`} />
            <Icon
              className={`relative z-10 size-6 ${
                isDone
                  ? esTrampa
                    ? 'text-red-400'
                    : 'text-yellow-400'
                  : esTrampa
                  ? 'text-red-500'
                  : 'text-blue-500'
              }`}
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black uppercase tracking-wide text-white truncate">
              {desafio.titulo}
            </h3>
            <p
              className={`text-[10px] font-bold uppercase tracking-widest ${
                isDone
                  ? esTrampa
                    ? 'text-red-400'
                    : 'text-yellow-400'
                  : 'text-gray-500'
              }`}
            >
              {isDone ? 'Completado ✓' : 'Pendiente'}
            </p>
          </div>
        </div>

        {/* Derecha: Botón "i" de información + Puntaje del juego */}
        <div className="flex items-center gap-2.5 shrink-0">
          {desafio.info && (
            <button
              type="button"
              onClick={() => setMostrarInfo(!mostrarInfo)}
              title="Ver explicación del juego"
              className={`size-7 rounded-full border font-mono text-xs font-black flex items-center justify-center transition-colors ${
                mostrarInfo
                  ? 'border-yellow-400 bg-yellow-400 text-black'
                  : 'border-white/20 bg-white/5 text-gray-300 hover:border-yellow-400/50 hover:text-yellow-400'
              }`}
            >
              i
            </button>
          )}

          <div className="text-right min-w-[44px]">
            <span
              className={`text-sm font-black ${
                esTrampa
                  ? 'text-red-500'
                  : isDone
                  ? 'text-yellow-400'
                  : 'text-gray-500'
              }`}
            >
              {desafio.puntos > 0 ? `+${desafio.puntos}` : desafio.puntos}
            </span>
          </div>
        </div>
      </div>

      {/* Cuadro desplegable con las reglas cuando tocan el botón "i" */}
      {mostrarInfo && desafio.info && (
        <div className="mt-3 rounded-xl border border-blue-500/30 bg-[#0a1224] p-3 text-xs text-gray-200 leading-relaxed">
          <p className="font-mono text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">
            ℹ️ ¿Cómo se juega?
          </p>
          <p>{desafio.info}</p>
        </div>
      )}
    </article>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL: DASHBOARD DEL JUGADOR
// ============================================================================
export default function DashboardJugador({ onEscanear, onSalir, rankingEnVivo }) {
  // Estado real del grupo sincronizado con Firebase
  const [grupoActual, setGrupoActual] = useState({
    nombre: 'CARGANDO...',
    pin: localStorage.getItem('miGrupoPIN') || '----',
    capitan1: '---',
    capitan2: 'PENDIENTE',
    puntosTotales: 0,
    vidas: 3,
    ranking: '-',
    juegosCompletados: [] 
  });

  // Estado local de ranking calculado en vivo para garantizar que nunca quede clavado en "TOP -"
  const [rankingCalculado, setRankingCalculado] = useState('-');

  // Candado local para evitar doble toque accidental en el botón de abrir cámara
  const [abriendoCamara, setAbriendoCamara] = useState(false);

  // Rol guardado en este dispositivo (Capitán 1 o Capitán 2)
  const miRolLocal = localStorage.getItem('miRolCapitan') || '';

  // ============================================================================
  // 1. ESCUCHADOR DE DATOS PROPIOS DEL ESCUADRÓN EN TIEMPO REAL
  // ============================================================================
  useEffect(() => {
    const pinGuardado = localStorage.getItem('miGrupoPIN');
    if (!pinGuardado) return;

    const q = query(collection(db, "grupos"), where("pin", "==", pinGuardado));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setGrupoActual({
          nombre: data.nombre || 'ESCUADRÓN',
          pin: data.pin,
          capitan1: data.capitan1 || 'CAPITÁN 1',
          capitan2: data.capitan2 || 'PENDIENTE',
          puntosTotales: Number(data.puntos || 0),
          vidas: data.vidas !== undefined ? Number(data.vidas) : 3,
          ranking: data.ranking || '-',
          juegosCompletados: Array.isArray(data.juegosCompletados) ? data.juegosCompletados : []
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // ============================================================================
  // 2. CÁLCULO DE RANKING GLOBAL EN TIEMPO REAL CON DESEMPATE POR TIEMPO
  // Descarga los puntajes de la colección `grupos`, los ordena de mayor a menor
  // (y desempata por quién llegó primero) y determina en qué puesto exacto está este equipo.
  // ============================================================================
  useEffect(() => {
    const pinGuardado = localStorage.getItem('miGrupoPIN');
    if (!pinGuardado) return;

    const qTodos = query(collection(db, "grupos"));
    const unsubscribeRanking = onSnapshot(qTodos, (snapshot) => {
      const todosLosGrupos = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          pin: data.pin,
          puntos: Number(data.puntos || 0),
          tiempo: Number(data.ultimaActualizacionPuntos || Number.MAX_SAFE_INTEGER)
        };
      });

      // Ordenamos de mayor a menor puntaje; en caso de empate gana quien llegó primero
      todosLosGrupos.sort((a, b) => {
        if (b.puntos !== a.puntos) return b.puntos - a.puntos;
        return a.tiempo - b.tiempo;
      });

      // Buscamos la posición de nuestro grupo
      const posicionIndex = todosLosGrupos.findIndex(g => g.pin === pinGuardado);

      // Si el grupo existe y ya sumó puntos (> 0), mostramos su puesto real (1, 2, 3...)
      if (posicionIndex !== -1 && todosLosGrupos[posicionIndex].puntos > 0) {
        setRankingCalculado(posicionIndex + 1);
      } else {
        setRankingCalculado('-');
      }
    });

    return () => unsubscribeRanking();
  }, []);

  // ============================================================================
  // 3. FUNCIÓN PARA COMPARTIR EL PIN Y EL LINK OFICIAL POR WHATSAPP
  // ============================================================================
  const handleCompartirWhatsapp = async () => {
    const mensaje = 
`⚡ *¡SUMATE A MI ESCUADRÓN "${grupoActual.nombre}" EN BRILLANDO!* ⚡

🔑 *Código PIN:* ${grupoActual.pin}
🌐 *Link del Juego:* https://brillando.vercel.app/juego

👥 *REGLA DE EQUIPO:* Cada grupo permite máximo *2 dispositivos conectados* (Capitán 1 y Capitán 2).
• *Capitán 1 (Dispositivo 1):* ${grupoActual.capitan1}
• *Capitán 2 (Dispositivo 2):* ${grupoActual.capitan2 === 'PENDIENTE' ? '¡Lugar disponible para vos!' : grupoActual.capitan2}

Entrá al link, tocá *"Ya tengo un PIN"* e ingresá el código *${grupoActual.pin}*.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Escuadrón ${grupoActual.nombre} - Brillando`,
          text: mensaje,
        });
      } catch (_) {
        // Usuario canceló el menú nativo
      }
    } else {
      const urlWhatsapp = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
      window.open(urlWhatsapp, '_blank');
    }
  };

  // ============================================================================
  // 4. DISPARADOR SEGURO DE CÁMARA (PREVIENE DOBLE INSTANCIA)
  // ============================================================================
  const handleClickEscanear = () => {
    if (abriendoCamara) return;
    setAbriendoCamara(true);
    onEscanear();
    setTimeout(() => setAbriendoCamara(false), 1000);
  };

  // Prioriza el ranking calculado en vivo; si no, usa el prop o el guardado en Firebase
  const puestoFinal = rankingCalculado !== '-' 
    ? rankingCalculado 
    : (rankingEnVivo && rankingEnVivo !== '-' ? rankingEnVivo : grupoActual.ranking);

  return (
    <main className="min-h-screen bg-[#050505] text-white pb-28">
      
      {/* TOP BAR */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/5 bg-[#050505]/90 px-5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Zap className="size-5 text-yellow-400" />
          <span className="text-sm font-black tracking-widest text-white uppercase">Brillando</span>
          {miRolLocal && (
            <span className="ml-2 rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase text-yellow-400">
              {miRolLocal}
            </span>
          )}
        </div>
        <button 
          onClick={onSalir} 
          title="Salir de la sesión"
          className="text-gray-500 hover:text-white transition-colors p-1"
        >
          <LogOut className="size-5" />
        </button>
      </header>

      <div className="px-5 py-6">
        
        {/* TARJETA PRINCIPAL DEL EQUIPO */}
        <div className="relative mb-8 overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-b from-[#0a0f1c] to-[#050505] p-6 shadow-2xl shadow-blue-900/20">
          <div className="absolute -right-10 -top-10 size-32 rounded-full bg-blue-500/10 blur-2xl" />
          
          {/* Cabecera: PIN, Nombre del Escuadrón y Ranking en Vivo */}
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">
                Escuadrón #{grupoActual.pin}
              </p>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                {grupoActual.nombre}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Ranking</p>
              <p className="text-xl font-black text-yellow-400">
                {puestoFinal !== '-' ? `TOP #${puestoFinal}` : 'SIN PUNTOS'}
              </p>
            </div>
          </div>

          {/* Bloque de Capitanes (Dispositivo 1 y Dispositivo 2) + Botón Compartir PIN */}
          <div className="relative z-10 mb-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/[0.03] border border-white/10 px-3.5 py-2.5">
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <Users className="size-4 text-blue-400 shrink-0" />
              <div>
                <span className="text-yellow-400 font-bold">CAP 1:</span>{' '}
                <span className="text-white">{grupoActual.capitan1}</span>
                <span className="mx-2 text-gray-600">|</span>
                <span className="text-blue-400 font-bold">CAP 2:</span>{' '}
                <span className={grupoActual.capitan2 === 'PENDIENTE' ? 'text-gray-500 italic' : 'text-white'}>
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
              Compartir PIN
            </button>
          </div>

          {/* Contador de Energía Total y Vidas Restantes */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-black/50 py-6 ring-1 ring-white/5 relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Energía Total</p>
            <div className="flex items-center gap-2">
              <span className="text-5xl font-black text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                {grupoActual.puntosTotales}
              </span>
              <Zap className="size-8 text-yellow-400" />
            </div>
            
            <div className="mt-4 flex gap-2">
              {[1, 2, 3].map((vida) => (
                <div 
                  key={vida} 
                  className={`size-3.5 rounded-full transition-all ${
                    vida <= grupoActual.vidas 
                      ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)] scale-100' 
                      : 'bg-gray-800 scale-90'
                  }`} 
                />
              ))}
            </div>
            <p className="mt-2 text-[10px] uppercase tracking-widest text-gray-500">
              {grupoActual.vidas === 1 ? '⚠️ ¡Última Vida!' : `${grupoActual.vidas} Vidas Restantes`}
            </p>
          </div>
        </div>

        {/* LISTA DE DESAFÍOS DE LA KERMESSE */}
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-300">Registro de Misiones</h2>
            <p className="text-[10px] font-mono text-gray-500 mt-0.5">Tocá el botón (i) para ver las reglas de cada puesto</p>
          </div>
          <span className="text-[10px] font-bold uppercase text-yellow-400">
            {grupoActual.juegosCompletados.length} de {desafios.length} Completadas
          </span>
        </div>
        
        <div className="flex flex-col gap-3">
          {desafios.map((desafio) => {
            const isDone = grupoActual.juegosCompletados.includes(desafio.id);
            return <DesafioCard key={desafio.id} desafio={desafio} isDone={isDone} />;
          })}
        </div>

      </div>

      {/* BOTÓN FLOTANTE DE ESCÁNER CON BLOQUEO ANTI-DOBLE TOQUE */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-[#050505] via-[#050505]/90 to-transparent p-5 pb-8">
        <button 
          onClick={handleClickEscanear}
          disabled={abriendoCamara}
          className="flex w-full items-center justify-center gap-3 rounded-full bg-yellow-400 py-4 text-sm font-black uppercase tracking-widest text-black shadow-[0_0_30px_rgba(250,204,21,0.3)] transition-transform active:scale-95 disabled:opacity-60"
        >
          <Camera className="size-5" />
          {abriendoCamara ? 'Abriendo Cámara...' : 'Escanear Desafío QR'}
        </button>
      </div>

    </main>
  );
}