import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
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
  AlertTriangle
} from 'lucide-react';

// ============================================================================
// META DE ENERGÍA GLOBAL PARA EL "EFECTO DETONADOR" (PUNTO 6)
// Podés ajustar este número según la cantidad de grupos que haya en el salón.
// ============================================================================
const META_ENERGIA_DETONADOR = 5000;

// ============================================================================
// CONFIGURACIÓN ESTÉTICA POR PUESTO (ORO, PLATA, BRONCE + PUESTO 4 y 5)
// ============================================================================
const rankConfig = [
  {
    rank: 1,
    medalla: '🏆 1° PREMIO · MEDALLA DE ORO',
    icon: Crown,
    borderClass: 'border-yellow-400/80',
    bgGradient: 'from-[#292000] via-[#120e02] to-[#070707]',
    glowColor: 'shadow-[0_0_40px_rgba(250,204,21,0.22)]',
    badgeBg: 'bg-yellow-400 text-black border-yellow-200',
    textAccent: 'text-yellow-400',
    barGradient: 'from-yellow-300 via-yellow-500 to-orange-500',
    iconRing: 'from-yellow-300 via-yellow-500 to-amber-600'
  },
  {
    rank: 2,
    medalla: '🥈 2° PREMIO · MEDALLA DE PLATA',
    icon: Medal,
    borderClass: 'border-slate-300/60',
    bgGradient: 'from-[#1b2028] via-[#0d1014] to-[#070707]',
    glowColor: 'shadow-[0_0_25px_rgba(203,213,225,0.12)]',
    badgeBg: 'bg-slate-200 text-black border-white',
    textAccent: 'text-slate-200',
    barGradient: 'from-slate-200 via-slate-400 to-slate-500',
    iconRing: 'from-slate-200 via-slate-400 to-slate-600'
  },
  {
    rank: 3,
    medalla: '🥉 3° PREMIO · MEDALLA DE BRONCE',
    icon: Flame,
    borderClass: 'border-amber-600/60',
    bgGradient: 'from-[#271506] via-[#120b05] to-[#070707]',
    glowColor: 'shadow-[0_0_25px_rgba(217,119,6,0.14)]',
    badgeBg: 'bg-amber-500 text-black border-amber-300',
    textAccent: 'text-amber-400',
    barGradient: 'from-amber-400 via-orange-500 to-amber-700',
    iconRing: 'from-amber-400 via-orange-500 to-amber-800'
  },
  {
    rank: 4,
    medalla: 'PUESTO #4 · ZONA DE CLASIFICACIÓN',
    icon: ShieldCheck,
    borderClass: 'border-blue-500/30',
    bgGradient: 'from-[#091326] via-[#080b12] to-[#060606]',
    glowColor: 'shadow-md',
    badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
    textAccent: 'text-blue-400',
    barGradient: 'from-blue-400 to-blue-700',
    iconRing: 'from-blue-500 to-blue-800'
  },
  {
    rank: 5,
    medalla: 'PUESTO #5 · ZONA DE CLASIFICACIÓN',
    icon: Star,
    borderClass: 'border-teal-500/30',
    bgGradient: 'from-[#061e1e] via-[#071010] to-[#060606]',
    glowColor: 'shadow-md',
    badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-400/30',
    textAccent: 'text-teal-400',
    barGradient: 'from-teal-400 to-teal-700',
    iconRing: 'from-teal-500 to-teal-800'
  }
];

// Helper para convertir cualquier fecha de Firestore a milisegundos
const obtenerMilisegundos = (valorFecha) => {
  if (!valorFecha) return null;
  if (typeof valorFecha === 'number') return valorFecha;
  if (typeof valorFecha?.toMillis === 'function') return valorFecha.toMillis();
  if (valorFecha?.seconds) return valorFecha.seconds * 1000;
  const parsed = new Date(valorFecha).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

export default function DashboardMaster() {
  const [topGrupos, setTopGrupos] = useState([]);
  const [energiaGlobal, setEnergiaGlobal] = useState(0);
  const [totalEscuadrones, setTotalEscuadrones] = useState(0);

  // Estado de animaciones de subida y bajada: { [pin]: 'up' | 'down' }
  const [movimientos, setMovimientos] = useState({});

  // Estado para el "Efecto Detonador" cuando se alcanza la meta (o se prueba manualmente)
  const [detonadorActivo, setDetonadorActivo] = useState(false);
  const [detonadorCerradoManualmente, setDetonadorCerradoManualmente] = useState(false);

  // Referencias en memoria para:
  // 1) Recordar el puesto anterior de cada grupo (animaciones de subida/bajada)
  // 2) Recordar el instante exacto en que cada grupo alcanzó su puntaje actual (DESEMPATE JUSTO)
  // 3) Detectar rachas seguidas ("ON FIRE 🔥")
  const prevRanksRef = useRef({});
  const scoreMetaRef = useRef({});
  const cargaInicialRef = useRef(true);

  useEffect(() => {
    const qTodos = query(collection(db, "grupos"));

    const unsubscribe = onSnapshot(qTodos, (snapshot) => {
      let sumaEnergia = 0;
      const ahora = Date.now();
      const gruposConPuntos = [];

      // 1. Procesamos todos los documentos de la colección `grupos`
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const pin = data.pin || docSnap.id;
        const puntos = Number(data.puntos || 0);
        sumaEnergia += puntos;

        // Seguimiento en memoria para Desempate Justo y Racha "ON FIRE"
        const metaPrevia = scoreMetaRef.current[pin];
        const timestampServidor =
          obtenerMilisegundos(data.ultimaActualizacionPuntos) ||
          obtenerMilisegundos(data.creadoEn);

        if (!metaPrevia) {
          // Primera vez que vemos a este grupo en esta sesión de pantalla
          scoreMetaRef.current[pin] = {
            puntos,
            alcanzadoEn: timestampServidor || ahora,
            ultimoAciertoEn: 0,
            racha: 0,
            onFireHasta: 0
          };
        } else if (puntos !== metaPrevia.puntos) {
          if (puntos > metaPrevia.puntos) {
            // ¡El equipo acaba de sumar puntos!
            // Si sumó dos veces en menos de 4 minutos (240.000 ms), entra en racha "ON FIRE 🔥"
            const dentroDeVentanaRacha = (ahora - metaPrevia.ultimoAciertoEn) < 240000;
            const nuevaRacha = dentroDeVentanaRacha ? metaPrevia.racha + 1 : 1;

            scoreMetaRef.current[pin] = {
              puntos,
              alcanzadoEn: obtenerMilisegundos(data.ultimaActualizacionPuntos) || ahora,
              ultimoAciertoEn: ahora,
              racha: nuevaRacha,
              onFireHasta: nuevaRacha >= 2 ? ahora + 180000 : metaPrevia.onFireHasta // Dura 3 min encendido
            };
          } else {
            // Perdió puntos (Game Over)
            scoreMetaRef.current[pin] = {
              puntos,
              alcanzadoEn: ahora,
              ultimoAciertoEn: 0,
              racha: 0,
              onFireHasta: 0
            };
          }
        }

        if (puntos > 0) {
          const metaActual = scoreMetaRef.current[pin];
          gruposConPuntos.push({
            id: docSnap.id,
            pin,
            nombre: data.nombre || 'ESCUADRÓN',
            capitan1: data.capitan1 || 'SIN REGISTRAR',
            capitan2: data.capitan2 && data.capitan2 !== 'PENDIENTE' ? data.capitan2 : 'ESPERANDO...',
            puntos,
            juegosCompletados: Array.isArray(data.juegosCompletados) ? data.juegosCompletados.length : 0,
            alcanzadoEn: metaActual.alcanzadoEn,
            onFire: Boolean(data.onFire) || (metaActual.onFireHasta > ahora)
          });
        }
      });

      // Actualizamos contadores globales de la cabecera
      setTotalEscuadrones(snapshot.size);
      setEnergiaGlobal(sumaEnergia);

      // Si la energía global supera la meta, activamos el Efecto Detonador
      if (sumaEnergia >= META_ENERGIA_DETONADOR && !detonadorCerradoManualmente) {
        setDetonadorActivo(true);
      }

      // 2. REGLA DE DESEMPATE (PUNTO 3):
      // Primero ordena por mayor puntaje (b.puntos - a.puntos).
      // Si tienen EXACTAMENTE los mismos puntos, queda arriba el que llegó PRIMERO (menor alcanzadoEn).
      gruposConPuntos.sort((a, b) => {
        if (b.puntos !== a.puntos) {
          return b.puntos - a.puntos;
        }
        return a.alcanzadoEn - b.alcanzadoEn;
      });

      // 3. Tomamos el Top 5 y calculamos animaciones de subida/bajada
      const top5 = gruposConPuntos.slice(0, 5);
      const nuevosMovimientos = {};
      const nuevoMapaRanks = {};

      const top5Mapeado = top5.map((grupo, index) => {
        const nuevoRank = index + 1;
        const rankAnterior = prevRanksRef.current[grupo.pin];
        nuevoMapaRanks[grupo.pin] = nuevoRank;

        if (!cargaInicialRef.current) {
          if (rankAnterior === undefined || nuevoRank < rankAnterior) {
            nuevosMovimientos[grupo.pin] = 'up';
          } else if (nuevoRank > rankAnterior) {
            nuevosMovimientos[grupo.pin] = 'down';
          }
        }

        return {
          ...grupo,
          rank: nuevoRank,
          cfg: rankConfig[index] || rankConfig[4]
        };
      });

      prevRanksRef.current = nuevoMapaRanks;
      cargaInicialRef.current = false;
      setTopGrupos(top5Mapeado);

      if (Object.keys(nuevosMovimientos).length > 0) {
        setMovimientos((prev) => ({ ...prev, ...nuevosMovimientos }));
        setTimeout(() => {
          setMovimientos({});
        }, 3500);
      }
    });

    return () => unsubscribe();
  }, [detonadorCerradoManualmente]);

  const lider = topGrupos[0];
  const restoTop = topGrupos.slice(1);
  const porcentajeGlobal = Math.min(100, Math.round((energiaGlobal / META_ENERGIA_DETONADOR) * 100));

  return (
    <main className="h-screen w-screen bg-[#050505] text-white overflow-hidden font-sans flex flex-col justify-between select-none">
      {/* KEYFRAMES PARA ANIMACIONES DE RANKING Y EFECTO DETONADOR */}
      <style>{`
        @keyframes rankUpAnim {
          0% { transform: translateY(20px) scale(0.985); box-shadow: 0 0 0 rgba(34,197,94,0); }
          35% { transform: translateY(-4px) scale(1.01); box-shadow: 0 0 40px rgba(34,197,94,0.45); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes rankDownAnim {
          0% { transform: translateY(-20px) scale(1.01); box-shadow: 0 0 0 rgba(239,68,68,0); }
          35% { transform: translateY(4px) scale(0.99); box-shadow: 0 0 35px rgba(239,68,68,0.4); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes sirenFlash {
          0%, 100% { background-color: rgba(220, 38, 38, 0.92); }
          50% { background-color: rgba(10, 10, 10, 0.96); }
        }
        .anim-rank-up {
          animation: rankUpAnim 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          border-color: rgba(74, 222, 128, 0.9) !important;
        }
        .anim-rank-down {
          animation: rankDownAnim 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          border-color: rgba(248, 113, 113, 0.85) !important;
        }
        .detonador-overlay {
          animation: sirenFlash 0.9s infinite;
        }
      `}</style>

      {/* ====================================================================
          MODAL DE CLÍMAX: "EFECTO DETONADOR" AL 100% DE ENERGÍA (PUNTO 6)
         ==================================================================== */}
      {detonadorActivo && (
        <div className="detonador-overlay fixed inset-0 z-50 flex flex-col items-center justify-center p-8 text-center backdrop-blur-xl">
          <div className="mb-4 rounded-full border-4 border-white bg-black/80 p-6 shadow-[0_0_80px_#fff] animate-bounce">
            <AlertTriangle className="size-20 text-yellow-400" />
          </div>
          <p className="text-sm font-mono font-black uppercase tracking-[0.4em] text-yellow-300 mb-2">
            ⚡ META DE ENERGÍA ALCANZADA · {energiaGlobal.toLocaleString()} PTS ⚡
          </p>
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-white drop-shadow-[0_5px_30px_rgba(0,0,0,0.9)]">
            ¡SISTEMA VULNERADO!
          </h1>
          <p className="mt-4 max-w-2xl text-xl md:text-2xl font-bold uppercase tracking-widest text-white/90">
            Las ataduras del molde se rompieron. Llamando al Escuadrón #1 al detonador central:
          </p>

          {lider && (
            <div className="mt-6 rounded-3xl border-4 border-yellow-400 bg-black/90 px-10 py-6 shadow-2xl">
              <span className="text-xs font-black uppercase tracking-[0.3em] text-yellow-400">
                🏆 GANADORES · MEDALLA DE ORO
              </span>
              <h2 className="mt-1 text-5xl md:text-6xl font-black uppercase text-white">
                {lider.nombre} <span className="text-yellow-400 font-mono">#{lider.pin}</span>
              </h2>
              <p className="mt-2 font-mono text-sm text-gray-300 uppercase">
                CAP 1: <strong className="text-white">{lider.capitan1}</strong> · CAP 2: <strong className="text-white">{lider.capitan2}</strong>
              </p>
            </div>
          )}

          <button
            onClick={() => {
              setDetonadorActivo(false);
              setDetonadorCerradoManualmente(true);
            }}
            className="mt-8 rounded-full border border-white/30 bg-black/60 px-6 py-2 text-xs font-bold uppercase tracking-widest text-gray-300 hover:bg-white hover:text-black transition-colors"
          >
            Ocultar alerta y volver a la tabla
          </button>
        </div>
      )}

      {/* ================= BARRA SUPERIOR COMPACTA ================= */}
      <header className="z-20 flex h-[68px] shrink-0 items-center justify-between border-b border-white/10 bg-[#050505]/95 px-8">
        <div className="flex items-center gap-3">
          <Crown className="size-6 text-yellow-400" />
          <span className="text-lg font-black tracking-[0.2em] text-white uppercase">
            CONGRESO BRILLANDO
          </span>
          <span className="hidden md:inline-block ml-3 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-yellow-400">
            Premios a los 3 primeros: Oro, Plata y Bronce
          </span>
        </div>

        {/* Contadores Globales: Total de Escuadrones + Energía Global */}
        <div className="flex items-center gap-4">
          {/* PUNTO 2: CONTADOR DE GRUPOS ACTIVOS EN VIVO */}
          <div className="flex items-center gap-2 rounded-full bg-white/[0.04] px-4 py-1.5 border border-white/10">
            <Users className="size-4 text-blue-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              ESCUADRONES:
            </span>
            <span className="text-lg font-black text-white font-mono">
              {totalEscuadrones}
            </span>
          </div>

          {/* ENERGÍA GLOBAL + BARRA DE CARGA AL DETONADOR */}
          <div
            onClick={() => setDetonadorActivo(true)}
            title="Clic para simular el Efecto Detonador"
            className="cursor-pointer flex items-center gap-3 rounded-full bg-blue-600/20 px-5 py-1.5 border border-blue-500/30 hover:border-yellow-400/50 transition-colors"
          >
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                  ENERGÍA GLOBAL ({porcentajeGlobal}%):
                </span>
                <span className="text-lg font-black text-white font-mono">
                  {energiaGlobal.toLocaleString()}
                </span>
              </div>
              <div className="h-1 w-32 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 via-yellow-400 to-red-500 transition-all duration-500"
                  style={{ width: `${porcentajeGlobal}%` }}
                />
              </div>
            </div>
            <Zap className="size-5 text-yellow-400" />
          </div>
        </div>
      </header>

      {/* ================= CONTENIDO PRINCIPAL (ENTRA 100% EN PANTALLA) ================= */}
      <section className="flex-1 flex flex-col justify-between px-8 py-4 mx-auto w-full max-w-[1440px] min-h-0">
        
        {/* Subcabecera compacta */}
        <div className="mb-2 flex items-center justify-between shrink-0">
          <div className="flex items-baseline gap-4">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase leading-none">
              TOP 5 EN VIVO
            </h1>
            <span className="text-xs font-mono uppercase tracking-widest text-gray-400">
              • En caso de empate en puntos, gana quien llegó primero
            </span>
          </div>

          <div className="flex gap-2.5 items-center rounded-full border border-red-500/30 bg-red-500/10 px-3.5 py-1">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="text-[11px] font-bold tracking-widest text-red-400 uppercase">
              Tiempo Real
            </span>
          </div>
        </div>

        {/* Estado vacío */}
        {topGrupos.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl my-2">
            <ShieldCheck className="size-14 text-gray-600 mb-3" />
            <p className="text-lg font-bold uppercase tracking-widest text-gray-500">
              Esperando que los escuadrones sumen sus primeros puntos...
            </p>
          </div>
        ) : (
          /* LISTA VERTICAL COMPACTA DISTRIBUIDA EN EL ALTO DE LA PANTALLA */
          <div className="flex-1 flex flex-col justify-start gap-2.5 min-h-0">
            
            {/* ==============================================================
                PUESTO #1 (MEDALLA DE ORO) - DESTACADO PERO CALIBRADO PARA 100VH
               ============================================================== */}
            {lider && (() => {
              const movLider = movimientos[lider.pin];
              const animClass = movLider === 'up' ? 'anim-rank-up' : movLider === 'down' ? 'anim-rank-down' : '';

              return (
                <article
                  key={lider.pin}
                  className={`relative shrink-0 overflow-hidden rounded-3xl border-2 ${lider.cfg.borderClass} bg-gradient-to-r ${lider.cfg.bgGradient} px-7 py-4 ${lider.cfg.glowColor} transition-all duration-500 ${animClass}`}
                >
                  <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-yellow-400/15 blur-3xl" />

                  <div className="relative z-10 flex items-center justify-between gap-6">
                    
                    {/* Izquierda: Corona + Datos del Líder + Capitanes 1 y 2 */}
                    <div className="flex items-center gap-5 min-w-0">
                      <div className="relative shrink-0">
                        <div className="grid size-20 place-items-center rounded-full bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-500 p-1 shadow-[0_0_30px_rgba(250,204,21,0.4)]">
                          <div className="grid size-full place-items-center rounded-full bg-[#0a0a0a]">
                            <Crown className="size-10 text-yellow-400" strokeWidth={1.8} />
                          </div>
                        </div>
                        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-yellow-400 px-3 py-0.5 text-[10px] font-black tracking-widest text-black shadow">
                          RANK #1
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-300 bg-yellow-400 px-3 py-0.5 text-[10px] font-black tracking-widest text-black uppercase">
                            <Trophy className="size-3" />
                            {lider.cfg.medalla}
                          </span>

                          {/* Indicador de Racha ON FIRE */}
                          {lider.onFire && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-red-600 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-[0_0_15px_rgba(249,115,22,0.6)] animate-pulse">
                              🔥 EN RACHA
                            </span>
                          )}

                          {movLider === 'up' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-black animate-bounce">
                              <ArrowUp className="size-3 stroke-[3]" /> ¡NUEVO LÍDER!
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline gap-3">
                          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white uppercase leading-none truncate">
                            {lider.nombre}
                          </h2>
                          <span className="text-xl md:text-2xl font-black font-mono text-yellow-400 shrink-0">
                            #{lider.pin}
                          </span>
                        </div>

                        {/* PUNTO 1: NOMBRES DE LOS DOS CAPITANES CLARAMENTE VISIBLES */}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-mono">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/50 border border-yellow-400/30 px-2.5 py-1 text-gray-200">
                            <Users className="size-3.5 text-yellow-400" />
                            <strong className="text-yellow-400">CAP 1:</strong> {lider.capitan1}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/50 border border-yellow-400/30 px-2.5 py-1 text-gray-200">
                            <strong className="text-yellow-400">CAP 2:</strong> {lider.capitan2}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Derecha: Puntaje Masivo en Oro */}
                    <div className="flex flex-col items-end justify-center shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-300/80">
                        ENERGÍA ACUMULADA · {lider.juegosCompletados}/4 MISIONES
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-5xl md:text-6xl font-black text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.4)] leading-none">
                          {lider.puntos.toLocaleString()}
                        </span>
                        <Zap className="size-9 text-yellow-400 fill-yellow-400" />
                      </div>
                    </div>

                  </div>
                </article>
              );
            })()}

            {/* ==============================================================
                PUESTOS #2 AL #5 (PLATA, BRONCE Y RESTO) COMPACTOS Y VISIBLES
               ============================================================== */}
            {restoTop.map((grupo) => {
              const Icon = grupo.cfg.icon;
              const mov = movimientos[grupo.pin];
              const animClass = mov === 'up' ? 'anim-rank-up' : mov === 'down' ? 'anim-rank-down' : '';
              const esPodio = grupo.rank === 2 || grupo.rank === 3;
              const diferenciaConLider = (lider?.puntos || 0) - grupo.puntos;
              const porcentajeMisiones = Math.min(100, Math.round((grupo.juegosCompletados / 4) * 100));

              return (
                <article
                  key={grupo.pin}
                  className={`relative flex-1 min-h-[78px] max-h-[108px] flex items-center overflow-hidden rounded-2xl border ${grupo.cfg.borderClass} bg-gradient-to-r ${grupo.cfg.bgGradient} px-6 py-2.5 ${grupo.cfg.glowColor} transition-all duration-500 ${animClass}`}
                >
                  <div className="relative z-10 flex w-full items-center justify-between gap-4">
                    
                    {/* Izquierda: Icono + Medalla + Nombre + Capitanes 1 y 2 */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`grid size-13 place-items-center rounded-2xl bg-gradient-to-br ${grupo.cfg.iconRing} p-0.5 shadow shrink-0`}>
                        <div className="grid size-full place-items-center rounded-[14px] bg-[#0a0a0a] p-2.5">
                          <Icon className={`size-6 ${grupo.cfg.textAccent}`} strokeWidth={2} />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${grupo.cfg.badgeBg}`}>
                            {grupo.cfg.medalla}
                          </span>

                          {/* Indicador de Racha ON FIRE */}
                          {grupo.onFire && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-red-600 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white animate-pulse">
                              🔥 EN RACHA
                            </span>
                          )}

                          {mov === 'up' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-black animate-bounce">
                              <ArrowUp className="size-3 stroke-[3]" /> SUBIÓ AL #{grupo.rank}
                            </span>
                          )}
                          {mov === 'down' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white animate-pulse">
                              <ArrowDown className="size-3 stroke-[3]" /> BAJÓ AL #{grupo.rank}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-baseline gap-3">
                          <h3 className={`${esPodio ? 'text-2xl' : 'text-xl'} font-black uppercase tracking-tight text-white truncate leading-tight`}>
                            {grupo.nombre}
                          </h3>
                          <span className={`text-base font-mono font-black ${grupo.cfg.textAccent} shrink-0`}>
                            #{grupo.pin}
                          </span>

                          {/* PUNTO 1: CAPITÁN 1 Y CAPITÁN 2 EN TODAS LAS FILAS */}
                          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-gray-300 ml-1">
                            <span className="rounded bg-white/[0.04] border border-white/10 px-2 py-0.5">
                              <strong className={grupo.cfg.textAccent}>CAP 1:</strong> {grupo.capitan1}
                            </span>
                            <span className="rounded bg-white/[0.04] border border-white/10 px-2 py-0.5">
                              <strong className={grupo.cfg.textAccent}>CAP 2:</strong> {grupo.capitan2}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Derecha: Estado de Misiones / Desempate + Puntaje */}
                    <div className="flex items-center gap-6 shrink-0">
                      
                      {/* Explicación clara en lugar de "Progreso vs Líder" */}
                      <div className="hidden xl:flex flex-col w-56 text-right">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                          <span>{grupo.juegosCompletados}/4 MISIONES</span>
                          <span className={diferenciaConLider === 0 ? 'text-yellow-400' : 'text-gray-400'}>
                            {diferenciaConLider === 0
                              ? 'EMPATE · POR TIEMPO'
                              : `A ${diferenciaConLider} PTS DEL #1`}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${grupo.cfg.barGradient} transition-all duration-700`}
                            style={{ width: `${ Math.max(12, porcentajeMisiones) }%` }}
                          />
                        </div>
                      </div>

                      {/* Puntaje del Grupo */}
                      <div className="text-right min-w-[110px]">
                        <span className="block text-[9px] font-bold uppercase tracking-widest text-gray-400">
                          Energía
                        </span>
                        <span className={`${esPodio ? 'text-3xl' : 'text-2xl'} font-black ${grupo.cfg.textAccent} leading-none`}>
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