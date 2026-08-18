import React from 'react';
import './Landing.css';

export default function Landing() {
  return (
    <div className="landing-container">
      {/* Capa de ruido visual para matar lo "digital" */}
      <div className="noise-overlay"></div>

      {/* SECCIÓN 1: EL IMPACTO (HERO) */}
      <section className="hero-section">
        <div className="hero-content">
          <p className="hero-tagline">PRE-CONGRESO I.C.E.B. 2026</p>
          <h1 className="hero-title">
            AUTÉN<br/>TICOS
          </h1>
          <div className="paper-scrap">
            <h2 className="cursive-highlight">Salí del molde.</h2>
          </div>
        </div>
        <a href="#registro" className="brutalist-button">ASEGURÁ TU LUGAR</a>
      </section>

      {/* SECCIÓN 2: EL MANIFIESTO */}
      <section className="manifesto-section">
        <div className="manifesto-paper">
          <div className="tape-top-left"></div>
          <div className="tape-bottom-right"></div>
          
          <p className="manifesto-text">
            En un mundo que te exige usar filtros, apariencias y <span className="text-black-heavy">máscaras para</span>
          </p>
          <h3 className="manifesto-cursive">encajar</h3>
          <p className="manifesto-subtext">
            Auténtico no es seguir la tendencia. Es abrazar tu verdadera identidad. La identidad real no se copia.
          </p>
        </div>
      </section>

      {/* SECCIÓN 3: Placeholder Formulario */}
      <section id="registro" className="registration-section">
        <h2 className="section-title">CHECK-IN</h2>
        {/* Acá irá el formulario conectado a Firebase */}
      </section>
    </div>
  );
}