import React from 'react';
import './Landing.css';

export default function Landing() {
  return (
    <div className="landing-container">
      <div className="noise-overlay"></div>

      {/* SECCIÓN 1: HERO (Puro Texto y Contraste) */}
      <section className="hero-section">
        <div className="hero-content">
          <p className="hero-tagline">PRE-CONGRESO I.C.E.B. 2026</p>
          <h1 className="hero-title">
            AUTÉN<br/>TICOS
          </h1>
          {/* El texto cursivo ahora flota libre, cruzando el título, sin la cajita */}
          <h2 className="cursive-highlight">Salí del molde.</h2>
        </div>
        <a href="#registro" className="brutalist-button">ASEGURÁ TU LUGAR</a>
      </section>

      {/* SECCIÓN 2: EL MANIFIESTO (Bloque de color completo, sin bordes falsos) */}
      <section className="manifesto-section">
        <div className="manifesto-content">
          <p className="manifesto-text">
            En un mundo que te exige usar filtros, apariencias y <span className="text-black-heavy">máscaras para</span>
          </p>
          <h3 className="manifesto-cursive">encajar</h3>
          <p className="manifesto-subtext">
            Auténtico no es seguir la tendencia. Es abrazar tu verdadera identidad.<br/>
            La identidad real no se copia.
          </p>
        </div>
      </section>

      {/* SECCIÓN 3: CHECK-IN */}
      <section id="registro" className="registration-section">
        <h2 className="section-title">CHECK-IN</h2>
      </section>
    </div>
  );
}