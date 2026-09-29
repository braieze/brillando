import React, { useState } from 'react';
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from '../../config/firebase';
import DashboardJugador from './DashboardJugador'; // <-- Importamos el dashboard
import './Juego.css';

export default function Juego() {
  const [view, setView] = useState('inicio'); // 'inicio' | 'crear' | 'unir' | 'dashboard' | 'escaner'
  const [pinInput, setPinInput] = useState('');
  const [pinGenerado, setPinGenerado] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. Lógica para crear un nuevo grupo
  const handleCrearGrupo = async () => {
    setLoading(true);
    const nuevoPin = Math.floor(1000 + Math.random() * 9000).toString();
    
    try {
      await addDoc(collection(db, "grupos"), {
        pin: nuevoPin,
        puntos: 0,
        creadoEn: new Date(),
        integrantes: 1
      });
      
      setPinGenerado(nuevoPin);
      localStorage.setItem('miGrupoPIN', nuevoPin);
    } catch (error) {
      console.error("Error en la matriz:", error);
      alert("Error de conexión. Intentá de nuevo.");
    }
    setLoading(false);
  };

  // 2. Lógica para buscar el PIN y unirse
  const handleUnirse = async (e) => {
    if (e) e.preventDefault();
    if (pinInput.length !== 4) return;
    
    setLoading(true);
    try {
      const q = query(collection(db, "grupos"), where("pin", "==", pinInput));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert("ACCESO DENEGADO. El PIN no existe.");
      } else {
        querySnapshot.forEach((doc) => {
          const datosGrupo = doc.data();
          // alert(`¡SINCRONIZADO! Te uniste al grupo. Ya tienen ${datosGrupo.puntos} puntos.`);
          localStorage.setItem('miGrupoPIN', pinInput);
          setView('dashboard'); // <-- Transición automática al unirse
        });
      }
    } catch (error) {
      console.error("Fallo de red:", error);
      alert("Error de conexión al buscar el grupo.");
    }
    setLoading(false);
  };

  // ================= VISTAS PREMIUM (TAILWIND) =================
  
  if (view === 'dashboard') {
    return (
      <DashboardJugador 
        onEscanear={() => setView('escaner')} 
        onSalir={() => { 
          localStorage.removeItem('miGrupoPIN'); 
          setPinGenerado('');
          setPinInput('');
          setView('inicio'); 
        }} 
      />
    );
  }

  if (view === 'escaner') {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-5">
        <h2 className="text-2xl font-black mb-4 text-yellow-400 tracking-widest uppercase">Cámara de Escaneo</h2>
        <p className="mb-8 text-gray-500 text-center text-sm">El lector QR se integrará en el próximo paso.</p>
        <button 
          onClick={() => setView('dashboard')}
          className="rounded-full border border-white/20 bg-white/5 px-8 py-3 text-sm font-bold uppercase tracking-widest transition-colors hover:bg-white/10"
        >
          Volver al Escuadrón
        </button>
      </div>
    );
  }

  // ================= VISTA ONBOARDING (CSS CLÁSICO) =================
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
              Creá tu grupo, sumá a tu gente y preparate para romper el sistema.
            </p>
          </>
        )}

        {view === 'crear' && (
          <>
            <h1 className="onb-title small">Iniciar Secuencia</h1>
            <p className="onb-desc">
              Vamos a generar un PIN único para que tu círculo cercano se sume al equipo.
            </p>
            {pinGenerado && (
              <div className="onb-pin-preview" aria-live="polite">
                {pinGenerado}
              </div>
            )}
          </>
        )}

        {view === 'unir' && (
          <form onSubmit={handleUnirse}>
            <h1 className="onb-title small">Ingresá tu PIN</h1>
            <p className="onb-desc">
              Pedile el código de 4 dígitos al líder de tu equipo.
            </p>
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
              autoFocus
            />
          </form>
        )}
      </div>

      <div className="onb-actions">
        {view === 'inicio' && (
          <>
            <button className="onb-btn primary" onClick={() => setView('crear')}>
              Crear nuevo grupo
            </button>
            <button className="onb-btn secondary" onClick={() => setView('unir')}>
              Ya tengo un PIN
            </button>
          </>
        )}

        {view === 'crear' && (
          <>
            {!pinGenerado ? (
              <button 
                className="onb-btn primary" 
                onClick={handleCrearGrupo}
                disabled={loading}
              >
                {loading ? 'Generando...' : 'Generar PIN'}
              </button>
            ) : (
              <button 
                className="onb-btn primary" 
                onClick={() => setView('dashboard')} // <-- Redirección al Dashboard
              >
                Entrar a la Sala
              </button>
            )}
            <button className="onb-btn text-only" onClick={() => { setView('inicio'); setPinGenerado(''); }}>
              Volver
            </button>
          </>
        )}

        {view === 'unir' && (
          <>
            <button 
              className="onb-btn primary" 
              onClick={handleUnirse}
              disabled={loading || pinInput.length !== 4}
            >
              {loading ? 'Sincronizando...' : 'Sincronizar'}
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