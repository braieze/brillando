import React from 'react';
import {
  Zap,
  Camera,
  Trophy,
  ShieldCheck,
  Flame,
  Target,
  LogOut
} from 'lucide-react';

// Estos son los "Badges" adaptados como los juegos de la Kermesse
const desafios = [
  { id: 1, titulo: 'Tiro al Blanco', estado: 'Completado', puntos: 50, icon: Target, tone: 'yellow' },
  { id: 2, titulo: 'Fuga Lógica', estado: 'Pendiente', puntos: 0, icon: Flame, tone: 'blue' },
  { id: 3, titulo: 'Campo Minado', estado: 'Pendiente', puntos: 0, icon: ShieldCheck, tone: 'blue' },
  { id: 4, titulo: 'Rompecabezas', estado: 'Completado', puntos: 50, icon: Trophy, tone: 'yellow' },
];

// Mapeo de colores brutalistas
const toneClasses = {
  yellow: 'from-yellow-300 via-yellow-500 to-orange-600',
  blue: 'from-blue-400 via-blue-600 to-blue-900',
};

function DesafioCard({ desafio }) {
  const Icon = desafio.icon;
  const isDone = desafio.estado === 'Completado';

  return (
    <article className={`flex items-center justify-between rounded-2xl border ${isDone ? 'border-yellow-400/30 bg-yellow-400/5' : 'border-white/[0.05] bg-[#0a0a0a]'} p-4 shadow-lg`}>
      <div className="flex items-center gap-4">
        <div className={`relative flex size-12 items-center justify-center`}>
          <div className={`absolute inset-0 rotate-45 rounded-xl bg-gradient-to-br ${toneClasses[desafio.tone]} opacity-20`} />
          <Icon className={`relative z-10 size-6 ${isDone ? 'text-yellow-400' : 'text-blue-500'}`} />
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-wide text-white">{desafio.titulo}</h3>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${isDone ? 'text-yellow-400' : 'text-gray-500'}`}>
            {desafio.estado}
          </p>
        </div>
      </div>
      <div className="text-right">
        <span className={`text-sm font-black ${isDone ? 'text-yellow-400' : 'text-gray-600'}`}>
          +{desafio.puntos}
        </span>
      </div>
    </article>
  );
}

export default function DashboardJugador({ onEscanear, onSalir }) {
  // Datos simulados (luego vendrán de tu estado de Firebase)
  const grupoActual = {
    pin: '7779',
    puntosTotales: 100,
    vidas: 3,
    ranking: 4
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white pb-24">
      
      {/* TOP BAR */}
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/5 bg-[#050505]/90 px-5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Zap className="size-5 text-yellow-400" />
          <span className="text-sm font-black tracking-widest text-white uppercase">Brillando</span>
        </div>
        <button onClick={onSalir} className="text-gray-500 hover:text-white transition-colors">
          <LogOut className="size-5" />
        </button>
      </header>

      <div className="px-5 py-6">
        
        {/* TARJETA PRINCIPAL DEL EQUIPO (Adaptada del "aside" flotante de v0) */}
        <div className="relative mb-8 overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-b from-[#0a0f1c] to-[#050505] p-6 shadow-2xl shadow-blue-900/20">
          <div className="absolute -right-10 -top-10 size-32 rounded-full bg-blue-500/10 blur-2xl" />
          
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400">Escuadrón</p>
              <h2 className="text-3xl font-black uppercase tracking-tight text-white">#{grupoActual.pin}</h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Ranking</p>
              <p className="text-xl font-black text-white">TOP {grupoActual.ranking}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl bg-black/50 py-6 ring-1 ring-white/5 relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Energía Total</p>
            <div className="flex items-center gap-2">
              <span className="text-5xl font-black text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                {grupoActual.puntosTotales}
              </span>
              <Zap className="size-8 text-yellow-400" />
            </div>
            
            <div className="mt-4 flex gap-2">
              {[1, 2, 3].map((vida) => (
                <div key={vida} className={`size-3 rounded-full ${vida <= grupoActual.vidas ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-gray-800'}`} />
              ))}
            </div>
            <p className="mt-2 text-[10px] uppercase tracking-widest text-gray-500">Vidas Restantes</p>
          </div>
        </div>

        {/* LISTA DE DESAFÍOS (Adaptado de los Badges) */}
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-300">Registro de Misiones</h2>
          <span className="text-[10px] font-bold uppercase text-yellow-400">2 Completadas</span>
        </div>
        
        <div className="flex flex-col gap-3">
          {desafios.map((desafio) => (
            <DesafioCard key={desafio.id} desafio={desafio} />
          ))}
        </div>

      </div>

      {/* BOTÓN FLOTANTE DE ESCÁNER (Acción Principal Anclada) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-[#050505] via-[#050505]/90 to-transparent p-5 pb-8">
        <button 
          onClick={onEscanear}
          className="flex w-full items-center justify-center gap-3 rounded-full bg-yellow-400 py-4 text-sm font-black uppercase tracking-widest text-black shadow-[0_0_30px_rgba(250,204,21,0.3)] transition-transform active:scale-95"
        >
          <Camera className="size-5" />
          Escanear Desafío QR
        </button>
      </div>

    </main>
  );
}