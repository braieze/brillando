# Brillando 2026 ⚡️

Sistema integral de web y control de accesos para el Congreso Juvenil "Brillando 2026" y su Pre-Congreso ("Auténticos"). Desarrollado con una estética gráfica de estilo brutalista, el proyecto se divide en una Landing Page pública para el registro de asistentes y un Dashboard administrativo para el escaneo rápido de pases digitales en la puerta del evento.

## Características Principales

### 1. Landing Page (Portal Público)
* **Inscripción y Base de Datos:** Formulario de registro conectado en tiempo real a Firebase Firestore.
* **Pase Digital Inmediato:** Generación automática de un ID único y un código QR que funciona como entrada.
* **Integración de Correos:** Envío automatizado del pase digital mediante EmailJS con plantillas HTML personalizadas que mantienen la estética del sitio.
* **Lógica de Bloqueo por Fecha (FOMO):** Ocultamiento programado de contenido ("Anti-Casting") que se revela automáticamente después de la fecha del evento presencial para incentivar la asistencia.

### 2. Dashboard Administrativo (Control de Puerta)
* **Escáner QR Blindado:** Módulo de cámara integrado (`@yudiel/react-qr-scanner`) capaz de leer los códigos de los asistentes desde cualquier dispositivo móvil.
* **Flujo Anti-Accidentes:** Modal visual de confirmación de identidad que frena el escaneo y detecta accesos duplicados ("Pase ya utilizado").
* **Modo Rescate:** Sistema de ingreso manual de emergencia para anotar a personas que llegan sin previo aviso, sincronizándolas al instante con la base de datos.
* **Métricas en Vivo:** Panel estadístico que calcula el progreso porcentual real comparando el total de inscriptos con la gente que ya ingresó al salón.
* **UI Optimizada para Móviles:** Gestos integrados como "swipe-to-delete" para administrar la base de datos desde la pantalla táctil en la trinchera del evento.

## Stack Tecnológico

* **Frontend:** React 
* **Backend as a Service (BaaS):** Firebase (Firestore)
* **Mailing:** EmailJS
* **Librerías Clave:** 
  * `react-qr-code` (Renderizado de QR en la web)
  * `@yudiel/react-qr-scanner` (Lectura por cámara web/celular)
  * `date-fns` (Manejo condicional de fechas de eventos)
* **Diseño UI:** CSS puro estructurado mediante variables CSS, enfocado en un diseño Brutalista (sombras sólidas gruesas, alto contraste, paleta reducida a colores crema, tinta, azul y amarillo, y tipografías Display pesadas).
