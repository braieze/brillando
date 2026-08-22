import React, { useState, useEffect } from 'react';
import './Landing.css';
import QRCode from 'react-qr-code';
import { db } from '../../config/firebase'; 
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore'; 
import { isBefore, parseISO } from 'date-fns'; 

export default function Landing() {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    edad: '',
    iglesia: ''
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState(''); 
  const [errorMsg, setErrorMsg] = useState('');
  const [isDuplicate, setIsDuplicate] = useState(false); // Estado para detectar correos repetidos
  
  // LÓGICA DE BLOQUEO POR FECHA
  const [isPreCongresoActive, setIsPreCongresoActive] = useState(true);
  
  useEffect(() => {
    // A las 23:59 del 12 de Septiembre se bloquea
    const fechaLimite = parseISO('2026-09-12T23:59:59-03:00'); 
    const hoy = new Date();
    setIsPreCongresoActive(isBefore(hoy, fechaLimite));
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Si empieza a escribir de nuevo, limpiamos los errores
    setIsDuplicate(false);
    setErrorMsg('');
  };

  const handleResetForm = () => {
    setFormData({ nombre: '', apellido: '', email: '', edad: '', iglesia: '' });
    setIsSubmitted(false);
    setUserId('');
    setIsDuplicate(false);
    setErrorMsg('');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '¡Ya tengo mi pase para Brillando 2026!',
          text: `Salí del molde. Ya aseguré mi lugar para el Pre-Congreso de la Red Juvenil I.C.E.B. ¡Sumate vos también!`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error compartiendo', error);
      }
    } else {
      alert("Tu navegador no soporta esta función, pero podés sacarle captura a tu QR.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setIsDuplicate(false);

    try {
      const inscriptosRef = collection(db, "inscriptos");
      
      // 1. VALIDACIÓN: ¿Ya existe este correo?
      const q = query(inscriptosRef, where("email", "==", formData.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setIsDuplicate(true);
        setIsLoading(false);
        return; // Frenamos la ejecución acá si ya existe
      }

      // 2. Si es nuevo, armamos el documento
      const nuevoInscripto = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        edad: Number(formData.edad),
        iglesia: formData.iglesia,
        fechaInscripcion: serverTimestamp(),
        asistio_pre: false,
        asistio_congreso: false,
        evento_origen: 'pre_congreso'
      };

      // 3. Guardamos en Firebase
      const docRef = await addDoc(inscriptosRef, nuevoInscripto);
      
      setUserId(docRef.id);
      setIsSubmitted(true);

    } catch (error) {
      console.error("Error al guardar la inscripción: ", error);
      setErrorMsg("Hubo un error de conexión. Por favor, intentá de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <header className="site">
        <div className="wrap nav-row">
          <div className="brand">RED JUVENIL <span className="tag">I.C.E.B</span></div>
          <nav className="links" aria-label="Navegación principal">
            <a href="#concepto">Concepto</a>
            <a href="#romper">Rompé el molde</a>
            <a href="#fechas">Fechas</a>
            <a href="#ubicacion">Ubicación</a>
            <a href="#pase">Tu pase</a>
          </nav>
          <div className="nav-cta">
            <a href="#inscripcion" className="btn azul">Inscribite →</a>
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="kicker-row">
              <span>Red Juvenil · I.C.E.B</span>
              <span>2026</span>
            </div>
            <span className="handle">@congresobrillando</span>
            <span className="sub-handle">Brillando 2026 — Auténticos</span>

            <h1 className="mega" style={{ marginTop: '22px' }}>
              Salí del<br/>
              <span className="strike-wrap">
                <span className="molde">molde.</span>
                <svg className="strike" viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M4,30 C80,10 220,52 296,26" stroke="#f2ede0" strokeWidth="5" fill="none" strokeLinecap="round"/>
                </svg>
              </span>
            </h1>

            <p className="hero-copy">
              Vivimos rodeados de filtros, máscaras y casilleros que nos dicen cómo encajar.
              <b>Brillando 2026</b> es el espacio para apagar ese ruido y confrontarte con quién sos de verdad.
              La identidad real no se copia.
            </p>

            <div className="hero-tags">
              <span className="tag-chip">Cero filtros</span>
              <span className="tag-chip">100% real</span>
              <span className="tag-chip">Pre-Congreso · 12 sep</span>
              <span className="tag-chip">Congreso · 31 oct</span>
            </div>

            <div className="hero-actions">
              <a href="#inscripcion" className="btn">Quiero mi pase →</a>
              <a href="#concepto" className="btn ghost">Ver el concepto</a>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="mag">
              <svg viewBox="0 0 420 520" xmlns="http://www.w3.org/2000/svg">
                <polygon points="10,60 165,20 165,470 30,500" fill="url(#gradPage)"/>
                <polygon points="10,60 165,20 165,470 30,500" fill="none" stroke="#0a0a0c" strokeWidth="4"/>
                <rect x="165" y="10" width="245" height="490" fill="#f2ede0" stroke="#0a0a0c" strokeWidth="4"/>
                <text x="192" y="70" fontFamily="Space Mono, monospace" fontSize="14" letterSpacing="1" fill="#0a0a0c">CERO</text>
                <text x="272" y="70" fontFamily="Space Mono, monospace" fontSize="14" letterSpacing="1" fill="#0a0a0c">FILTROS</text>
                <text x="358" y="70" fontFamily="Space Mono, monospace" fontSize="12" letterSpacing="1" fill="#0a0a0c">100%</text>
                <text x="185" y="150" fontFamily="Archivo Black" fontSize="46" fill="#2438e0">Salí</text>
                <text x="185" y="205" fontFamily="Archivo Black" fontSize="46" fill="#2438e0">del</text>
                <text x="182" y="272" fontFamily="Caveat" fontWeight="700" fontSize="64" fill="#2438e0">molde.</text>
                <line x1="185" y1="300" x2="395" y2="300" stroke="#0a0a0c" strokeWidth="1.5" strokeDasharray="4 5"/>
                <text x="185" y="330" fontFamily="Space Grotesk" fontSize="15" fill="#0a0a0c">La identidad real</text>
                <text x="185" y="352" fontFamily="Space Grotesk" fontSize="15" fontWeight="700" fill="#0a0a0c">no se copia.</text>
                <defs>
                  <linearGradient id="gradPage" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#0d1660"/>
                    <stop offset="1" stopColor="#8fa8ff"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CONCEPTO / MANIFIESTO ============ */}
      <section className="section manifiesto" id="concepto">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">El concepto 2026</span>
            <h2>No sos lo que <em>mostrás.</em><br/>Sos lo que sos.</h2>
            <p>Auténticos no es una tendencia más para publicar. Es la confrontación con la identidad real, lejos de la pantalla y de la aprobación ajena.</p>
          </div>

          <div className="tv-row">
            <div className="tv">
              <div className="knob k1"></div>
              <div className="knob k2"></div>
              <div className="tv-screen">
                <h3>Auténtico no es<br/>seguir la <span className="y">tendencia</span>.</h3>
              </div>
              <div className="tv-stand"></div>
              <div className="tv-legs"><span></span><span></span></div>
            </div>

            <div className="manifiesto-copy">
              <p>Crecimos frente a pantallas que nos enseñaron a editar cada versión de nosotros mismos antes de mostrarla. Un mundo de consumo pasivo, donde es más fácil repetir un molde que animarse a romperlo.</p>
              <p>Brillando 2026 plantea lo contrario: apagar el televisor, bajar el volumen del afuera, y escuchar lo que de verdad somos por dentro.</p>
              <p className="quote">"Es abrazar tu verdadera identidad."</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ ROMPER EL MOLDE ============ */}
      <section className="section romper" id="romper">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Lo que hay que romper</span>
            <h2>Tres moldes<br/>para <em>dejar atrás.</em></h2>
            <p>Tres símbolos del sistema que nos empuja a encajar — y la razón por la que Brillando existe para romperlos.</p>
          </div>

          <div className="locker-cards">
            <div className="lcard">
              <span className="latch" aria-hidden="true"></span>
              <span className="num">01 / TV</span>
              <div className="icon" aria-hidden="true">
                <svg width="46" height="38" viewBox="0 0 46 38" fill="none">
                  <rect x="1" y="1" width="44" height="30" rx="4" stroke="#f2ede0" strokeWidth="2.5"/>
                  <rect x="7" y="7" width="32" height="18" fill="#f2ede0" opacity=".25"/>
                  <line x1="16" y1="34" x2="30" y2="34" stroke="#f2ede0" strokeWidth="2.5"/>
                  <line x1="23" y1="31" x2="23" y2="34" stroke="#f2ede0" strokeWidth="2.5"/>
                </svg>
              </div>
              <h3>El televisor estático</h3>
              <p>Consumo pasivo. Repetir lo que ves sin preguntarte si de verdad te representa.</p>
            </div>

            <div className="lcard">
              <span className="latch" aria-hidden="true"></span>
              <span className="num">02 / PAPEL</span>
              <div className="icon" aria-hidden="true">
                <svg width="44" height="40" viewBox="0 0 44 40" fill="none">
                  <rect x="2" y="4" width="40" height="30" stroke="#f2ede0" strokeWidth="2.5"/>
                  <line x1="8" y1="12" x2="36" y2="12" stroke="#f2ede0" strokeWidth="2"/>
                  <line x1="8" y1="18" x2="26" y2="18" stroke="#f2ede0" strokeWidth="2"/>
                  <line x1="8" y1="24" x2="32" y2="24" stroke="#f2ede0" strokeWidth="2"/>
                  <line x1="8" y1="30" x2="20" y2="30" stroke="#f2ede0" strokeWidth="2"/>
                </svg>
              </div>
              <h3>El diario que tapa la cara</h3>
              <p>La máscara social. Titulares y apariencias que ocultan lo que en verdad sentís.</p>
            </div>

            <div className="lcard">
              <span className="latch" aria-hidden="true"></span>
              <span className="num">03 / CASILLERO</span>
              <div className="icon" aria-hidden="true">
                <svg width="34" height="42" viewBox="0 0 34 42" fill="none">
                  <rect x="1" y="1" width="32" height="40" stroke="#f2ede0" strokeWidth="2.5"/>
                  <line x1="1" y1="21" x2="33" y2="21" stroke="#f2ede0" strokeWidth="2"/>
                  <circle cx="25" cy="12" r="2" fill="#f2ede0"/>
                  <circle cx="25" cy="31" r="2" fill="#f2ede0"/>
                </svg>
              </div>
              <h3>El casillero que encasilla</h3>
              <p>El sistema que te asigna un lugar. Un número más, sin espacio para ser distinto.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FECHAS ============ */}
      <section className="section fechas" id="fechas">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Agendalo</span>
            <h2>Dos citas.<br/>Un solo <em>llamado.</em></h2>
            <p>Brillando 2026 se vive en dos instancias: el Pre-Congreso, que enciende la previa, y el Congreso principal, el gran encuentro de la Red Juvenil.</p>
          </div>

          <div className="dates-grid">
            <article className="flyer">
              <span className="tape-corner" aria-hidden="true"></span>
              <div className="top-row"><span>Red Juvenil</span><span>I.C.E.B</span></div>
              <span className="pill">Pre-Congreso</span>
              <h3>Auten<span className="accent">ticos</span></h3>
              <div className="big-date">
                <span className="num">12</span>
                <span className="stamp">DE SEPTIEMBRE<br/>A LAS 19HS</span>
              </div>
              <div className="loc">
                <b>Lugar</b>
                Auditorio Ministerio CDS<br/>
                <span className="addr">Calle 23 N° 4642, Berazategui</span>
              </div>
            </article>

            <article className="flyer">
              <span className="tape-corner" aria-hidden="true"></span>
              <div className="top-row"><span>Red Juvenil</span><span>I.C.E.B</span></div>
              <span className="pill">Congreso principal</span>
              <h3>Brillando<span className="accent">.</span></h3>
              <div className="big-date">
                <span className="num">31</span>
                <span className="stamp">DE OCTUBRE<br/>2026</span>
              </div>
              <div className="loc">
                <b>Lugar</b>
                Centro Municipal de Actividades Roberto De Vicenzo<br/>
                <span className="addr">Calle 148 y 18, Berazategui</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ============ UBICACION ============ */}
      <section className="section ubicacion" id="ubicacion">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Cómo llegar</span>
            <h2>Te esperamos<br/>en <em>Berazategui.</em></h2>
            <p>Guardá las direcciones y llegá con tiempo.</p>
          </div>

          <div className="map-panel" style={{ marginBottom: '40px' }}>
            <div className="map-visual">
              <div className="pin">
                <svg viewBox="0 0 52 64" fill="none">
                  <path d="M26 2C13 2 3 12 3 25c0 18 23 37 23 37s23-19 23-37C49 12 39 2 26 2z" fill="#ffd400" stroke="#0a0a0c" strokeWidth="3"/>
                  <circle cx="26" cy="25" r="9" fill="#0a0a0c"/>
                </svg>
                <span>Pre-Congreso</span>
              </div>
            </div>
            <div className="map-info">
              <div className="row">
                <span className="lbl">Lugar</span>
                <span className="val"><b>Auditorio Ministerio CDS</b><br/>Calle 23 N° 4642, Berazategui</span>
              </div>
              <div className="row">
                <span className="lbl">Fecha</span>
                <span className="val">Sábado <b>12 de septiembre</b> de 2026</span>
              </div>
              <div className="row">
                <span className="lbl">Hora</span>
                <span className="val">Puertas <b>19:00 hs</b></span>
              </div>
              <a href="https://www.google.com/maps/search/?api=1&query=Calle+23+N%C2%B0+4642+Berazategui" target="_blank" rel="noreferrer" className="btn azul" style={{ alignSelf: 'flex-start', marginTop: '10px' }}>
                Abrir en Google Maps →
              </a>
            </div>
          </div>

           <div className="map-panel">
            <div className="map-visual" style={{ background: 'linear-gradient(rgba(13, 22, 96, 0.9), rgba(13, 22, 96, 0.9)), repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 1px, transparent 1px 26px), repeating-linear-gradient(90deg, rgba(255,255,255,.05) 0 1px, transparent 1px 26px)'}}>
              <div className="pin">
                <svg viewBox="0 0 52 64" fill="none">
                  <path d="M26 2C13 2 3 12 3 25c0 18 23 37 23 37s23-19 23-37C49 12 39 2 26 2z" fill="#f2ede0" stroke="#0a0a0c" strokeWidth="3"/>
                  <circle cx="26" cy="25" r="9" fill="#0a0a0c"/>
                </svg>
                <span>Congreso Principal</span>
              </div>
            </div>
            <div className="map-info">
              <div className="row">
                <span className="lbl">Lugar</span>
                <span className="val"><b>Centro Roberto De Vicenzo</b><br/>Calle 148 y 18, Berazategui</span>
              </div>
              <div className="row">
                <span className="lbl">Fecha</span>
                <span className="val">Sábado <b>31 de octubre</b> de 2026</span>
              </div>
              <a href="https://maps.app.goo.gl/g6J6bH3q5HhR7W9n7" target="_blank" rel="noreferrer" className="btn" style={{ alignSelf: 'flex-start', marginTop: '10px' }}>
                Abrir en Google Maps →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PASE DIGITAL ============ */}
      <section className="section pase" id="pase">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">Tu entrada</span>
            <h2>Un pase.<br/>Un <em>QR.</em> Vos.</h2>
            <p>Todo el sistema de acceso es digital: te inscribís, te llega tu pase por mail y lo mostrás en la puerta. Nada de filas eternas ni papeles perdidos.</p>
          </div>

          <div className="steps">
            <div className="step">
              <span className="idx">01</span>
              <div className="icon" aria-hidden="true">
                <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                  <rect x="1" y="1" width="32" height="32" rx="3" stroke="#2438e0" strokeWidth="2.5"/>
                  <path d="M8 17h18M17 8v18" stroke="#2438e0" strokeWidth="2.5"/>
                </svg>
              </div>
              <h4>Completá el formulario</h4>
              <p>Nombre, contacto e iglesia. Un minuto y listo — sin vueltas.</p>
            </div>

            <div className="step">
              <span className="idx">02</span>
              <div className="icon" aria-hidden="true">
                <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                  <rect x="2" y="6" width="30" height="22" rx="2" stroke="#ffd400" strokeWidth="2.5"/>
                  <path d="M2 8l15 11L32 8" stroke="#ffd400" strokeWidth="2.5"/>
                </svg>
              </div>
              <h4>Recibí tu pase por mail</h4>
              <p>Te llega automáticamente un código QR único: es tu entrada personal a Brillando.</p>
            </div>

            <div className="step">
              <span className="idx">03</span>
              <div className="icon" aria-hidden="true">
                <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                  <rect x="1" y="1" width="10" height="10" stroke="#2438e0" strokeWidth="2.5"/>
                  <rect x="23" y="1" width="10" height="10" stroke="#2438e0" strokeWidth="2.5"/>
                  <rect x="1" y="23" width="10" height="10" stroke="#2438e0" strokeWidth="2.5"/>
                  <rect x="20" y="20" width="4" height="4" fill="#2438e0"/>
                  <rect x="28" y="20" width="4" height="4" fill="#2438e0"/>
                  <rect x="20" y="28" width="4" height="4" fill="#2438e0"/>
                  <rect x="28" y="28" width="4" height="4" fill="#2438e0"/>
                </svg>
              </div>
              <h4>Escaneá en la puerta</h4>
              <p>Mostrás tu QR, lo escanean y tu asistencia queda registrada al instante.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ INSCRIPCION ============ */}
      <section className="section inscripcion" id="inscripcion">
        <div className="wrap insc-grid">
          <div>
            <span className="eyebrow">Reservá tu lugar</span>
            <h2>Sumate a <em>Brillando</em> 2026.</h2>
            <p>Dejá tus datos y asegurá tu pase para el Pre-Congreso "Auténticos". Es gratuito y el cupo es limitado.</p>

            <div className="insc-list">
              <div className="li">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9l4 4 8-9" stroke="#ffd400" strokeWidth="2.5" fill="none"/></svg>
                <span>Pase digital con QR enviado a tu correo</span>
              </div>
              <div className="li">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9l4 4 8-9" stroke="#ffd400" strokeWidth="2.5" fill="none"/></svg>
                <span>Acceso prioritario en la puerta del evento</span>
              </div>
              <div className="li">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9l4 4 8-9" stroke="#ffd400" strokeWidth="2.5" fill="none"/></svg>
                <span>Novedades exclusivas del Congreso principal</span>
              </div>
            </div>
          </div>

          <form className="pase-form" onSubmit={handleSubmit} noValidate>
            
            {!isPreCongresoActive ? (
              <div className="confirm-panel show">
                <h3 style={{ marginTop: '20px' }}>PRE-CONGRESO FINALIZADO</h3>
                <p>Las inscripciones para el evento del 12 de septiembre han cerrado.</p>
                <div style={{ marginTop: '20px', padding: '15px', background: 'var(--azul)', color: 'var(--crema)' }}>
                  <p style={{ color: 'var(--crema)', fontWeight: 'bold' }}>Próximamente abriremos los registros para el Congreso Principal del 31 de Octubre.</p>
                </div>
              </div>
            ) : !isSubmitted ? (
              <div id="formFields">
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="nombre">Nombre</label>
                    <input id="nombre" name="nombre" type="text" placeholder="Tu nombre" value={formData.nombre} onChange={handleInputChange} required />
                  </div>
                  <div className="field">
                    <label htmlFor="apellido">Apellido</label>
                    <input id="apellido" name="apellido" type="text" placeholder="Tu apellido" value={formData.apellido} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field full">
                    <label htmlFor="email">Correo electrónico</label>
                    <input id="email" name="email" type="email" placeholder="nombre@correo.com" value={formData.email} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="edad">Edad</label>
                    <input id="edad" name="edad" type="number" min="10" max="99" placeholder="17" value={formData.edad} onChange={handleInputChange} required />
                  </div>
                  <div className="field">
                    <label htmlFor="iglesia">Iglesia</label>
                    <input id="iglesia" name="iglesia" type="text" placeholder="Nombre de tu iglesia" value={formData.iglesia} onChange={handleInputChange} required />
                  </div>
                </div>

                {/* ALERTA DE CORREO DUPLICADO */}
                {isDuplicate && (
                  <div style={{ backgroundColor: '#0a0a0c', color: '#ffcc00', padding: '15px', marginTop: '15px', border: '3px solid #ffcc00' }}>
                    <h4 style={{ fontFamily: 'var(--f-mono)', textTransform: 'uppercase', marginBottom: '5px' }}>Atención</h4>
                    <p style={{ fontSize: '14px', lineHeight: '1.5' }}>El correo <b>{formData.email}</b> ya tiene un pase registrado. Revisá la carpeta de SPAM o usá otro mail para inscribir a alguien más.</p>
                  </div>
                )}

                {errorMsg && <p style={{color: 'red', fontSize: '14px', marginTop: '10px'}}>{errorMsg}</p>}

                <div className="submit-row">
                  <button type="submit" className="btn azul" disabled={isLoading}>
                    {isLoading ? 'GENERANDO PASE...' : 'Quiero mi pase digital →'}
                  </button>
                </div>
                <p className="fine" style={{ marginTop: '14px' }}>Al inscribirte vas a recibir tu Pase Digital con código QR por correo.</p>
              </div>
            ) : (
              // NUEVO DISEÑO DEL TICKET VIP
              <div className="confirm-panel show" style={{ background: 'var(--crema)', border: '4px solid var(--tinta)', padding: '40px 20px', boxShadow: '12px 12px 0 var(--tinta)', textAlign: 'center' }}>
                <span className="eyebrow" style={{ color: 'var(--azul)', marginBottom: '15px' }}>◆ PASE GENERADO ◆</span>
                <h3 style={{ fontFamily: 'var(--f-display)', fontSize: 'clamp(24px, 3vw, 32px)', textTransform: 'uppercase', lineHeight: '1', color: 'var(--tinta)', marginBottom: '30px' }}>
                  ¡YA SOS PARTE DE<br/>BRILLANDO!
                </h3>
                
                <div style={{ margin: '0 auto 25px', background: 'var(--crema)', padding: '20px', display: 'inline-block', border: '4px solid var(--tinta)', boxShadow: '8px 8px 0 var(--tinta)' }}>
                  <QRCode 
                    value={userId} 
                    size={180}
                    bgColor="#f2ede0" // var(--crema)
                    fgColor="#0a0a0c" // var(--tinta)
                  />
                </div>

                <p style={{ fontSize: '15px', color: 'var(--tinta)', lineHeight: '1.5' }}>
                  El pase de <b>{formData.nombre}</b> fue enviado a <br/>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: '13px' }}>{formData.email}</span>
                </p>
                <p style={{ fontFamily: 'var(--f-mono)', fontSize: '12px', marginTop: '15px', color: 'rgba(10,10,12,0.6)', textTransform: 'uppercase' }}>
                  ID: {userId}
                </p>

                {/* BOTONES SOCIALES Y DE LÍDERES */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '30px' }}>
                  <button onClick={handleShare} className="btn azul" style={{ width: '100%', justifyContent: 'center', fontSize: '14px' }}>
                    Compartir mi Pase ↗
                  </button>
                  <button type="button" onClick={handleResetForm} className="btn ghost" style={{ width: '100%', justifyContent: 'center', border: '2px solid var(--tinta)' }}>
                    Inscribir a alguien más
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-brand">
              <span className="handle">Brillando 2026</span>
              <p>Un movimiento de la Red Juvenil I.C.E.B para confrontar a los jóvenes con su identidad real, lejos de las presiones de la sociedad.</p>
            </div>
            <div className="foot-col">
              <h5>Congreso</h5>
              <a href="#concepto">El concepto</a>
              <a href="#romper">Rompé el molde</a>
              <a href="#fechas">Fechas</a>
              <a href="#pase">Tu pase digital</a>
            </div>
            <div className="foot-col">
              <h5>Contacto</h5>
              <a href="https://instagram.com/congresobrillando" target="_blank" rel="noreferrer">@congresobrillando</a>
              <a href="#ubicacion">Auditorio Ministerio CDS</a>
              <a href="#inscripcion">Inscribirme ahora</a>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© 2026 Red Juvenil · I.C.E.B</span>
            <span>La identidad real no se copia.</span>
          </div>
        </div>
      </footer>
    </>
  );
}