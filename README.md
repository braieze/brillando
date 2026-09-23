<div align="center">
  <img src="./brillando-portada.gif" alt="Demo Brillando 2026" width="800" />
</div>

<br />

# ⚡️ Brillando 2026 - Sistema Integral de Accesos y Landing Page

**[ SISTEMA EN PRODUCCIÓN | CONTROL EN TIEMPO REAL ]**

Sistema web integral diseñado para la gestión del Congreso Juvenil "Brillando 2026" y su evento previo. El proyecto fusiona una identidad visual de **estilo Brutalista** con una arquitectura de control de accesos de alta concurrencia. Se divide en dos módulos críticos: una Landing Page pública para la inscripción automatizada y un Dashboard administrativo optimizado para el escaneo *in situ* y la toma de decisiones en la puerta del evento.

## 🚀 Arquitectura y Soluciones

### 1. Portal Público (Landing Page & Registro)
* **Inscripción Serverless:** Formulario de captura de datos conectado en tiempo real a Firebase Firestore.
* **Emisión de Pases Digitales:** Generación automática de IDs únicos y códigos QR renderizados en el cliente (`react-qr-code`).
* **Mailing Automatizado:** Envío instantáneo del ticket vía EmailJS con plantillas HTML personalizadas que respetan la estética del evento.
* **Lógica Anti-Casting (FOMO):** Renderizado condicional basado en fechas (`date-fns`) que oculta contenido estratégico hasta que finaliza el evento presencial, incentivando la asistencia física.

### 2. Dashboard Administrativo (Control de Puerta)
* **Escáner QR Blindado:** Módulo de lectura mediante cámara (`@yudiel/react-qr-scanner`) compatible con cualquier dispositivo móvil en el terreno.
* **Flujo Anti-Duplicados:** Modal visual de confirmación de identidad que bloquea el escáner al detectar pases previamente utilizados, evitando accesos irregulares.
* **Modo Rescate:** Sistema de ingreso manual de emergencia para asistentes sin registro previo, sincronizando la base de datos al instante.
* **Analítica en Vivo:** Panel estadístico que calcula el aforo porcentual en tiempo real, contrastando inscriptos totales contra asistentes ingresados.
* **UI Táctica (Mobile-Optimized):** Gestos nativos integrados como *swipe-to-delete* para una gestión de bases de datos fluida y rápida desde pantallas táctiles.

## 🛠️ Stack Tecnológico

* **Frontend:** React.js[cite: 16].
* **Diseño UI/UX:** Estilo Brutalista implementado con CSS puro y variables CSS (sombras sólidas, alto contraste, paleta reducida y tipografías Display pesadas)[cite: 16].
* **Backend & BaaS:** Firebase (Firestore Realtime Database)[cite: 16].
* **Integraciones:** EmailJS (Mailing Transaccional).
