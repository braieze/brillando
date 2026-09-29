import React, { useState } from 'react';
import {
  Crown,
  Trophy,
  Zap,
  ShieldCheck,
  Star,
  Flame,
  ChevronRight,
  Medal,
  Users
} from 'lucide-react';

// Simulamos los 5 mejores grupos (luego esto vendrá de Firebase)
const topGrupos = [
  { pin: '7779', puntos: 15400, rank: 2, icon: Zap, tone: 'blue', nombre: 'LOS ROMPE MOLDES' },
  { pin: '1102', puntos: 14200, rank: 3, icon: Flame, tone: 'orange', nombre: 'SIN FILTRO' },
  { pin: '9081', puntos: 12100, rank: 4, icon: ShieldCheck, tone: 'teal', nombre: 'ESCUADRÓN X' },
  { pin: '4433', puntos: 10500, rank: 5, icon: Star, tone: 'pink', nombre: 'KINETICS' },
];

export default function DashboardMaster() {
  return (
    <main className="min-h-screen bg-[#050505] text-white overflow-hidden">
      
      {/* BARRA SUPERIOR (Adaptada de v0) */}
      <header className="fixed inset-x-0 top-0 z-10 flex h-[80px] items-center justify-between border-b border-white/10 bg-[#050505]/90 px-10 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Crown className="size-6 text-yellow-400" />
          <span className="text-xl font-black tracking-[0.2em] text-white">CONGRESO BRILLANDO</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 rounded-full bg-blue-600/20 px-5 py-2 border border-blue-500/30">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">ENERGÍA GLOBAL:</span>
            <span className="text-lg font-black text-white">1,450,000</span>
            <Zap className="size-5 text-yellow-400 ml-2" />
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <section className="px-10 pb-16 pt-[120px] mx-auto max-w-[1400px]">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-blue-400">Sistema Kernel</p>
            <h1 className="text-5xl font-black tracking-tight text-white uppercase">TOP 5 EN VIVO</h1>
          </div>
          <div className="flex gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <span className="text-xs font-bold tracking-widest text-red-500 uppercase">Transmisión Activa</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4">
          
          {/* EL #1: TARJETA GIGANTE DESTACADA */}
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
              <p className="mb-2 text-xs uppercase tracking-[0.3em] text-gray-400">ESCUADRÓN ESTRELLA</p>
              <h2 className="text-4xl font-black tracking-tight text-white">#5521</h2>
              <div className="mt-4 flex flex-col items-center gap-1">
                <span className="text-3xl font-black text-yellow-400">24,500</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Puntos de Energía</span>
              </div>
            </div>
          </article>

          {/* EL RESTO DEL TOP (TARJETAS PEQUEÑAS) */}
          {topGrupos.map((grupo) => (
            <article key={grupo.pin} className="group flex flex-col justify-between rounded-3xl border border-white/5 bg-[#0a0a0a] p-6 shadow-xl transition-all hover:-translate-y-2 hover:border-blue-500/30 hover:shadow-blue-900/20">
              
              <div className="flex items-start justify-between">
                <div className="grid size-16 place-items-center rounded-2xl bg-white/5 ring-1 ring-inset ring-white/10 group-hover:bg-blue-600/10 group-hover:ring-blue-500/30 transition-all">
                  <grupo.icon className="size-8 text-gray-400 group-hover:text-blue-400 transition-colors" strokeWidth={1.5} />
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black tracking-widest text-gray-300">
                  RANK #{grupo.rank}
                </span>
              </div>
              
              <div className="mt-8">
                <h3 className="text-2xl font-black tracking-tight text-white">#{grupo.pin}</h3>
                <p className="mt-1 text-xs uppercase tracking-widest text-gray-500">{grupo.nombre}</p>
              </div>

              <div className="mt-8">
                <div className="mb-3 flex justify-between items-end">
                  <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">Energía Acumulada</span>
                  <span className="text-xl font-black text-white">{grupo.puntos}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400" 
                    style={{ width: `${(grupo.puntos / 24500) * 100}%` }} 
                  />
                </div>
              </div>

            </article>
          ))}
          
        </div>
      </section>
    </main>
  );
}