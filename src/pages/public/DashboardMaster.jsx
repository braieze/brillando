import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../../config/firebase'; // Ajustá la ruta si es necesario
import {
  Crown,
  Trophy,
  Zap,
  ShieldCheck,
  Star,
  Flame,
  Medal,
  Users,
  ArrowUp,
  ArrowDown,
  Sparkles
} from 'lucide-react';

// ============================================================================
// CONFIGURACIÓN ESTÉTICA POR PUESTO (PODIO: ORO, PLATA, BRONCE + TOP 4 y 5)
// ============================================================================
const rankConfig = [
  {
    // #1 - ORO
    rank: 1,
    medalla: '🏆 1° LUGAR · MEDALLA DE ORO',
    premioTag: 'PREMIO MAYOR',
    icon: Crown,
    borderClass: 'border-yellow-400/80',
    bgGradient: 'from-[#292000] via-[#120e02] to-[#070707]',
    glowColor: 'shadow-[0_0_50px_rgba(250,204,21,0.22)]',
    badgeBg: 'bg-yellow-400 text-black border-yellow-200',
    textAccent: 'text-yellow-400',
    barGradient: 'from-yellow-300 via-yellow-500 to-orange-500',
    iconRing: 'from-yellow-300 via-yellow-500 to-amber-600'
  },
  {
    // #2 - PLATA
    rank: 2,
    medalla: '🥈 2° LUGAR · MEDALLA DE PLATA',
    premioTag: 'PODIO · PREMIO #2',
    icon: Medal,
    borderClass: 'border-slate-300/60',
    bgGradient: 'from-[#1b2028] via-[#0d1014] to-[#070707]',
    glowColor: 'shadow-[0_0_35px_rgba(203,213,225,0.14)]',
    badgeBg: 'bg-slate-200 text-black border-white',
    textAccent: 'text-slate-200',
    barGradient: 'from-slate-200 via-slate-400 to-slate-500',
    iconRing: 'from-slate-200 via-slate-400 to-slate-600'
  },
  {
    // #3 - BRONCE
    rank: 3,
    medalla: '🥉 3° LUGAR · MEDALLA DE BRONCE',
    premioTag: 'PODIO · PREMIO #3',
    icon: Flame,
    borderClass: 'border-amber-600/60',
    bgGradient: 'from-[#271506] via-[#120b05] to-[#070707]',
    glowColor: 'shadow-[0_0_35px_rgba(217,119,6,0.15)]',
    badgeBg: 'bg-amber-500 text-black border-amber-300',
    textAccent: 'text-amber-400',
    barGradient: 'from-amber-400 via-orange-500 to-amber-700',
    iconRing: 'from-amber-400 via-orange-500 to-amber-800'
  },
  {
    // #4 - ZONA DE CLASIFICACIÓN
    rank: 4,
    medalla: 'PUESTO #4 · EN CARRERA',
    premioTag: 'FUERA DEL PODIO',
    icon: ShieldCheck,
    borderClass: 'border-blue-500/30',
    bgGradient: 'from-[#091326] via-[#080b12] to-[#060606]',
    glowColor: 'shadow-lg',
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
    textAccent: 'text-blue-400',
    barGradient: 'from-blue-400 to-blue-700',
    iconRing: 'from-blue-500 to-blue-800'
  },
  {
    // #5 - ZONA DE CLASIFICACIÓN
    rank: 5,
    medalla: 'PUESTO #5 · EN CARRERA',
    premioTag: 'FUERA DEL PODIO',
    icon: Star,
    borderClass: 'border-teal-500/30',
    bgGradient: 'from-[#061e1e] via-[#071010] to-[#060606]',
    glowColor: 'shadow-lg',
    badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-400/30',
    textAccent: 'text-teal-400',
    barGradient: 'from-teal-400 to-teal-700',
    iconRing: 'from-teal-500 to-teal-800'
  }
];

export default function DashboardMaster() {
  const [topGrupos, setTopGrupos] = useState([]);
  const [energiaGlobal, setEnergiaGlobal] = useState(0);

  // Estado que guarda qué grupos acaban de subir o bajar: { [pin]: 'up' | 'down' | 'new' }
  const [movimientos, setMovimientos] = useState({});

  // Referencia para recordar el ranking anterior sin disparar re-renders innecesarios
  const prevRanksRef = useRef({});
  const cargaInicialRef = useRef(true);

  useEffect(() => {
    // 1. Escuchamos los 5 mejores grupos con puntos > 0 ordenados de mayor a menor
    const qTop = query(
      collection(db, "grupos"),
      where("puntos", ">", 0),
      orderBy("puntos", "desc"),
      limit(5)
    );

    const unsubscribeTop = onSnapshot(qTop, (snapshot) => {
      const nuevosMovimientos = {};
      const nuevoMapaRanks = {};

      const gruposMapeados = snapshot.docs.map((doc, index) => {
        const data = doc.data();
        const nuevoRank = index + 1;
        const pin = data.pin;
        const rankAnterior = prevRanksRef.current[pin];

        nuevoMapaRanks[pin] = nuevoRank;

        // Detectamos si subió, bajó o acaba de entrar al Top 5 (después de la primera carga)
        if (!cargaInicialRef.current) {
          if (rankAnterior === undefined) {
            nuevosMovimientos[pin] = 'up'; // Entró como nuevo al Top 5
          } else if (nuevoRank < rankAnterior) {
            nuevosMovimientos[pin] = 'up'; // Mejoró su posición (ej. de #3 a #1)
          } else if (nuevoRank > rankAnterior) {
            nuevosMovimientos[pin] = 'down'; // Cayó de posición (ej. de #1 a #2)
          }
        }

        const cfg = rankConfig[index] || rankConfig[4];

        return {
          id: doc.id,
          pin: data.pin,
          nombre: data.nombre || 'ESCUADRÓN',
          capitan1: data.capitan1 || null,
          capitan2: data.capitan2 && data.capitan2 !== 'PENDIENTE' ? data.capitan2 : null,
          puntos: Number(data.puntos || 0),
          juegosCompletados: Array.isArray(data.juegosCompletados) ? data.juegosCompletados.length : 0,
          rank: nuevoRank,
          cfg
        };
      });

      prevRanksRef.current = nuevoMapaRanks;
      cargaInicialRef.current = false;
      setTopGrupos(gruposMapeados);

      // Si hubo cambios de posición, activamos la animación por 3.5 segundos
      if (Object.keys(nuevosMovimientos).length > 0) {
        setMovimientos((prev) => ({ ...prev, ...nuevosMovimientos }));
        const timer = setTimeout(() => {
          setMovimientos({});
        }, 3500);
        return () => clearTimeout(timer);
      }
    });

    // 2. Calculamos la Energía Global de todos los grupos en vivo
    const qTotal = query(collection(db, "grupos"));
    const unsubscribeTotal = onSnapshot(qTotal, (snapshot) => {
      let total = 0;
      snapshot.forEach((doc) => {
        total += Number(doc.data().puntos || 0);
      });
      setEnergiaGlobal(total);
    });

    return () => {
      unsubscribeTop();
      unsubscribeTotal();
    };
  }, []);

  const lider = topGrupos[0];
  const restoTop = topGrupos.slice(1);

  return (
    <main className="min-h-screen bg-[#050505] text-white overflow-x-hidden font-sans">
      {/* KEYFRAMES INYECTADOS PARA ANIMACIONES DE SUBIDA Y BAJADA DE NIVEL */}
      <style>{`
        @keyframes rankUpAnim {
          0% { transform: translateY(28px) scale(0.98); box-shadow: 0 0 0 rgba(34,197,94,0); }
          35% { transform: translateY(-6px) scale(1.015); box-shadow: 0 0 45px rgba(34,197,94,0.45); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes rankDownAnim {
          0% { transform: translateY(-28px) scale(1.01); box-shadow: 0 0 0 rgba(239,68,68,0); }
          35% { transform: translateY(5px) scale(0.985); box-shadow: 0 0 40px rgba(239,68,68,0.4); }
          100% { transform: translateY(0) scale(1); }
        }
        .anim-rank-up {
          animation: rankUpAnim 0.85s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          border-color: rgba(74, 222, 128, 0.9) !important;
        }
        .anim-rank-down {
          animation: rankDownAnim 0.85s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          border-color: rgba(248, 113, 113, 0.85) !important;
        }
      `}</style>

      {/* ================= BARRA SUPERIOR ================= */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-[80px] items-center justify-between border-b border-white/10 bg-[#050505]/90 px-10 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Crown className="size-7 text-yellow-400" />
          <span className="text-xl font-black tracking-[0.2em] text-white uppercase">
            CONGRESO BRILLANDO
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 rounded-full bg-blue-600/20 px-6 py-2.5 border border-blue-500/30">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
              ENERGÍA GLOBAL:
            </span>
            <span className="text-xl font-black text-white">
              {energiaGlobal.toLocaleString()}
            </span>
            <Zap className="size-5 text-yellow-400 ml-1" />
          </div>
        </div>
      </header>

      {/* ================= CONTENIDO PRINCIPAL (LISTA VERTICAL) ================= */}
      <section className="px-8 pb-16 pt-[110px] mx-auto max-w-[1350px]">
        
        {/* Encabezado de Sección */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 relative z-10">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.3em] text-yellow-400">
              Premios a los 3 primeros puestos · Oro, Plata y Bronce
            </p>
            <h1 className="text-5xl font-black tracking-tight text-white uppercase">
              RANKING EN VIVO
            </h1>
          </div>

          <div className="flex gap-3 items-center rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-xs font-bold tracking-widest text-red-400 uppercase">
              Transmisión Activa
            </span>
          </div>
        </div>

        {/* Estado vacío cuando aún nadie sumó puntos */}
        {topGrupos.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[420px] border-2 border-dashed border-white/10 rounded-3xl">
            <ShieldCheck className="size-16 text-gray-600 mb-4" />
            <p className="text-xl font-bold uppercase tracking-widest text-gray-500">
              Esperando los primeros puntajes...
            </p>
          </div>
        ) : (
          /* CONTENEDOR EN LISTA VERTICAL (UNO DEBAJO DEL OTRO) */
          <div className="flex flex-col gap-5">
            
            {/* ==============================================================
                PUESTO #1 (MEDALLA DE ORO) - FILA GIGANTE DESTACADA ARRIBA
               ============================================================== */}
            {lider && (() => {
              const movLider = movimientos[lider.pin];
              const animClass = movLider === 'up' ? 'anim-rank-up' : movLider === 'down' ? 'anim-rank-down' : '';

              return (
                <article
                  key={lider.pin}
                  className={`relative overflow-hidden rounded-3xl border-2 ${lider.cfg.borderClass} bg-gradient-to-r ${lider.cfg.bgGradient} p-7 md:p-9 ${lider.cfg.glowColor} transition-all duration-500 ${animClass}`}
                >
                  {/* Luces ambientales de fondo */}
                  <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-yellow-400/15 blur-3xl" />
                  <div className="pointer-events-none absolute -left-20 -bottom-20 size-72 rounded-full bg-amber-500/10 blur-3xl" />

                  <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    
                    {/* Izquierda: Corona Gigante + Posición #1 */}
                    <div className="flex items-center gap-6">
                      <div className="relative shrink-0">
                        <div className="grid size-24 md:size-28 place-items-center rounded-full bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-500 p-1 shadow-[0_0_45px_rgba(250,204,21,0.45)]">
                          <div className="grid size-full place-items-center rounded-full bg-[#0a0a0a]">
                            <Crown className="size-12 md:size-14 text-yellow-400" strokeWidth={1.8} />
                          </div>
                        </div>
                        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-yellow-400 px-3.5 py-0.5 text-xs font-black tracking-widest text-black shadow-lg">
                          RANK #1
                        </span>
                      </div>

                      {/* Centro: Medalla de Oro + Nombre Gigante + PIN + Capitanes */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2.5 mb-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-300 bg-yellow-400 px-3.5 py-1 text-[11px] font-black tracking-widest text-black uppercase">
                            <Trophy className="size-3.5" />
                            {lider.cfg.medalla}
                          </span>

                          {/* Indicador animado de subida o bajada */}
                          {movLider === 'up' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-500 px-3 py-1 text-xs font-black uppercase tracking-wider text-black animate-bounce">
                              <ArrowUp className="size-4 stroke-[3]" /> ¡TOMÓ LA PUNTA!
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-baseline gap-4">
                          <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white uppercase leading-none">
                            {lider.nombre}
                          </h2>
                          <span className="text-2xl md:text-3xl font-black font-mono text-yellow-400">
                            #{lider.pin}
                          </span>
                        </div>

                        {/* Capitanes del Escuadrón Líder */}
                        {(lider.capitan1 || lider.capitan2) && (
                          <div className="mt-3 flex items-center gap-2 text-xs font-mono text-gray-300">
                            <Users className="size-4 text-yellow-400" />
                            <span>
                              <strong className="text-yellow-400">CAPITANES:</strong>{' '}
                              {lider.capitan1 || '---'} {lider.capitan2 ? ` & ${lider.capitan2}` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Derecha: Puntaje Masivo en Oro */}
                    <div className="flex flex-col lg:items-end justify-center border-t lg:border-t-0 border-white/10 pt-4 lg:pt-0">
                      <span className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-300/80 mb-1">
                        ENERGÍA ACUMULADA
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-5xl md:text-7xl font-black text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.4)] leading-none">
                          {lider.puntos.toLocaleString()}
                        </span>
                        <Zap className="size-10 text-yellow-400 fill-yellow-400" />
                      </div>
                      <span className="mt-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                        {lider.juegosCompletados} estaciones superadas
                      </span>
                    </div>

                  </div>
                </article>
              );
            })()}

            {/* ==============================================================
                PUESTOS #2 AL #5 (PLATA, BRONCE Y RESTO) EN FILAS APILADAS
               ============================================================== */}
            {restoTop.map((grupo) => {
              const Icon = grupo.cfg.icon;
              const mov = movimientos[grupo.pin];
              const animClass = mov === 'up' ? 'anim-rank-up' : mov === 'down' ? 'anim-rank-down' : '';
              const esPodio = grupo.rank === 2 || grupo.rank === 3;
              const porcentajeRespectoAlLider = Math.min(
                100,
                Math.max(8, Math.round((grupo.puntos / (lider?.puntos || 1)) * 100))
              );

              return (
                <article
                  key={grupo.pin}
                  className={`relative overflow-hidden rounded-2xl border ${grupo.cfg.borderClass} bg-gradient-to-r ${grupo.cfg.bgGradient} px-6 py-5 ${grupo.cfg.glowColor} transition-all duration-500 ${animClass}`}
                >
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* Izquierda: Número de Puesto + Icono de Medalla + Datos del Equipo */}
                    <div className="flex items-center gap-5 min-w-0">
                      <div className="flex items-center gap-3 shrink-0">
                        <div className={`grid size-16 place-items-center rounded-2xl bg-gradient-to-br ${grupo.cfg.iconRing} p-0.5 shadow-md`}>
                          <div className="grid size-full place-items-center rounded-[14px] bg-[#0a0a0a]">
                            <Icon className={`size-8 ${grupo.cfg.textAccent}`} strokeWidth={1.8} />
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`inline-block rounded-full border px-3 py-0.5 text-[10px] font-black uppercase tracking-widest ${grupo.cfg.badgeBg}`}>
                            {grupo.cfg.medalla}
                          </span>

                          {/* Cartel animado cuando sube o baja de nivel */}
                          {mov === 'up' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-black animate-bounce">
                              <ArrowUp className="size-3.5 stroke-[3]" /> SUBIÓ AL #{grupo.rank}
                            </span>
                          )}
                          {mov === 'down' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white animate-pulse">
                              <ArrowDown className="size-3.5 stroke-[3]" /> BAJÓ AL #{grupo.rank}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-baseline gap-3">
                          <h3 className={`${esPodio ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl'} font-black uppercase tracking-tight text-white truncate`}>
                            {grupo.nombre}
                          </h3>
                          <span className={`text-lg font-mono font-black ${grupo.cfg.textAccent}`}>
                            #{grupo.pin}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Centro/Derecha: Barra de progreso comparativa + Puntaje */}
                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                      
                      {/* Barra de Progreso comparada con el #1 */}
                      <div className="hidden xl:flex flex-col w-56">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                          <span>Progreso vs Líder</span>
                          <span>{porcentajeRespectoAlLider}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${grupo.cfg.barGradient} transition-all duration-700`}
                            style={{ width: `${porcentajeRespectoAlLider}%` }}
                          />
                        </div>
                      </div>

                      {/* Puntaje del Grupo */}
                      <div className="text-right shrink-0 min-w-[130px]">
                        <span className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          Energía
                        </span>
                        <span className={`${esPodio ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'} font-black ${grupo.cfg.textAccent}`}>
                          {grupo.puntos.toLocaleString()}
                        </span>
                      </div>

                    </div>

                  </div>
                </article>
              );
            })}

          </div>
        )}
      </section>
    </main>
  );
}