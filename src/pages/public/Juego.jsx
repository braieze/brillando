import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, updateDoc, increment, arrayUnion, onSnapshot } from "firebase/firestore";
import { Scanner } from '@yudiel/react-qr-scanner';
import { db } from '../../config/firebase';
import DashboardJugador from './DashboardJugador';
import './Juego.css';

// ============================================================================
// CATÁLOGO OFICIAL DE LOS 23 JUEGOS DEL CONGRESO (DATOS + MODAL + PREGUNTAS)
// ============================================================================
export const LISTA_JUEGOS_OFICIAL = [
  {
    id: 1,
    codigoQR: 'qr-1',
    aliases: ['qr-cronometro', '1', 'crono'],
    titulo: 'Crono 10"',
    icono: '⏱️',
    puntos: 50,
    color: 'rojo',
    modalidad: '2 Grupos (1 vs 1)',
    materiales: 'Computadora o celular con cronómetro y mesa.',
    info: 'Se enfrentan 2 grupos (primero 1 y luego el otro). El jugador debe detener el cronómetro intentando clavarlo exactamente en 10.00 segundos. Gana quien quede más cerca de los 10 segundos.',
    tipo: 'normal',
    preguntas: [
      {
        texto: '¿Cuántos meses del año tienen 28 días o más?',
        opciones: [
          { id: 'a', texto: 'Todos los 12 meses' },
          { id: 'b', texto: 'Solo febrero' },
          { id: 'c', texto: 'Ninguno' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Si un reloj tarda 5 segundos en dar 5 campanadas, ¿cuántos segundos hay entre la primera y la segunda campanada?',
        opciones: [
          { id: 'a', texto: '5 segundos' },
          { id: 'b', texto: '1 segundo (aprox)' },
          { id: 'c', texto: '10 segundos' }
        ],
        correcta: 'b'
      },
      {
        texto: '¿Cuántos segundos exactos hay en un minuto y medio?',
        opciones: [
          { id: 'a', texto: '90 segundos' },
          { id: 'b', texto: '60 segundos' },
          { id: 'c', texto: '150 segundos' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 2,
    codigoQR: 'qr-2',
    aliases: ['qr-basquet', '2', 'basquet'],
    titulo: 'Básquet',
    icono: '🏀',
    puntos: 30,
    color: 'amarillo',
    modalidad: 'Individual',
    materiales: 'Aro de básquet y pelotas.',
    info: 'Desafío individual de puntería. Gana el jugador que logre encestar la cantidad objetivo de veces en sus 3 intentos.',
    tipo: 'normal',
    preguntas: [
      {
        texto: 'Participás en una carrera y adelantás al corredor que va en segundo lugar. ¿En qué posición quedás ahora?',
        opciones: [
          { id: 'a', texto: 'Primero' },
          { id: 'b', texto: 'Segundo' },
          { id: 'c', texto: 'Tercero' }
        ],
        correcta: 'b'
      },
      {
        texto: 'La palabra "MÁSCARA" tiene 7 letras. Si la leés normalmente, ¿cuál es la cuarta letra?',
        opciones: [
          { id: 'a', texto: 'S' },
          { id: 'b', texto: 'C' },
          { id: 'c', texto: 'A' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Un partido de básquet tiene 4 cuartos de 10 minutos cada uno. ¿Cuántos minutos de juego neto son en total?',
        opciones: [
          { id: 'a', texto: '40 minutos' },
          { id: 'b', texto: '45 minutos' },
          { id: 'c', texto: '60 minutos' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 3,
    codigoQR: 'qr-3',
    aliases: ['qr-vasitos', '3', 'pasajero'],
    titulo: 'Pasajero',
    icono: '🚶‍♂️',
    puntos: 50,
    color: 'verde',
    modalidad: '2 Grupos en simultáneo',
    materiales: 'Vasos y pelotita para dos equipos.',
    info: 'Se enfrentan 2 grupos al mismo tiempo. Gana el primero que junte todos los vasos manteniendo la pelotita encima sin que se caiga.',
    tipo: 'normal',
    preguntas: [
      {
        texto: 'El padre de María tiene 3 hijas: Abril, Mayo y... ¿cómo se llama la tercera hija?',
        opciones: [
          { id: 'a', texto: 'María' },
          { id: 'b', texto: 'Junio' },
          { id: 'c', texto: 'Marzo' }
        ],
        correcta: 'a'
      },
      {
        texto: 'A la palabra "ESCAPE" sacale todas las vocales. ¿Cuántas letras consonantes te quedan?',
        opciones: [
          { id: 'a', texto: '4 consonantes' },
          { id: 'b', texto: '2 consonantes' },
          { id: 'c', texto: '3 consonantes (S, C, P)' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Un colectivo sale con 10 pasajeros. En la primera parada bajan 4 y suben 2. ¿Cuántos pasajeros siguen en el colectivo?',
        opciones: [
          { id: 'a', texto: '8 pasajeros' },
          { id: 'b', texto: '6 pasajeros' },
          { id: 'c', texto: '12 pasajeros' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 4,
    codigoQR: 'qr-4',
    aliases: ['qr-ppt', '4', 'ppt'],
    titulo: 'Piedra, Papel o Tijera (Emojis)',
    icono: '✊',
    puntos: 40,
    color: 'azul',
    modalidad: '2 Grupos en simultáneo',
    materiales: 'Cartas o tarjetas con emojis.',
    info: 'Duelo entre 2 grupos en simultáneo al mejor de 3 intentos. Gana el equipo que logre vencer 2 de los 3 enfrentamientos.',
    tipo: 'normal',
    preguntas: [
      {
        texto: 'Leé esta lista de frutas: Manzana, Pera, Uva, Banana, Kiwi, Limón. ¿Cuántas frutas de la lista empiezan con la letra "K"?',
        opciones: [
          { id: 'a', texto: 'Ninguna' },
          { id: 'b', texto: 'Una (Kiwi)' },
          { id: 'c', texto: 'Dos' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Entrás a una cabaña oscura con un solo fósforo. Hay una vela, una lámpara y una chimenea. ¿Qué encendés primero?',
        opciones: [
          { id: 'a', texto: 'La vela' },
          { id: 'b', texto: 'El fósforo' },
          { id: 'c', texto: 'La chimenea' }
        ],
        correcta: 'b'
      },
      {
        texto: 'En el clásico Piedra, Papel o Tijera, ¿qué elemento le gana al Papel?',
        opciones: [
          { id: 'a', texto: 'La Tijera' },
          { id: 'b', texto: 'La Piedra' },
          { id: 'c', texto: 'Empatan' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 5,
    codigoQR: 'qr-5',
    aliases: ['qr-aro', '5', 'emboca'],
    titulo: 'Emboca Emboca',
    icono: '🎯',
    puntos: 30,
    color: 'rojo',
    modalidad: 'Individual',
    materiales: 'Botellas, aros y mesa.',
    info: 'Desafío individual de puntería con aros. Gana quien logre embocar la cantidad requerida de aros en las botellas.',
    tipo: 'normal',
    preguntas: [
      {
        texto: 'Identificá qué palabra representa lo contrario a vivir con apariencias: MÁSCARA - FILTRO - AUTENTICIDAD - ENGAÑO.',
        opciones: [
          { id: 'a', texto: 'Filtro' },
          { id: 'b', texto: 'Engaño' },
          { id: 'c', texto: 'Autenticidad' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Tenés 3 puertas para escapar: la 1 está llena de fuego, la 2 tiene un león de peluche, la 3 tiene electricidad. ¿Cuál elegís?',
        opciones: [
          { id: 'a', texto: 'La puerta 1' },
          { id: 'b', texto: 'La puerta 3' },
          { id: 'c', texto: 'La puerta 2 (es de peluche)' }
        ],
        correcta: 'c'
      },
      {
        texto: '¿Cuánto es el doble de 15 más 10?',
        opciones: [
          { id: 'a', texto: '40' },
          { id: 'b', texto: '25' },
          { id: 'c', texto: '50' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 6,
    codigoQR: 'qr-6',
    aliases: ['qr-bowling-pinos', '6', 'bowling1'],
    titulo: 'Bowling (Pinos)',
    icono: '🎳',
    puntos: 30,
    color: 'amarillo',
    modalidad: 'Individual',
    materiales: 'Pinos, bola y camino.',
    info: 'Estación 1 de Bowling (con pinos). Gana el jugador que logre derribar 5 pinos en 2 intentos.',
    tipo: 'normal',
    preguntas: [
      {
        texto: 'Hay 10 pinos de bowling parados. En tu primer tiro derribás 6. ¿Cuántos pinos quedan de pie?',
        opciones: [
          { id: 'a', texto: '4 pinos' },
          { id: 'b', texto: '6 pinos' },
          { id: 'c', texto: 'Ninguno' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cuál de estas tres afirmaciones es FALSA?',
        opciones: [
          { id: 'a', texto: 'El agua moja' },
          { id: 'b', texto: '5 + 5 es igual a 10' },
          { id: 'c', texto: 'El hielo hierve a 0 grados' }
        ],
        correcta: 'c'
      },
      {
        texto: '¿Qué pesa más: 1 kilo de plumas o 1 kilo de plomo?',
        opciones: [
          { id: 'a', texto: 'El plomo' },
          { id: 'b', texto: 'Pesan exactamente lo mismo (1 kilo)' },
          { id: 'c', texto: 'Las plumas' }
        ],
        correcta: 'b'
      }
    ]
  },
  {
    id: 7,
    codigoQR: 'qr-7',
    aliases: ['qr-dados', '7', 'dados'],
    titulo: 'Dados Chinos',
    icono: '🎲',
    puntos: 40,
    color: 'verde',
    modalidad: 'Individual',
    materiales: 'Más de 5 dados, palitos chinos y mesa.',
    info: 'El jugador debe apilar los dados uno sobre otro tomándolos únicamente con palitos chinos sin que la torre se caiga.',
    tipo: 'normal',
    preguntas: [
      {
        texto: 'Un dado común tiene caras numeradas del 1 al 6. ¿Cuál es el número máximo que podés sacar tirando 2 dados juntos?',
        opciones: [
          { id: 'a', texto: '10' },
          { id: 'b', texto: '12' },
          { id: 'c', texto: '6' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Si apilás 5 dados y se te caen 2 al piso, ¿cuántos dados quedaron en la torre?',
        opciones: [
          { id: 'a', texto: '3 dados' },
          { id: 'b', texto: '2 dados' },
          { id: 'c', texto: '5 dados' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cuántos lados tiene un cuadrado?',
        opciones: [
          { id: 'a', texto: '3 lados' },
          { id: 'b', texto: '4 lados' },
          { id: 'c', texto: '6 lados' }
        ],
        correcta: 'b'
      }
    ]
  },
  {
    id: 8,
    codigoQR: 'qr-8',
    aliases: ['qr-tejo', '8', 'tejo', 'qr-arco'],
    titulo: 'Tejo',
    icono: '🥏',
    puntos: 50,
    color: 'azul',
    modalidad: '4 Grupos en simultáneo',
    materiales: '2 tableros de tejo, tapitas y mesa.',
    info: 'Compiten 2 grupos por tablero (4 en simultáneo). Gana el equipo que logre pasar todas sus tapitas al otro lado primero.',
    tipo: 'normal',
    preguntas: [
      {
        texto: 'Sumá mentalmente: 100 + 200 + 300 + 400 = ?',
        opciones: [
          { id: 'a', texto: '900' },
          { id: 'b', texto: '1000' },
          { id: 'c', texto: '1100' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Si en un tablero juegan 2 equipos con 5 fichas cada uno, ¿cuántas fichas hay en el tablero en total?',
        opciones: [
          { id: 'a', texto: '10 fichas' },
          { id: 'b', texto: '5 fichas' },
          { id: 'c', texto: '15 fichas' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Qué mes del calendario tiene 28 días todos los años (y 29 en año bisiesto)?',
        opciones: [
          { id: 'a', texto: 'Febrero' },
          { id: 'b', texto: 'Marzo' },
          { id: 'c', texto: 'Abril' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 9,
    codigoQR: 'qr-9',
    aliases: ['qr-pasavasos', '9', 'pasavasos'],
    titulo: 'Pasa Vasos',
    icono: '🥤',
    puntos: 40,
    color: 'rojo',
    modalidad: 'Individual',
    materiales: '15 vasos iguales más 1 vaso de color diferente.',
    info: 'El jugador debe pasar los vasos de arriba hacia abajo a toda velocidad hasta que el vaso de color diferente dé toda la vuelta y vuelva a quedar arriba.',
    tipo: 'normal',
    preguntas: [
      {
        texto: 'Tenés una pila de 15 vasos azules y 1 vaso rojo. ¿Cuántos vasos hay en total en la pila?',
        opciones: [
          { id: 'a', texto: '15 vasos' },
          { id: 'b', texto: '16 vasos' },
          { id: 'c', texto: '14 vasos' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Si un vaso está lleno de agua hasta la mitad, ¿qué porcentaje del vaso está vacío?',
        opciones: [
          { id: 'a', texto: '50%' },
          { id: 'b', texto: '25%' },
          { id: 'c', texto: '100%' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cuál es el lema principal de Brillando 2026?',
        opciones: [
          { id: 'a', texto: 'Salí del molde / Auténticos' },
          { id: 'b', texto: 'Seguí la corriente' },
          { id: 'c', texto: 'Más filtros que nunca' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 10,
    codigoQR: 'qr-10',
    aliases: ['qr-malabarista', '10', 'malabarista'],
    titulo: 'Malabarista',
    icono: '🤹',
    puntos: 40,
    color: 'amarillo',
    modalidad: 'Individual',
    materiales: 'Globos (2 globos inflados por turno).',
    info: 'El jugador debe mantener los globos en el aire usando sus manos. Gana si logra que ningún globo toque el piso durante 1 minuto completo.',
    tipo: 'normal',
    preguntas: [
      {
        texto: '¿Cuántos segundos tiene que aguantar el jugador sin que el globo toque el piso si el desafío dura 1 minuto?',
        opciones: [
          { id: 'a', texto: '30 segundos' },
          { id: 'b', texto: '60 segundos' },
          { id: 'c', texto: '100 segundos' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Si inflás un globo con aire común y lo soltás sin atarlo, ¿qué pasa?',
        opciones: [
          { id: 'a', texto: 'Se desinfla saliendo disparado' },
          { id: 'b', texto: 'Queda congelado' },
          { id: 'c', texto: 'Se convierte en piedra' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Si tenés 2 globos en cada mano, ¿cuántos globos tenés en total?',
        opciones: [
          { id: 'a', texto: '2 globos' },
          { id: 'b', texto: '4 globos' },
          { id: 'c', texto: '6 globos' }
        ],
        correcta: 'b'
      }
    ]
  },
  {
    id: 11,
    codigoQR: 'qr-11',
    aliases: ['qr-aldente', '11', 'aldente'],
    titulo: 'Al Dente',
    icono: '🍝',
    puntos: 50,
    color: 'verde',
    modalidad: 'Individual',
    materiales: '6 fideos mostachol, 1 fideo espagueti por turno y mesa.',
    info: 'Los fideos mostachol se colocan sobre la mesa. El jugador debe sostener el espagueti con la boca y levantar los 6 mostacholes sin usar las manos.',
    tipo: 'normal',
    preguntas: [
      {
        texto: 'En el juego "Al Dente", ¿con qué parte del cuerpo se sostiene el fideo espagueti largo?',
        opciones: [
          { id: 'a', texto: 'Con la boca' },
          { id: 'b', texto: 'Con el pie' },
          { id: 'c', texto: 'Con el codo' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿De qué país es originaria tradicionalmente la pasta (espagueti, mostachol)?',
        opciones: [
          { id: 'a', texto: 'Italia' },
          { id: 'b', texto: 'Brasil' },
          { id: 'c', texto: 'Sudáfrica' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Si tenés que levantar 6 fideos mostachol y ya levantaste 4, ¿cuántos te faltan para ganar?',
        opciones: [
          { id: 'a', texto: '2 fideos' },
          { id: 'b', texto: '3 fideos' },
          { id: 'c', texto: '1 fideo' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 12,
    codigoQR: 'qr-12',
    aliases: ['qr-tateti-ppt', '12', 'tatetippt'],
    titulo: 'Ta Te Ti Pa Pe Ti',
    icono: '⚔️',
    puntos: 50,
    color: 'azul',
    modalidad: '2 Grupos en simultáneo',
    materiales: 'Tablero de Ta-Te-Ti, fichas y mesa.',
    info: 'Se enfrentan 2 grupos haciendo Piedra, Papel o Tijera. Solo está habilitado a poner una ficha en el tablero el equipo que gane el turno de Piedra, Papel o Tijera. ¡Gana el que arme Ta-Te-Ti!',
    tipo: 'normal',
    preguntas: [
      {
        texto: '¿Cuántos casilleros en total tiene un tablero clásico de Ta-Te-Ti (3x3)?',
        opciones: [
          { id: 'a', texto: '6 casilleros' },
          { id: 'b', texto: '9 casilleros' },
          { id: 'c', texto: '12 casilleros' }
        ],
        correcta: 'b'
      },
      {
        texto: '¿Cuántas fichas propias en línea necesitás alinear para ganar en el Ta-Te-Ti?',
        opciones: [
          { id: 'a', texto: '3 en línea' },
          { id: 'b', texto: '5 en línea' },
          { id: 'c', texto: '2 en línea' }
        ],
        correcta: 'a'
      },
      {
        texto: 'En el Piedra, Papel o Tijera, ¿qué elemento vence a la Piedra?',
        opciones: [
          { id: 'a', texto: 'La Tijera' },
          { id: 'b', texto: 'El Papel' },
          { id: 'c', texto: 'Ninguno' }
        ],
        correcta: 'b'
      }
    ]
  },
  {
    id: 13,
    codigoQR: 'qr-13',
    aliases: ['qr-tuerca', '13', 'tuerca'],
    titulo: 'Vuelta de Tuerca',
    icono: '🔩',
    puntos: 40,
    color: 'rojo',
    modalidad: 'Individual',
    materiales: '5 o más tuercas, un palito chino y mesa.',
    info: 'Comienza con todas las tuercas enhebradas dentro del palito. El jugador debe deslizarlas y apilarlas una arriba de la otra en vertical sin usar las manos para tocar las tuercas.',
    tipo: 'normal',
    preguntas: [
      {
        texto: 'Si apilás 5 tuercas y cada tuerca vale 10 puntos imaginarios, ¿cuánto suman las 5?',
        opciones: [
          { id: 'a', texto: '50' },
          { id: 'b', texto: '25' },
          { id: 'c', texto: '15' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿De qué material suelen estar hechas las tuercas de ferretería?',
        opciones: [
          { id: 'a', texto: 'De metal / acero' },
          { id: 'b', texto: 'De algodón' },
          { id: 'c', texto: 'De papel' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Qué herramienta hace pareja siempre con una tuerca?',
        opciones: [
          { id: 'a', texto: 'El tornillo / bulón' },
          { id: 'b', texto: 'La cuchara' },
          { id: 'c', texto: 'El peine' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 14,
    codigoQR: 'qr-14',
    aliases: ['qr-tateti', '14', 'tateti'],
    titulo: 'Ta Te Ti',
    icono: '❌',
    puntos: 30,
    color: 'amarillo',
    modalidad: '2 Grupos en simultáneo',
    materiales: 'Fichas de Ta-Te-Ti y tablero.',
    info: 'Duelo de velocidad y estrategia entre 2 grupos. Tienen un mini-reto antes de colocar cada pieza en el tablero. Gana el primer equipo que logre formar Ta-Te-Ti.',
    tipo: 'normal',
    preguntas: [
      {
        texto: 'Tenés una soga de 1 metro y le hacés 2 cortes. ¿En cuántos pedazos queda dividida la soga?',
        opciones: [
          { id: 'a', texto: 'En 2 pedazos' },
          { id: 'b', texto: 'En 3 pedazos' },
          { id: 'c', texto: 'En 4 pedazos' }
        ],
        correcta: 'b'
      },
      {
        texto: '¿Qué número falta en esta serie de pares? 2, 4, 6, 8, __, 12.',
        opciones: [
          { id: 'a', texto: '10' },
          { id: 'b', texto: '9' },
          { id: 'c', texto: '11' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Seguí la tabla del 5: Si 1x5 = 5, 2x5 = 10, 3x5 = 15, 4x5 = 20... ¿Cuánto es 5x5?',
        opciones: [
          { id: 'a', texto: '25' },
          { id: 'b', texto: '30' },
          { id: 'c', texto: '15' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 15,
    codigoQR: 'qr-15',
    aliases: ['qr-rompecabezas', '15', 'rompecabezas'],
    titulo: 'Rompecabezas',
    icono: '🧩',
    puntos: 40,
    color: 'verde',
    modalidad: 'Individual',
    materiales: 'Rompecabezas, antifaz (venda para los ojos) y mesa.',
    info: 'El jugador debe armar el rompecabezas completo a ciegas (o siguiendo las indicaciones de su equipo) antes de que se termine el tiempo.',
    tipo: 'normal',
    preguntas: [
      {
        texto: 'Si un rompecabezas tiene 4 esquinas y ya pusiste 3, ¿cuántas esquinas te falta colocar?',
        opciones: [
          { id: 'a', texto: '1 esquina' },
          { id: 'b', texto: '2 esquinas' },
          { id: 'c', texto: '4 esquinas' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Cuando te tapás los ojos con una venda, ¿qué sentido dejás de usar temporalmente?',
        opciones: [
          { id: 'a', texto: 'La vista' },
          { id: 'b', texto: 'El oído' },
          { id: 'c', texto: 'El tacto' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cuántas piezas tiene un rompecabezas de 3 filas por 3 columnas?',
        opciones: [
          { id: 'a', texto: '6 piezas' },
          { id: 'b', texto: '9 piezas' },
          { id: 'c', texto: '12 piezas' }
        ],
        correcta: 'b'
      }
    ]
  },
  {
    id: 16,
    codigoQR: 'qr-16',
    aliases: ['qr-piramide', '16', 'piramide'],
    titulo: 'Pirámide',
    icono: '🔺',
    puntos: 40,
    color: 'azul',
    modalidad: 'Individual',
    materiales: '28 vasos mínimo (base de 7) y mesa.',
    info: 'El jugador debe armar la pirámide completa de vasos (con base de 7) y luego volver a juntar todos los vasos en una sola pila usando únicamente 1 mano (o con ambas manos usando guantes de boxeo).',
    tipo: 'normal',
    preguntas: [
      {
        texto: '¿En qué país famoso de África se encuentran las grandes pirámides antiguas?',
        opciones: [
          { id: 'a', texto: 'Egipto' },
          { id: 'b', texto: 'Japón' },
          { id: 'c', texto: 'Canadá' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Si la base de tu pirámide tiene 7 vasos y el piso de arriba tiene 6, ¿cuántos vasos suman entre esos dos pisos?',
        opciones: [
          { id: 'a', texto: '13 vasos' },
          { id: 'b', texto: '12 vasos' },
          { id: 'c', texto: '14 vasos' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cuántos vasos quedan en la punta más alta (la cima) de una pirámide?',
        opciones: [
          { id: 'a', texto: '1 solo vaso' },
          { id: 'b', texto: '3 vasos' },
          { id: 'c', texto: '7 vasos' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 17,
    codigoQR: 'qr-17',
    aliases: ['qr-memoria', '17', 'memoria'],
    titulo: 'Memoria',
    icono: '🧠',
    puntos: 50,
    color: 'rojo',
    modalidad: 'Individual',
    materiales: 'Pelotitas de colores por partida doble, cajas/soportes donde alinear las pelotitas (x2) y mesa.',
    info: 'El colaborador arma 3 secuencias ocultas de pelotitas de colores. El jugador las mira unos segundos y debe replicarlas de memoria. Gana si logra recordar y acertar las 3 secuencias.',
    tipo: 'normal',
    preguntas: [
      {
        texto: 'Mirás esta secuencia: ROJO - AZUL - AMARILLO. ¿Cuál fue el color del medio?',
        opciones: [
          { id: 'a', texto: 'Rojo' },
          { id: 'b', texto: 'Azul' },
          { id: 'c', texto: 'Amarillo' }
        ],
        correcta: 'b'
      },
      {
        texto: '¿Qué órgano del cuerpo humano usamos principalmente para recordar secuencias y pensar?',
        opciones: [
          { id: 'a', texto: 'El cerebro' },
          { id: 'b', texto: 'El estómago' },
          { id: 'c', texto: 'El pulmón' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Si tenés que recordar 3 secuencias de 4 pelotitas cada una, ¿cuántas pelotitas memorizaste en total?',
        opciones: [
          { id: 'a', texto: '12 pelotitas' },
          { id: 'b', texto: '7 pelotitas' },
          { id: 'c', texto: '10 pelotitas' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 18,
    codigoQR: 'qr-18',
    aliases: ['qr-minions', '18', 'minions'],
    titulo: 'Minions Nerds',
    icono: '🤓',
    puntos: 40,
    color: 'azul',
    modalidad: '2 Grupos en simultáneo',
    materiales: 'Hojas, lapiceras, dos antifaces/máscaras de Minions y mesa.',
    info: 'Compiten 2 grupos en simultáneo. Con la máscara de Minion puesta en la cara, gana el grupo que en 1 minuto escriba más palabras correctas que empiecen con la letra indicada.',
    tipo: 'normal',
    preguntas: [
      {
        texto: '¿De qué color son los famosos personajes Minions?',
        opciones: [
          { id: 'a', texto: 'Amarillos' },
          { id: 'b', texto: 'Verdes' },
          { id: 'c', texto: 'Rojos' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cuál de estas tres palabras empieza con la letra "B" de Brillando?',
        opciones: [
          { id: 'a', texto: 'Bendición' },
          { id: 'b', texto: 'Victoria' },
          { id: 'c', texto: 'Fuerza' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cuántas letras tiene la palabra "MINION"?',
        opciones: [
          { id: 'a', texto: '6 letras' },
          { id: 'b', texto: '5 letras' },
          { id: 'c', texto: '8 letras' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 19,
    codigoQR: 'qr-19',
    aliases: ['qr-bowling', '19', 'bowling2'],
    titulo: 'Bowling (Botellas)',
    icono: '🎳',
    puntos: 40,
    color: 'verde',
    modalidad: 'Individual',
    materiales: 'Botellas, bola y camino.',
    info: 'Estación 2 de Bowling (con botellas). Gana el jugador que logre derribar 5 botellas en sus 2 intentos.',
    tipo: 'normal',
    preguntas: [
      {
        texto: 'Un pozo en la tierra mide 2 metros de ancho por 2 de profundidad. ¿Cuánta tierra hay ADENTRO del agujero del pozo?',
        opciones: [
          { id: 'a', texto: '4 metros de tierra' },
          { id: 'b', texto: 'Ninguna (es un pozo vacío)' },
          { id: 'c', texto: '2 metros de tierra' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Tenés 10 botellas paradas y en un tiro derribás todas menos 3. ¿Cuántas botellas quedaron paradas?',
        opciones: [
          { id: 'a', texto: '3 botellas' },
          { id: 'b', texto: '7 botellas' },
          { id: 'c', texto: 'Ninguna' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Si en el primer tiro tirás 3 botellas y en el segundo tirás 4, ¿cuántas botellas derribaste en total?',
        opciones: [
          { id: 'a', texto: '7 botellas' },
          { id: 'b', texto: '6 botellas' },
          { id: 'c', texto: '8 botellas' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 20,
    codigoQR: 'qr-20',
    aliases: ['qr-pescador', '20', 'pescador'],
    titulo: 'Pescador',
    icono: '🎣',
    puntos: 50,
    color: 'amarillo',
    modalidad: '4 Grupos en simultáneo',
    materiales: 'Cañas de pescar, peces y pecera.',
    info: 'Compiten hasta 4 grupos al mismo tiempo. Gana quien logre pescar más peces en 1 minuto o el primero en alcanzar la cantidad objetivo de peces.',
    tipo: 'normal',
    preguntas: [
      {
        texto: 'Si pescás 4 peces rojos y 4 peces azules, ¿cuántos peces sacaste en total?',
        opciones: [
          { id: 'a', texto: '8 peces' },
          { id: 'b', texto: '6 peces' },
          { id: 'c', texto: '10 peces' }
        ],
        correcta: 'a'
      },
      {
        texto: 'En los Evangelios, Jesús llamó a unos pescadores y les dijo: "Vengan conmigo y los haré pescadores de..."',
        opciones: [
          { id: 'a', texto: 'Hombres / Personas' },
          { id: 'b', texto: 'Tiburones' },
          { id: 'c', texto: 'Tesoros' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Dónde viven naturalmente los peces?',
        opciones: [
          { id: 'a', texto: 'En el agua' },
          { id: 'b', texto: 'En los árboles' },
          { id: 'c', texto: 'En el desierto' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 21,
    codigoQR: 'qr-21',
    aliases: ['qr-enhebralo', '21', 'enhebralo'],
    titulo: 'Enhebralo',
    icono: '🧵',
    puntos: 40,
    color: 'rojo',
    modalidad: '2 Grupos en simultáneo',
    materiales: 'Botones, hilo y mesa.',
    info: 'Duelo de pulso y precisión entre 2 grupos. Gana el equipo que logre pasar el hilo y enhebrar la mayor cantidad de botones en el tiempo asignado.',
    tipo: 'normal',
    preguntas: [
      {
        texto: 'Si cada botón tiene 2 agujeritos y enhebraste 5 botones, ¿cuántos agujeritos tienen esos 5 botones en total?',
        opciones: [
          { id: 'a', texto: '10 agujeritos' },
          { id: 'b', texto: '5 agujeritos' },
          { id: 'c', texto: '12 agujeritos' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Para qué se usan principalmente los botones en una camisa?',
        opciones: [
          { id: 'a', texto: 'Para abrocharla / cerrarla' },
          { id: 'b', texto: 'Para plancharla' },
          { id: 'c', texto: 'Para mojarla' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Qué necesitás pasar por el ojo de una aguja para poder coser?',
        opciones: [
          { id: 'a', texto: 'El hilo' },
          { id: 'b', texto: 'Una tijera' },
          { id: 'c', texto: 'Un dedal' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 22,
    codigoQR: 'qr-22',
    aliases: ['qr-pong', '22', 'pong'],
    titulo: 'Pong Acuático',
    icono: '🏓',
    puntos: 40,
    color: 'amarillo',
    modalidad: '2 Grupos en simultáneo',
    materiales: '12 vasos con agua, pelotitas de ping-pong y 1 mesa larga.',
    info: 'Se colocan 6 vasos llenos de agua en cada extremo opuesto de la mesa. Turnándose para lanzar, gana quien emboque más pelotitas de ping-pong en 1 minuto o complete todos los vasos del oponente primero.',
    tipo: 'normal',
    preguntas: [
      {
        texto: 'Si hay 6 vasos de un lado de la mesa y 6 vasos del otro lado, ¿cuántos vasos hay en la mesa en total?',
        opciones: [
          { id: 'a', texto: '12 vasos' },
          { id: 'b', texto: '10 vasos' },
          { id: 'c', texto: '16 vasos' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cómo es por dentro una pelotita reglamentaria de ping-pong?',
        opciones: [
          { id: 'a', texto: 'Hueca (llena de aire)' },
          { id: 'b', texto: 'Maciza de hierro' },
          { id: 'c', texto: 'Rellena de arena' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Si tu equipo tenía que embocar en 6 vasos y ya embocó en 5, ¿cuántos vasos le quedan por acertar?',
        opciones: [
          { id: 'a', texto: '1 solo vaso' },
          { id: 'b', texto: '2 vasos' },
          { id: 'c', texto: 'Ninguno' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 23,
    codigoQR: 'qr-23',
    aliases: ['qr-jenga', '23', 'jenga'],
    titulo: 'Jenga Reverso',
    icono: '🧱',
    puntos: 50,
    color: 'verde',
    modalidad: '2 Grupos en simultáneo',
    materiales: 'Piezas de Jenga y mesa.',
    info: 'Sin apilar las piezas de forma tradicional (solo apoyadas de lado), gana el equipo que logre apilar la mayor cantidad de maderitas en 1 minuto manteniendo el equilibrio sin que se derrumbe.',
    tipo: 'normal',
    preguntas: [
      {
        texto: '¿De qué material son las piezas del juego Jenga clásico?',
        opciones: [
          { id: 'a', texto: 'De madera' },
          { id: 'b', texto: 'De vidrio' },
          { id: 'c', texto: 'De tela' }
        ],
        correcta: 'a'
      },
      {
        texto: 'En una torre de Jenga tradicional se arman pisos de 3 bloquecitos. ¿Cuántos bloques hay en 4 pisos?',
        opciones: [
          { id: 'a', texto: '12 bloques' },
          { id: 'b', texto: '9 bloques' },
          { id: 'c', texto: '15 bloques' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Qué pasa en el Jenga cuando la torre pierde el equilibrio y se cae?',
        opciones: [
          { id: 'a', texto: 'Se derrumba y termina el turno' },
          { id: 'b', texto: 'Suma puntos dobles' },
          { id: 'c', texto: 'Flota en el aire' }
        ],
        correcta: 'a'
      }
    ]
  }
];

// Códigos Especiales (Secretos y Trampa)
const CODIGOS_ESPECIALES = {
  'qr-secreto-1': {
    id: 101,
    titulo: 'QR Secreto #1',
    puntos: 100,
    tipo: 'bonus',
    info: '¡Encontraste uno de los códigos QR ocultos en el salón! Sumás 100 puntos directos.',
    preguntas: []
  },
  'qr-secreto-2': {
    id: 102,
    titulo: 'QR Secreto #2',
    puntos: 100,
    tipo: 'bonus',
    info: '¡Encontraste uno de los códigos QR ocultos en el salón! Sumás 100 puntos directos.',
    preguntas: []
  },
  'qr-trampa': {
    id: 103,
    titulo: 'SISTEMA COMPROMETIDO',
    puntos: -50,
    tipo: 'trampa',
    info: '¡Cuidado! Escaneaste el QR trampa escondido en el salón. Resta 50 puntos al equipo.',
    preguntas: []
  }
};

// Buscador universal de juegos (encuentra por QR nuevo, QR viejo o número del 1 al 23)
const buscarJuegoPorCodigo = (codigoCrudo) => {
  if (!codigoCrudo) return null;
  const limpio = codigoCrudo.toString().trim().toLowerCase();

  if (CODIGOS_ESPECIALES[limpio]) return CODIGOS_ESPECIALES[limpio];

  return LISTA_JUEGOS_OFICIAL.find(
    (j) =>
      j.codigoQR.toLowerCase() === limpio ||
      `juego_${j.id}` === limpio ||
      `juego-${j.id}` === limpio ||
      j.aliases.some((alias) => alias.toLowerCase() === limpio)
  ) || null;
};

// ============================================================================
// HELPER 1: IDENTIDAD DE DISPOSITIVO
// ============================================================================
const obtenerDeviceId = () => {
  let deviceId = localStorage.getItem('brillando_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    localStorage.setItem('brillando_device_id', deviceId);
  }
  return deviceId;
};

// ============================================================================
// HELPER 2: TIMEOUT CON REINTENTO AUTOMÁTICO (EVITA FALLOS POR SEÑAL DÉBIL)
// ============================================================================
const ejecutarConTimeout = async (fnPromesa, ms = 7000, reintentos = 2) => {
  for (let intento = 0; intento <= reintentos; intento++) {
    let timeoutId;
    try {
      const promesa = typeof fnPromesa === 'function' ? fnPromesa() : fnPromesa;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("TIMEOUT_RED")), ms);
      });
      return await Promise.race([promesa, timeoutPromise]).finally(() => clearTimeout(timeoutId));
    } catch (err) {
      clearTimeout(timeoutId);
      if (intento === reintentos) throw err;
      await new Promise((r) => setTimeout(r, 600));
    }
  }
};

export default function Juego() {
  const [activePin, setActivePin] = useState(() => localStorage.getItem('miGrupoPIN') || '');
  const [view, setView] = useState(() => localStorage.getItem('miGrupoPIN') ? 'dashboard' : 'inicio');
  
  const [pinInput, setPinInput] = useState('');
  const [pinGenerado, setPinGenerado] = useState('');
  const [nombreEquipo, setNombreEquipo] = useState('');
  const [nombreCapitan1, setNombreCapitan1] = useState('');
  const [nombreCapitan2, setNombreCapitan2] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estados de Trivia y Cámara
  const [juegoActivo, setJuegoActivo] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [mostrarOpciones, setMostrarOpciones] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [scannerCooldown, setScannerCooldown] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Solución a Android sin cámara: estado de error de cámara y código manual
  const [cameraError, setCameraError] = useState(false);
  const [codigoManualInput, setCodigoManualInput] = useState('');

  // Caché persistente del grupo (Evita el "CARGANDO..." infinito)
  const [grupoDataCache, setGrupoDataCache] = useState(() => {
    try {
      const guardado = localStorage.getItem('brillando_grupo_cache');
      return guardado ? JSON.parse(guardado) : null;
    } catch (_) {
      return null;
    }
  });
  const [grupoDocRef, setGrupoDocRef] = useState(null);
  const [rankingActual, setRankingActual] = useState('-');

  // ============================================================================
  // HELPER CRÍTICO: OBTENER REFERENCIA DEL GRUPO AUNQUE SE HAYA CORTADO LA RED
  // Soluciona la falla del Ta-Te-Ti donde `grupoDocRef` era null
  // ============================================================================
  const asegurarGrupoDocRef = async () => {
    if (grupoDocRef) return grupoDocRef;
    if (!activePin) return null;
    const q = query(collection(db, "grupos"), where("pin", "==", activePin));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const refEncontrada = snap.docs[0].ref;
      setGrupoDocRef(refEncontrada);
      setGrupoDataCache(snap.docs[0].data());
      return refEncontrada;
    }
    return null;
  };

  // ============================================================================
  // 1. ESCUCHADOR PERMANENTE DEL GRUPO EN TIEMPO REAL + CACHÉ LOCAL
  // ============================================================================
  useEffect(() => {
    if (!activePin) {
      setGrupoDataCache(null);
      setGrupoDocRef(null);
      localStorage.removeItem('brillando_grupo_cache');
      return;
    }

    const q = query(collection(db, "grupos"), where("pin", "==", activePin));
    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const data = docSnap.data();
        setGrupoDataCache(data);
        setGrupoDocRef(docSnap.ref);
        try {
          localStorage.setItem('brillando_grupo_cache', JSON.stringify(data));
        } catch (_) {}
      }
    });

    return () => unsubscribe();
  }, [activePin]);

  // ============================================================================
  // 2. ESCUCHADOR DE RANKING GLOBAL CON DESEMPATE POR TIEMPO
  // ============================================================================
  useEffect(() => {
    if (!activePin) return;

    const qTodos = query(collection(db, "grupos"));
    const unsubscribeRanking = onSnapshot(qTodos, (snap) => {
      const listaGrupos = snap.docs.map(doc => {
        const data = doc.data();
        return {
          pin: data.pin,
          puntos: Number(data.puntos || 0),
          tiempo: Number(data.ultimaActualizacionPuntos || Number.MAX_SAFE_INTEGER),
          rankingGuardado: data.ranking
        };
      });

      listaGrupos.sort((a, b) => {
        if (b.puntos !== a.puntos) return b.puntos - a.puntos;
        return a.tiempo - b.tiempo;
      });

      const index = listaGrupos.findIndex(g => g.pin === activePin);
      if (index !== -1 && listaGrupos[index].puntos > 0) {
        const puestoCalculado = index + 1;
        setRankingActual(puestoCalculado);

        if (grupoDocRef && listaGrupos[index].rankingGuardado !== puestoCalculado) {
          updateDoc(grupoDocRef, { ranking: puestoCalculado }).catch(() => {});
        }
      } else {
        setRankingActual('-');
      }
    });

    return () => unsubscribeRanking();
  }, [activePin, grupoDocRef]);

  // ============================================================================
  // 3. DETECTOR DE CONCURRENCIA ENTRE CAPITÁN 1 Y CAPITÁN 2
  // ============================================================================
  useEffect(() => {
    if (view === 'trivia' && juegoActivo && !isProcessing && !feedback) {
      const completados = (grupoDataCache?.juegosCompletados || []).map(Number);
      if (completados.includes(Number(juegoActivo.id))) {
        setFeedback({
          type: 'success',
          titulo: '¡SALA YA RESUELTA!',
          subtitulo: 'El otro Capitán acaba de superar este desafío'
        });

        const timer = setTimeout(() => {
          setFeedback(null);
          setJuegoActivo(null);
          setMostrarOpciones(false);
          setView('dashboard');
        }, 2800);
        return () => clearTimeout(timer);
      }

      if (grupoDataCache?.vidas !== undefined && grupoDataCache.vidas <= 0) {
        setFeedback({
          type: 'gameover',
          titulo: '¡ATRAPADOS!',
          subtitulo: 'Se agotaron las vidas del escuadrón.'
        });
      }
    }
  }, [grupoDataCache, view, juegoActivo, isProcessing, feedback]);

  // ============================================================================
  // TEMPORIZADOR DE 20 SEGUNDOS
  // ============================================================================
  useEffect(() => {
    let timerId;
    if (view === 'trivia' && juegoActivo && !isProcessing && !feedback) {
      if (timeLeft > 0) {
        timerId = setTimeout(() => {
          setTimeLeft(prev => prev - 1);
        }, 1000);
      } else {
        validarRespuesta(null, true);
      }
    }
    return () => clearTimeout(timerId);
  }, [view, juegoActivo, isProcessing, feedback, timeLeft]);

  // ============================================================================
  // 4. CREAR GRUPO (CAPITÁN 1)
  // ============================================================================
  const handleCrearGrupo = async (e) => {
    e.preventDefault();
    if (!nombreEquipo.trim()) return alert("Ingresá un nombre para tu escuadrón.");
    if (!nombreCapitan1.trim()) return alert("Ingresá tu nombre como Capitán 1.");
    
    setLoading(true);
    const nuevoPin = Math.floor(1000 + Math.random() * 9000).toString();
    const miDeviceId = obtenerDeviceId();
    const datosIniciales = {
      pin: nuevoPin,
      nombre: nombreEquipo.trim().toUpperCase(),
      capitan1: nombreCapitan1.trim().toUpperCase(),
      capitan2: 'PENDIENTE',
      puntos: 0,
      vidas: 3,
      ranking: '-',
      juegosCompletados: [],
      creadoEn: new Date(),
      ultimaActualizacionPuntos: 0,
      integrantes: 1,
      dispositivos: [miDeviceId]
    };
    
    try {
      const docRef = await ejecutarConTimeout(() =>
        addDoc(collection(db, "grupos"), datosIniciales)
      );
      setGrupoDocRef(docRef);
      setGrupoDataCache(datosIniciales);
      localStorage.setItem('brillando_grupo_cache', JSON.stringify(datosIniciales));
      setPinGenerado(nuevoPin);
      localStorage.setItem('miGrupoPIN', nuevoPin);
      localStorage.setItem('miRolCapitan', 'CAPITÁN 1: ' + nombreCapitan1.trim().toUpperCase());
      setActivePin(nuevoPin);
    } catch (error) {
      console.error("Error al crear grupo:", error);
      alert("Señal débil. Volvé a tocar el botón para reintentar.");
    }
    setLoading(false);
  };

  // ============================================================================
  // 5. COMPARTIR PIN POR WHATSAPP
  // ============================================================================
  const handleCompartirPin = async (pinParaCompartir) => {
    const codigo = pinParaCompartir || pinGenerado || activePin;
    const equipo = nombreEquipo ? nombreEquipo.trim().toUpperCase() : (grupoDataCache?.nombre || 'NUESTRO ESCUADRÓN');
    const cap1 = nombreCapitan1 ? nombreCapitan1.trim().toUpperCase() : (grupoDataCache?.capitan1 || 'CAPITÁN 1');

    const mensaje = 
`⚡ *¡ARMÉ EL ESCUADRÓN "${equipo}" PARA EL JUEGO DE BRILLANDO!* ⚡

🔑 *Código PIN:* ${codigo}
🌐 *Entrá acá para unirte:* https://brillando.vercel.app/juego

👥 *IMPORTANTE:* Cada equipo tiene *2 Capitanes* (Capitán 1 y Capitán 2).
• *Capitán 1:* ${cap1}
• *Capitán 2:* ¡Entrá al link, tocá "Ya tengo un PIN" y sumate!`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `Escuadrón ${equipo}`, text: mensaje });
      } catch (_) {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
    }
  };

  // ============================================================================
  // 6. UNIRSE AL GRUPO (CAPITÁN 2)
  // ============================================================================
  const handleUnirse = async (e) => {
    if (e) e.preventDefault();
    if (pinInput.length !== 4) return;
    if (!nombreCapitan2.trim()) return alert("Ingresá tu nombre de Capitán para continuar.");
    
    setLoading(true);
    const miDeviceId = obtenerDeviceId();
    const nombreCapLimpio = nombreCapitan2.trim().toUpperCase();

    try {
      const q = query(collection(db, "grupos"), where("pin", "==", pinInput));
      const querySnapshot = await ejecutarConTimeout(() => getDocs(q));

      if (querySnapshot.empty) {
        alert("ACCESO DENEGADO. El PIN ingresado no existe.");
      } else {
        const docSnap = querySnapshot.docs[0];
        const datosGrupo = docSnap.data();
        const dispositivosRegistrados = datosGrupo.dispositivos || [];
        const indiceDispositivo = dispositivosRegistrados.indexOf(miDeviceId);

        if (indiceDispositivo !== -1) {
          if (indiceDispositivo === 1 && datosGrupo.capitan2 === 'PENDIENTE') {
            await ejecutarConTimeout(() => updateDoc(docSnap.ref, { capitan2: nombreCapLimpio }));
          }
          setGrupoDocRef(docSnap.ref);
          setGrupoDataCache(datosGrupo);
          localStorage.setItem('miGrupoPIN', pinInput);
          localStorage.setItem('miRolCapitan', `CAPITÁN ${indiceDispositivo + 1}: ${nombreCapLimpio}`);
          setActivePin(pinInput);
          setView('dashboard');
        } else {
          const cupoActual = dispositivosRegistrados.length > 0 
            ? dispositivosRegistrados.length 
            : (datosGrupo.integrantes || 1);

          if (cupoActual >= 2) {
            alert("ACCESO DENEGADO. Este escuadrón ya tiene a sus 2 Capitanes conectados.");
          } else {
            await ejecutarConTimeout(() =>
              updateDoc(docSnap.ref, {
                integrantes: increment(1),
                dispositivos: arrayUnion(miDeviceId),
                capitan2: nombreCapLimpio
              })
            );
            setGrupoDocRef(docSnap.ref);
            setGrupoDataCache({ ...datosGrupo, capitan2: nombreCapLimpio });
            localStorage.setItem('miGrupoPIN', pinInput);
            localStorage.setItem('miRolCapitan', `CAPITÁN 2: ${nombreCapLimpio}`);
            setActivePin(pinInput);
            setView('dashboard');
          }
        }
      }
    } catch (error) {
      alert("Señal débil al buscar el grupo. Volvé a intentarlo.");
    }
    setLoading(false);
  };

  // ============================================================================
  // 7. APERTURA DE CÁMARA SEGURA
  // ============================================================================
  const handleAbrirEscanerSeguro = () => {
    if (scannerCooldown || isProcessing) return;
    setScannerCooldown(true);
    setCameraError(false);
    setCodigoManualInput('');
    setView('escaner');
    setTimeout(() => setScannerCooldown(false), 800);
  };

  // ============================================================================
  // 8. PROCESAR CÓDIGO DE JUEGO (DESDE QR O DESDE TECLADO MANUAL EN ANDROID)
  // ============================================================================
  const procesarCodigoJuego = async (textoCrudo) => {
    if (!textoCrudo || isProcessing) return;

    const baseJuego = buscarJuegoPorCodigo(textoCrudo);
    if (!baseJuego) {
      alert(`El código "${textoCrudo}" no corresponde a ningún juego activo.`);
      return;
    }

    const completados = (grupoDataCache?.juegosCompletados || []).map(Number);
    if (completados.includes(Number(baseJuego.id))) {
      alert(`⚠️ ¡JUEGO YA COMPLETADO!\nSu escuadrón ya sumó los puntos de "${baseJuego.titulo}". Busquen otra estación.`);
      setView('dashboard');
      return;
    }

    // Aseguramos la referencia de Firebase antes de continuar
    const refSegura = await asegurarGrupoDocRef();
    if (!refSegura) {
      alert("Reconectando con tu escuadrón... Tocá nuevamente para escanear.");
      return;
    }

    // CASO ESPECIAL 1: QR BONUS (+100 PTS)
    if (baseJuego.tipo === 'bonus') {
      setIsProcessing(true);
      try {
        await ejecutarConTimeout(() =>
          updateDoc(refSegura, {
            puntos: increment(Number(baseJuego.puntos)),
            juegosCompletados: arrayUnion(Number(baseJuego.id)),
            ultimaActualizacionPuntos: Date.now()
          })
        );
        setFeedback({
          type: 'success',
          titulo: `¡${baseJuego.titulo.toUpperCase()}!`,
          subtitulo: `+${baseJuego.puntos} PUNTOS GRATIS`
        });
        setTimeout(() => {
          setFeedback(null); setJuegoActivo(null); setMostrarOpciones(false); setIsProcessing(false); setView('dashboard');
        }, 2800);
      } catch (error) {
        alert("Señal débil al guardar el bonus. Intentá escanearlo de nuevo.");
        setIsProcessing(false);
      }
      return;
    }

    // CASO ESPECIAL 2: QR TRAMPA (-50 PTS)
    if (baseJuego.tipo === 'trampa') {
      setIsProcessing(true);
      try {
        const puntosActuales = Number(grupoDataCache?.puntos || 0);
        const puntosRestados = Math.max(0, puntosActuales - 50);

        await ejecutarConTimeout(() =>
          updateDoc(refSegura, {
            puntos: puntosRestados,
            juegosCompletados: arrayUnion(Number(baseJuego.id)),
            ultimaActualizacionPuntos: Date.now()
          })
        );
        setFeedback({
          type: 'error',
          titulo: '¡CAÍSTE EN LA TRAMPA!',
          subtitulo: '-50 PUNTOS'
        });
        setTimeout(() => {
          setFeedback(null); setJuegoActivo(null); setMostrarOpciones(false); setIsProcessing(false); setView('dashboard');
        }, 2800);
      } catch (error) {
        alert("Señal débil. Intentá de nuevo.");
        setIsProcessing(false);
      }
      return;
    }

    // CASO NORMAL: Sorteamos pregunta y abrimos la Trivia
    const randomIndex = Math.floor(Math.random() * baseJuego.preguntas.length);
    const preguntaSorteada = baseJuego.preguntas[randomIndex];

    setMostrarOpciones(false);
    setTimeLeft(20);
    setJuegoActivo({
      id: Number(baseJuego.id),
      titulo: baseJuego.titulo,
      icono: baseJuego.icono || '🎯',
      puntos: Number(baseJuego.puntos),
      tipo: baseJuego.tipo || 'normal',
      pregunta: preguntaSorteada.texto,
      opciones: preguntaSorteada.opciones,
      correcta: preguntaSorteada.correcta
    });
    
    setView('trivia');
  };

  const handleScan = (resultado) => {
    if (!resultado || isProcessing) return;
    const textoQR = Array.isArray(resultado) ? resultado[0]?.rawValue : (resultado?.text || resultado);
    if (textoQR) procesarCodigoJuego(textoQR);
  };

  // ============================================================================
  // 9. VALIDACIÓN DE TRIVIA BLINDADA (NUNCA PIERDE PUNTOS NI ESTADO)
  // ============================================================================
  const validarRespuesta = async (opcionSeleccionada, agotadoTiempo = false) => {
    if (isProcessing || !juegoActivo) return;
    setIsProcessing(true);

    try {
      const refSegura = await asegurarGrupoDocRef();
      if (!refSegura) {
        throw new Error("SIN_REFERENCIA");
      }

      const completados = (grupoDataCache?.juegosCompletados || []).map(Number);
      if (completados.includes(Number(juegoActivo.id))) {
        setFeedback({ type: 'success', titulo: '¡SALA YA RESUELTA!', subtitulo: 'El otro Capitán ya sumó estos puntos' });
        setTimeout(() => {
          setFeedback(null); setJuegoActivo(null); setMostrarOpciones(false); setIsProcessing(false); setView('dashboard');
        }, 2500);
        return;
      }

      // RESPUESTA CORRECTA
      if (!agotadoTiempo && opcionSeleccionada === juegoActivo.correcta) {
        const puntosDelJuego = Number(juegoActivo.puntos || 40);
        const idNumerico = Number(juegoActivo.id);

        await ejecutarConTimeout(() =>
          updateDoc(refSegura, {
            puntos: increment(puntosDelJuego),
            juegosCompletados: arrayUnion(idNumerico),
            ultimaActualizacionPuntos: Date.now()
          })
        );
        
        // Actualización optimista inmediata en la memoria local
        setGrupoDataCache((prev) => prev ? ({
          ...prev,
          puntos: Number(prev.puntos || 0) + puntosDelJuego,
          juegosCompletados: [...new Set([...(prev.juegosCompletados || []), idNumerico])]
        }) : prev);

        setFeedback({ type: 'success', titulo: '¡DESAFÍO SUPERADO!', subtitulo: `+${puntosDelJuego} PUNTOS` });
        
        setTimeout(() => {
          setFeedback(null); setJuegoActivo(null); setMostrarOpciones(false); setIsProcessing(false); setView('dashboard');
        }, 2600);

      } else {
        // RESPUESTA INCORRECTA O TIEMPO AGOTADO
        const vidasActuales = grupoDataCache?.vidas !== undefined ? Number(grupoDataCache.vidas) : 3;

        if (vidasActuales <= 1) {
          await ejecutarConTimeout(() =>
            updateDoc(refSegura, {
              puntos: 0,
              vidas: 0,
              ranking: '-',
              juegosCompletados: [],
              ultimaActualizacionPuntos: 0
            })
          );
          setFeedback({ type: 'gameover', titulo: '¡ATRAPADOS!', subtitulo: 'Se quedaron sin vidas.' });
          setIsProcessing(false);
        } else {
          const nuevasVidas = Math.max(1, vidasActuales - 1);
          await ejecutarConTimeout(() =>
            updateDoc(refSegura, { vidas: nuevasVidas })
          );
          
          setFeedback({
            type: 'error',
            titulo: agotadoTiempo ? 'TIEMPO AGOTADO' : 'RESPUESTA INCORRECTA',
            subtitulo: '-1 VIDA (Pueden reintentar el QR)'
          });
          
          setTimeout(() => {
            setFeedback(null); setJuegoActivo(null); setMostrarOpciones(false); setIsProcessing(false); setView('dashboard');
          }, 2600);
        }
      }
    } catch (error) {
      alert("⚠️ La señal del salón parpadeó. No te preocupes, tocá de nuevo tu respuesta para guardarla.");
      setIsProcessing(false);
    }
  };

  // ============================================================================
  // 10. REINICIO MANUAL DESPUÉS DE GAME OVER
  // ============================================================================
  const handleReiniciarMision = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const refSegura = await asegurarGrupoDocRef();
      if (refSegura) {
        await ejecutarConTimeout(() =>
          updateDoc(refSegura, {
            vidas: 3,
            puntos: 0,
            ranking: '-',
            juegosCompletados: [],
            ultimaActualizacionPuntos: 0
          })
        );
      }
      setFeedback(null); setJuegoActivo(null); setMostrarOpciones(false); setIsProcessing(false); setView('dashboard');
    } catch (error) {
      alert("Señal débil. Volvé a tocar para reiniciar.");
      setIsProcessing(false);
    }
  };

  // ================= VISTAS DE FEEDBACK =================
  if (feedback) {
    if (feedback.type === 'gameover') {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#050505] text-white">
          <div className="mb-6"><span className="text-8xl">🔒</span></div>
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-4 text-red-600">{feedback.titulo}</h1>
          <p className="text-base font-bold uppercase tracking-widest text-gray-400 mb-10">
            {feedback.subtitulo}<br/>
            <span className="text-white">Sus puntos y misiones vuelven a cero para que puedan seguir jugando.</span>
          </p>
          <button 
            onClick={handleReiniciarMision}
            disabled={isProcessing}
            className="w-full max-w-sm py-5 bg-red-600 text-white font-black text-sm uppercase tracking-widest rounded-full"
          >
            {isProcessing ? 'Reiniciando...' : 'Reiniciar Misión con 3 Vidas'}
          </button>
        </div>
      );
    }

    const isSuccess = feedback.type === 'success';
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center ${isSuccess ? 'bg-yellow-400 text-black' : 'bg-red-600 text-white'}`}>
        <div className="mb-6 animate-bounce">
          <span className="text-8xl">{isSuccess ? '⚡' : '❌'}</span>
        </div>
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-4 leading-none">{feedback.titulo}</h1>
        <h2 className={`text-xl font-black font-mono uppercase tracking-widest px-6 py-2 border-4 ${isSuccess ? 'border-black' : 'border-white'} rounded-full`}>
          {feedback.subtitulo}
        </h2>
      </div>
    );
  }
  
  // ================= VISTA: DASHBOARD DEL JUGADOR + CATÁLOGO DE 23 JUEGOS =================
  if (view === 'dashboard') {
    return (
      <DashboardJugador 
        grupoData={grupoDataCache}
        catalogoJuegos={LISTA_JUEGOS_OFICIAL}
        rankingEnVivo={rankingActual}
        onEscanear={handleAbrirEscanerSeguro} 
        onSalir={() => { 
          localStorage.removeItem('miGrupoPIN'); 
          localStorage.removeItem('brillando_grupo_cache');
          setActivePin('');
          setPinGenerado('');
          setPinInput('');
          setNombreEquipo('');
          setView('inicio'); 
        }} 
      />
    );
  }

  // ================= VISTA: ESCÁNER QR BLINDADO PARA ANDROID + CÓDIGO MANUAL =================
  if (view === 'escaner') {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center p-5">
        <h2 className="text-2xl font-black mb-1 text-yellow-400 tracking-widest uppercase mt-4">Escanear QR del Juego</h2>
        <p className="mb-4 text-gray-400 text-center text-xs">Apuntá al código QR de la mesa que acaban de ganar.</p>
        
        {!cameraError ? (
          <div className="w-full max-w-sm rounded-2xl overflow-hidden border-2 border-yellow-400 relative mb-5 bg-black aspect-square">
            <Scanner 
              onScan={handleScan}
              onError={() => setCameraError(true)}
              constraints={{ facingMode: { ideal: 'environment' } }}
              options={{ delayBetweenScanAttempts: 800 }} 
            />
            <div className="absolute top-1/2 left-0 w-full h-1 bg-yellow-400 shadow-[0_0_15px_#facc15] animate-pulse pointer-events-none"></div>
          </div>
        ) : (
          <div className="w-full max-w-sm rounded-2xl border-2 border-red-500 bg-red-950/30 p-5 text-center mb-5">
            <p className="font-black text-red-400 uppercase text-sm mb-2">⚠️ Tu navegador bloqueó la cámara</p>
            <p className="text-xs text-gray-300 leading-relaxed mb-3">
              Si abriste el link desde WhatsApp o Instagram, tocá los 3 puntitos arriba a la derecha y elegí <b>"Abrir en Chrome"</b>, o ingresá el código manual abajo:
            </p>
            <button
              type="button"
              onClick={() => setCameraError(false)}
              className="px-4 py-2 rounded-full bg-yellow-400 text-black font-black text-xs uppercase"
            >
              🔄 Reintentar abrir cámara
            </button>
          </div>
        )}

        {/* PLAN B INFALIBLE PARA ANDROID: INGRESO MANUAL DE CÓDIGO */}
        <form 
          onSubmit={(e) => { e.preventDefault(); procesarCodigoJuego(codigoManualInput); }}
          className="w-full max-w-sm bg-white/5 border border-white/15 rounded-2xl p-4 mb-6"
        >
          <label className="block font-mono text-[11px] uppercase tracking-wider text-yellow-400 font-bold mb-2">
            ⌨️ ¿No abre la cámara? Ingresá el código del QR:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ej: qr-14 o qr-tateti"
              value={codigoManualInput}
              onChange={(e) => setCodigoManualInput(e.target.value)}
              className="flex-1 bg-black border border-white/25 rounded-xl px-3 py-2.5 text-sm text-white font-mono uppercase focus:outline-none focus:border-yellow-400"
            />
            <button
              type="submit"
              className="bg-yellow-400 text-black font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider"
            >
              Entrar
            </button>
          </div>
        </form>

        <button 
          onClick={() => setView('dashboard')}
          className="w-full max-w-sm rounded-full border border-white/20 bg-white/5 py-4 text-sm font-bold uppercase tracking-widest mt-auto mb-4"
        >
          ← Volver a la lista de juegos
        </button>
      </div>
    );
  }

  // ================= VISTA: TRIVIA LIMPIA (SIN BOTÓN "i", YA QUE ESTÁ EN EL MODAL) =================
  if (view === 'trivia' && juegoActivo) {
    const vidasMostradas = grupoDataCache?.vidas !== undefined ? grupoDataCache.vidas : 3;

    return (
      <div className="min-h-screen bg-[#050505] text-white p-6 flex flex-col relative overflow-hidden">
        <header className="mb-6 mt-4 flex justify-between items-center relative z-10">
          <span className="font-mono text-sm tracking-widest uppercase text-yellow-400 font-bold">
            ⏱️ {timeLeft}s · +{juegoActivo.puntos} PTS
          </span>
          <div className="flex gap-1">
            {[1, 2, 3].map((vida) => (
              <span key={vida} className={`text-xl ${vida <= vidasMostradas ? 'opacity-100' : 'opacity-30'}`}>❤️</span>
            ))}
          </div>
        </header>

        {vidasMostradas === 1 && (
          <div className="bg-red-600 text-white p-3.5 rounded-xl mb-5 border-2 border-white/20 animate-pulse relative z-10 text-center">
            <h3 className="font-black uppercase text-base">¡CUIDADO! ÚLTIMA VIDA</h3>
            <p className="font-bold text-[11px] uppercase tracking-wider">Si fallan pierden los puntos acumulados.</p>
          </div>
        )}

        <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-800 z-0">
          <div 
            className={`h-full transition-all duration-1000 ease-linear ${timeLeft <= 5 ? 'bg-red-500' : 'bg-yellow-400'}`}
            style={{ width: `${(timeLeft / 20) * 100}%` }}
          ></div>
        </div>
        
        <div className={`transition-all duration-300 flex flex-col relative z-10 ${mostrarOpciones ? 'mt-0 mb-4' : 'my-auto py-6'}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-3xl">{juegoActivo.icono}</span>
            <h2 className="text-2xl font-black uppercase text-yellow-400">
              {juegoActivo.titulo}
            </h2>
          </div>

          <p className={`text-gray-100 leading-relaxed font-bold ${mostrarOpciones ? 'text-lg' : 'text-2xl'}`}>
            {juegoActivo.pregunta}
          </p>

          {timeLeft <= 5 && (
            <div className="text-center mt-4">
              <span className="text-5xl font-black text-red-500 animate-ping inline-block">
                {timeLeft}
              </span>
            </div>
          )}
        </div>
        
        {!mostrarOpciones ? (
          <div className="mt-auto mb-6 flex flex-col gap-3 relative z-10">
            <button
              type="button"
              onClick={() => setMostrarOpciones(true)}
              className="w-full rounded-full bg-yellow-400 py-5 text-sm font-black uppercase tracking-widest text-black shadow-[0_0_25px_rgba(250,204,21,0.3)] active:scale-95"
            >
              Ver Opciones ({timeLeft}s)
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-auto mb-4 relative z-10">
            {juegoActivo.opciones.map((op) => (
              <button 
                key={op.id}
                onClick={() => validarRespuesta(op.id, false)}
                disabled={isProcessing}
                className="text-left bg-[#141414] border-2 border-white/15 p-5 rounded-xl text-base font-bold active:bg-yellow-400 active:text-black transition-all disabled:opacity-50"
              >
                <span className="text-yellow-400 mr-2 font-black">{op.id.toUpperCase()}.</span> {op.texto}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ================= VISTAS DE ONBOARDING (INICIO / CREAR / UNIR) =================
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
              Cada escuadrón cuenta con <strong>2 Capitanes</strong> (Capitán 1 y Capitán 2, un dispositivo cada uno). Creá tu grupo o sumate con tu PIN.
            </p>
          </>
        )}

        {view === 'crear' && (
          <form onSubmit={!pinGenerado ? handleCrearGrupo : (e) => { e.preventDefault(); setView('dashboard'); }}>
            <h1 className="onb-title small">Capitán 1</h1>
            <p className="onb-desc">
              Nombrá a tu escuadrón y registrate como el <strong>Capitán 1</strong> (Dispositivo 1).
            </p>
            
            <input
              className="onb-pin-input"
              style={{ letterSpacing: 'normal', textAlign: 'left', fontSize: '20px', maxWidth: '300px', marginBottom: '12px' }}
              type="text"
              placeholder="Nombre del Escuadrón"
              value={nombreEquipo}
              onChange={(e) => setNombreEquipo(e.target.value)}
              required
              autoFocus
              disabled={!!pinGenerado} 
            />

            <input
              className="onb-pin-input"
              style={{ letterSpacing: 'normal', textAlign: 'left', fontSize: '20px', maxWidth: '300px' }}
              type="text"
              placeholder="Tu nombre (Capitán 1)"
              value={nombreCapitan1}
              onChange={(e) => setNombreCapitan1(e.target.value)}
              required
              disabled={!!pinGenerado} 
            />
            
            {pinGenerado && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ padding: '15px', background: 'var(--amarillo)', color: 'var(--tinta)', textAlign: 'center', fontSize: '32px', fontWeight: '900', letterSpacing: '10px', borderRadius: '12px' }}>
                  {pinGenerado}
                </div>
                <p style={{ fontSize: '12px', opacity: 0.8, marginTop: '8px', textAlign: 'center' }}>
                  Compartile este PIN al <strong>Capitán 2</strong> para que conecte el segundo dispositivo:
                </p>
                <button 
                  type="button"
                  onClick={() => handleCompartirPin(pinGenerado)}
                  className="onb-btn secondary"
                  style={{ marginTop: '10px', width: '100%', borderColor: 'var(--amarillo)', color: 'var(--amarillo)', fontWeight: 'bold' }}
                >
                  📲 Compartir PIN y Link por WhatsApp
                </button>
              </div>
            )}

            {!pinGenerado ? (
              <button type="submit" className="onb-btn primary mt-8" style={{ marginTop: '24px' }} disabled={loading}>
                {loading ? 'Generando...' : 'Crear y Generar PIN'}
              </button>
            ) : (
              <button type="button" className="onb-btn primary mt-8" style={{ marginTop: '14px' }} onClick={() => setView('dashboard')}>
                Entrar a la Sala
              </button>
            )}
            
            <button type="button" className="onb-btn text-only" style={{ marginTop: '10px' }} onClick={() => { setView('inicio'); setPinGenerado(''); }}>
              Volver
            </button>
          </form>
        )}

        {view === 'unir' && (
          <form onSubmit={handleUnirse}>
            <h1 className="onb-title small">Capitán 2</h1>
            <p className="onb-desc">
              Ingresá tu nombre como <strong>Capitán 2</strong> (Dispositivo 2) y el PIN de 4 dígitos que te pasó el Capitán 1.
            </p>
            <input
              className="onb-pin-input"
              style={{ letterSpacing: 'normal', textAlign: 'left', fontSize: '20px', maxWidth: '300px', marginBottom: '14px' }}
              type="text"
              placeholder="Tu nombre (Capitán 2)"
              value={nombreCapitan2}
              onChange={(e) => setNombreCapitan2(e.target.value)}
              required
              autoFocus
            />
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
            />
          </form>
        )}
      </div>

      <div className="onb-actions">
        {view === 'inicio' && (
          <>
            <button className="onb-btn primary" onClick={() => setView('crear')}>
              Crear grupo (Capitán 1)
            </button>
            <button className="onb-btn secondary" onClick={() => setView('unir')}>
              Ya tengo un PIN (Capitán 2)
            </button>
          </>
        )}

        {view === 'unir' && (
          <>
            <button 
              className="onb-btn primary" 
              onClick={handleUnirse}
              disabled={loading || pinInput.length !== 4 || !nombreCapitan2.trim()}
            >
              {loading ? 'Sincronizando...' : 'Sincronizar como Capitán 2'}
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