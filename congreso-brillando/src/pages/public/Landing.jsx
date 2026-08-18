import React, { useEffect, useRef, useState } from "react";
import "./Landing.css";

/**
 * LANDING — "AUTÉNTICOS" / Pre-Congreso I.C.E.B. 2026
 * Brutalista / cartel de calle / fanzine impreso.
 * Puro React + CSS. Sin librerías externas.
 */

export default function Landing() {
  const [ticked, setTicked] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    // pequeño "jitter" de entrada para el sello, nada más — el resto es estático a propósito
    const t = setTimeout(() => setTicked(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="landing" ref={heroRef}>
      {/* ============ SECCIÓN 1 — EL IMPACTO ============ */}
      <section className="hero">
        <div className="grain" aria-hidden="true" />
        <div className="hero__spiral" aria-hidden="true">
          BRILLANDO 26 — AUTÉNTICOS · BRILLANDO 26 — AUTÉNTICOS ·
        </div>

        <div className="hero__top">
          <span className="hero__eyebrow">PRE&#8209;CONGRESO&nbsp;I.C.E.B.&nbsp;2026</span>
          <span className={`hero__stamp ${ticked ? "is-in" : ""}`}>
            RED JUVENIL
          </span>
        </div>

        <h1 className="hero__title">
          <span className="hero__title-line">
            AUTÉN
            <span className="hero__cursive-inline" aria-hidden="true">
              lí del molde
            </span>
          </span>
          <span className="hero__title-line hero__title-line--pushed">
            TICOS
          </span>
        </h1>

        <p className="hero__slash">La identidad real no se copia.</p>

        <div className="hero__cta-row">
          <button type="button" className="btn-brutal">
            <span>ASEGURÁ TU LUGAR</span>
          </button>
          <div className="hero__meta">
            <span>12&nbsp;SEP</span>
            <span>19:00&nbsp;HS</span>
          </div>
        </div>
      </section>

      {/* ============ SECCIÓN 2 — EL MANIFIESTO ============ */}
      <section className="manifest">
        <div className="manifest__paper">
          <div className="tape tape--tl" aria-hidden="true" />
          <div className="tape tape--br" aria-hidden="true" />
          <div className="manifest__spiral" aria-hidden="true">
            <span>●</span><span>●</span><span>●</span><span>●</span><span>●</span>
            <span>●</span><span>●</span><span>●</span><span>●</span><span>●</span>
          </div>

          <p className="manifest__lead">
            En un mundo que te exige usar filtros, apariencias y máscaras
            para
          </p>

          <p className="manifest__word">encajar</p>

          <p className="manifest__body">
            Auténtico no es seguir la <em>tendencia</em>. Es abrazar tu{" "}
            <strong>verdadera identidad</strong>. La identidad real{" "}
            <span className="manifest__strike">se copia</span>{" "}
            <span className="manifest__cursive">no se copia.</span>
          </p>
        </div>
      </section>

      {/* ============ SECCIÓN 3 — CHECK-IN ============ */}
      <section className="checkin">
        <div className="grain" aria-hidden="true" />
        <p className="checkin__eyebrow">RED JUVENIL — I.C.E.B.</p>
        <h2 className="checkin__title">
          CHECK
          <span className="checkin__dash">-IN</span>
        </h2>

        <ul className="checkin__facts">
          <li>
            <span className="checkin__fact-label">Cuándo</span>
            <span className="checkin__fact-value">Sábado 12 de Septiembre</span>
          </li>
          <li>
            <span className="checkin__fact-label">Hora</span>
            <span className="checkin__fact-value">19:00&nbsp;Hs</span>
          </li>
          <li>
            <span className="checkin__fact-label">Dónde</span>
            <span className="checkin__fact-value">
              Auditorio Ministerio CDS — Calle 23 N.º 4642
            </span>
          </li>
        </ul>

        {/*
          Contenedor placeholder para el formulario real de React
          que se conectará a la base de datos. No tocar el data-attr,
          se usa como hook de montaje.
        */}
        <div className="checkin__form-slot" data-checkin-form-mount>
          <span className="checkin__form-slot-label">
            [ FORMULARIO DE INSCRIPCIÓN — PRÓXIMAMENTE ]
          </span>
        </div>

        <p className="checkin__footer-tape">@congresobrillando · Brillando 2026</p>
      </section>
    </main>
  );
}