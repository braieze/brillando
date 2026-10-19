import React, { useState, useEffect } from 'react';
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
  Users
} from 'lucide-react';

// Mapeo dinámico de íconos según el ranking
const rankIcons = [Crown, Zap, Flame, ShieldCheck, Star];
const rankColors = [
  'from-yellow-300 via-yellow-500 to-orange-500', // #1 Dorado
  'from-gray-300 via-gray-400 to-gray-500',       // #2 Plata
  'from-orange-400 via-orange-600 to-orange-800', // #3 Bronce
  'from-blue-400 via-blue-600 to-blue-800',       // #4 Azul
  'from-purple-400 via-purple-600 to-purple-800'  // #5 Violeta
];
const textColor = ['text-yellow-400', 'text-gray-300', 'text-orange-400', 'text-blue-400', 'text-purple-400'];

export default function DashboardMaster() {
  const [topGrupos, setTopGrupos] = useState([]);
  const [energiaGlobal, setEnergiaGlobal] = useState(0);

  // Escuchamos Firebase en vivo
  useEffect(() => {
    // 1. Buscamos los 5 mejores grupos (solo los que sumaron algo)
    const qTop = query(
      collection(db, "grupos"),
      where("puntos", ">", 0),
      orderBy("puntos", "desc"),
      limit(5)
    );

    const unsubscribeTop = onSnapshot(qTop, (snapshot) => {
      const gruposMapeados = snapshot.docs.map((doc, index) => {
        const data = doc.data();
        return {
          id: doc.id,
          pin: data.pin,
          nombre: data.nombre || 'ESCUADRÓN',
          puntos: data.puntos,
          rank: index + 1,
          icon: rankIcons[index] || Star,
          bgClass: rankColors[index] || rankColors[4],
          textClass: textColor[index] || textColor[4]
        };
      });
      setTopGrupos(gruposMapeados);
    });

    // 2. Calculamos la Energía Global de TODOS los grupos
    const qTotal = query(collection(db, "grupos"));
    const unsubscribeTotal = onSnapshot(qTotal, (snapshot) => {
      let total = 0;
      snapshot.forEach(doc => {
        total += (doc.data().puntos || 0);
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
    <main className="min-h-screen bg-[#050505] text-white overflow-hidden font-sans">
      
      {/* BARRA SUPERIOR */}
      <header className="fixed inset-x-0 top-0 z-20 flex h-[80px] items-center justify-between border-b border-white/10 bg-[#050505]/90 px-10 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Crown className="size-6 text-yellow-400" />
          <span className="text-xl font-black tracking-[0.2em] text-white uppercase">CONGRESO BRILLANDO</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 rounded-full bg-blue-600/20 px-5 py-2 border border-blue-500/30">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">ENERGÍA GLOBAL:</span>
            <span className="text-lg font-black text-white">{energiaGlobal.toLocaleString()}</span>
            <Zap className="size-5 text-yellow-400 ml-2" />
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <section className="px-10 pb-16 pt-[120px] mx-auto max-w-[1400px]">
        
        <div className="mb-10 flex items-end justify-between relative z-10">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-blue-400">Sistema Kernel</p>
            <h1 className="text-5xl font-black tracking-tight text-white uppercase">TOP 5 EN VIVO</h1>
          </div>
          <div className="flex gap-3 items-center">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-xs font-bold tracking-widest text-red-500 uppercase mt-1">Transmisión Activa</span>
          </div>
        </div>

        {topGrupos.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-white/10 rounded-3xl">
            <ShieldCheck className="size-16 text-gray-600 mb-4" />
            <p className="text-xl font-bold uppercase tracking-widest text-gray-500">Esperando puntajes...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4">
            
            {/* EL #1: TARJETA GIGANTE DESTACADA */}
            {lider && (
              <article className="relative overflow-hidden rounded-3xl border border-yellow-400/50 bg-gradient-to-br from-[#1a1500] via-[#0a0a0a] to-[#050505] p-8 shadow-2xl shadow-yellow-900/20 lg:row-span-2 lg:min-h-[500px] xl:col-span-1 flex flex-col justify-between">
                <div className="absolute -right-20 -top-20 size-64 rounded-full bg-yellow-500/10 blur-3xl" />
                <div className="absolute -bottom-20 -left-20 size-64 rounded-full bg-blue-600/10 blur-3xl" />
                
                <div className="relative z-10 flex items-start justify-between">
                  <span className="rounded-full border border-yellow-400/50 bg-yellow-400/10 px-4 py-2 text-[10px] font-black tracking-[0.2em] text-yellow-400">
                    LÍDERES ACTUALES
                  </span>
                  <Trophy className="size-8 text-yellow-400" />
                </div>

                <div className="relative z-10 my-10 grid place-items-center">
                  <div className="grid size-40 place-items-center rounded-full bg-gradient-to-br from-yellow-300 via-yellow-500 to-orange-500 p-1 shadow-[0_0_60px_rgba(250,204,21,0.3)]">
                    <div className="grid size-full place-items-center rounded-full bg-[#0a0a0a]">
                      <Crown className="size-20 text-yellow-400" strokeWidth={1.5} />
                    </div>
                  </div>
                  <div className="-mt-4 z-20 rounded-full bg-white px-6 py-2 text-sm font-black tracking-widest text-black shadow-xl">
                    RANK #1
                  </div>
                </div>

                <div className="relative z-10 text-center">
                  <p className="mb-2 text-xs uppercase tracking-[0.3em] text-gray-400">{lider.nombre}</p>
                  <h2 className="text-4xl font-black tracking-tight text-white">#{lider.pin}</h2>
                  <div className="mt-4 flex flex-col items-center gap-1">
                    <span className="text-4xl font-black text-yellow-400">{lider.puntos.toLocaleString()}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Puntos de Energía</span>
                  </div>
                </div>
              </article>
            )}

            {/* EL RESTO DEL TOP (TARJETAS PEQUEÑAS) */}
            {restoTop.map((grupo) => {
              const Icon = grupo.icon;
              return (
                <article key={grupo.pin} className="group relative overflow-hidden flex flex-col justify-between rounded-3xl border border-white/5 bg-[#0a0a0a] p-6 shadow-xl transition-all">
                  {/* Destello de fondo según su posición */}
                  <div className={`absolute -right-10 -top-10 size-32 rounded-full bg-gradient-to-br ${grupo.bgClass} opacity-5 blur-2xl`} />

                  <div className="relative z-10 flex items-start justify-between">
                    <div className="grid size-16 place-items-center rounded-2xl bg-white/5 ring-1 ring-inset ring-white/10">
                      <Icon className={`size-8 ${grupo.textClass}`} strokeWidth={1.5} />
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black tracking-widest text-gray-300">
                      RANK #{grupo.rank}
                    </span>
                  </div>
                  
                  <div className="relative z-10 mt-8">
                    <h3 className="text-2xl font-black tracking-tight text-white">#{grupo.pin}</h3>
                    <p className="mt-1 text-xs uppercase tracking-widest text-gray-500">{grupo.nombre}</p>
                  </div>

                  <div className="relative z-10 mt-8">
                    <div className="mb-3 flex justify-between items-end">
                      <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Energía Acumulada</span>
                      <span className={`text-2xl font-black ${grupo.textClass}`}>{grupo.puntos.toLocaleString()}</span>
                    </div>
                    
                    {/* Barra de progreso visual comparada con el #1 */}
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                      <div 
                        className={`h-full rounded-full bg-gradient-to-r ${grupo.bgClass}`} 
                        style={{ width: `${(grupo.puntos / (lider?.puntos || 1)) * 100}%` }} 
                      />
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