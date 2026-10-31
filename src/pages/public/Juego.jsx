import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, updateDoc, increment, arrayUnion, onSnapshot } from "firebase/firestore";
import { Scanner } from '@yudiel/react-qr-scanner';
import { db } from '../../config/firebase';
import DashboardJugador from './DashboardJugador';
import './Juego.css';

// ============================================================================
// 🔒 BLOQUEO HORARIO DEL ESCÁNER QR (CONTROL RÁPIDO)
// - Se desbloquea automáticamente el Sábado 31/10 a las 16:30 hs.
// - Si querés desbloquearlo antes manualmente, cambiá `false` por `true` acá abajo:
// ============================================================================
const FORZAR_DESBLOQUEO_ESCANER = true;
const FECHA_APERTURA_ESCANER = new Date('2026-10-31T16:30:00-03:00');

const estaEscanerHabilitado = () => {
  if (FORZAR_DESBLOQUEO_ESCANER) return true;
  return new Date() >= FECHA_APERTURA_ESCANER;
};

// ============================================================================
// CATÁLOGO OFICIAL DE LOS 23 JUEGOS DEL CONGRESO
// - `codigoQR` y `aliases`: SOLO funcionan escaneando con la cámara.
// - `codigoEncargado`: Clave secreta que SOLO sabe el encargado de la mesa
//   para dársela al grupo si no les abre la cámara (Anti-Trampa).
// ============================================================================
export const LISTA_JUEGOS_OFICIAL = [
  {
    id: 1,
    codigoQR: 'qr-1',
    aliases: ['qr-cronometro', 'crono'],
    codigoEncargado: 'RELOJ84',
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
        texto: 'En matemática, ¿cómo se llama la famosa fórmula x = [-b ± √(b² - 4ac)] / (2a) usada para resolver ecuaciones de segundo grado?',
        opciones: [
          { id: 'a', texto: 'Fórmula de Bhaskara (o Resolvente)' },
          { id: 'b', texto: 'Teorema de Thales' },
          { id: 'c', texto: 'Regla de Ruffini' }
        ],
        correcta: 'a'
      },
      {
        texto: 'En la Tabla Periódica de los elementos, ¿qué elemento químico tiene el símbolo "Au"?',
        opciones: [
          { id: 'a', texto: 'Plata' },
          { id: 'b', texto: 'Oro' },
          { id: 'c', texto: 'Aluminio' }
        ],
        correcta: 'b'
      },
      {
        texto: 'En la final del Mundial de Qatar 2022 entre Argentina y Francia, ¿cómo salió el partido al terminar los 120 minutos (antes de los penales)?',
        opciones: [
          { id: 'a', texto: '2 a 2' },
          { id: 'b', texto: '3 a 3' },
          { id: 'c', texto: '4 a 3' }
        ],
        correcta: 'b'
      },
      {
        texto: 'En física cinemática, ¿qué magnitud se calcula con la fórmula d = v · t (velocidad multiplicada por tiempo)?',
        opciones: [
          { id: 'a', texto: 'La aceleración' },
          { id: 'b', texto: 'La distancia recorrida' },
          { id: 'c', texto: 'La energía cinética' }
        ],
        correcta: 'b'
      },
      {
        texto: '¿Cuál es el resultado exacto de la operación combinada: 2³ + √144 ÷ 3 ?',
        opciones: [
          { id: 'a', texto: '12' },
          { id: 'b', texto: '10' },
          { id: 'c', texto: '6' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 2,
    codigoQR: 'qr-2',
    aliases: ['qr-basquet', 'basquet'],
    codigoEncargado: 'ARO39',
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
        texto: 'En geometría, ¿a qué figura corresponde la fórmula de área A = π · r² (Pi por radio al cuadrado)?',
        opciones: [
          { id: 'a', texto: 'Al área de un círculo' },
          { id: 'b', texto: 'Al volumen de una esfera' },
          { id: 'c', texto: 'Al perímetro de un triángulo' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cuál es el símbolo químico del Sodio en la Tabla Periódica?',
        opciones: [
          { id: 'a', texto: 'So' },
          { id: 'b', texto: 'Na' },
          { id: 'c', texto: 'Sd' }
        ],
        correcta: 'b'
      },
      {
        texto: '¿Qué club europeo ganó la UEFA Champions League de la temporada 2022/2023 venciendo al Inter en la final con gol de Rodri?',
        opciones: [
          { id: 'a', texto: 'Real Madrid' },
          { id: 'b', texto: 'Manchester City' },
          { id: 'c', texto: 'Bayern Múnich' }
        ],
        correcta: 'b'
      },
      {
        texto: 'En básquet profesional (FIBA), ¿a qué altura reglamentaria del suelo se encuentra el aro?',
        opciones: [
          { id: 'a', texto: 'A 3,05 metros' },
          { id: 'b', texto: 'A 2,75 metros' },
          { id: 'c', texto: 'A 3,50 metros' }
        ],
        correcta: 'a'
      },
      {
        texto: 'En un triángulo rectángulo cuyos catetos miden 3 cm y 4 cm, ¿cuánto mide su hipotenusa según Pitágoras?',
        opciones: [
          { id: 'a', texto: '7 cm' },
          { id: 'b', texto: '5 cm' },
          { id: 'c', texto: '6 cm' }
        ],
        correcta: 'b'
      }
    ]
  },
  {
    id: 3,
    codigoQR: 'qr-3',
    aliases: ['qr-vasitos', 'pasajero'],
    codigoEncargado: 'TREN71',
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
        texto: '¿Qué ley fundamental de la física se expresa mediante la fórmula F = m · a (Fuerza = masa por aceleración)?',
        opciones: [
          { id: 'a', texto: 'La Segunda Ley de Newton' },
          { id: 'b', texto: 'El Principio de Arquímedes' },
          { id: 'c', texto: 'La Ley de Ohm' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cuál es el símbolo químico del Hierro en la Tabla Periódica?',
        opciones: [
          { id: 'a', texto: 'Hi' },
          { id: 'b', texto: 'Fe' },
          { id: 'c', texto: 'Ir' }
        ],
        correcta: 'b'
      },
      {
        texto: '¿Quién es el máximo goleador histórico de la Selección Argentina de fútbol?',
        opciones: [
          { id: 'a', texto: 'Gabriel Batistuta' },
          { id: 'b', texto: 'Lionel Messi' },
          { id: 'c', texto: 'Sergio Agüero' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Si despejás la "x" en la ecuación 3x - 7 = 20, ¿cuál es el valor de x?',
        opciones: [
          { id: 'a', texto: 'x = 9' },
          { id: 'b', texto: 'x = 7' },
          { id: 'c', texto: 'x = 11' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cuál es el único metal que se encuentra en estado líquido a temperatura ambiente?',
        opciones: [
          { id: 'a', texto: 'El Plomo (Pb)' },
          { id: 'b', texto: 'El Mercurio (Hg)' },
          { id: 'c', texto: 'El Titanio (Ti)' }
        ],
        correcta: 'b'
      }
    ]
  },
  {
    id: 4,
    codigoQR: 'qr-4',
    aliases: ['qr-ppt', 'ppt'],
    codigoEncargado: 'MANO52',
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
        texto: '¿Cuál es el símbolo químico del Potasio en la Tabla Periódica?',
        opciones: [
          { id: 'a', texto: 'Po' },
          { id: 'b', texto: 'K' },
          { id: 'c', texto: 'Pt' }
        ],
        correcta: 'b'
      },
      {
        texto: 'En trigonometría, dentro de un triángulo rectángulo, ¿cómo se define el Seno de un ángulo (sen α)?',
        opciones: [
          { id: 'a', texto: 'Cateto Opuesto sobre Hipotenusa' },
          { id: 'b', texto: 'Cateto Adyacente sobre Hipotenusa' },
          { id: 'c', texto: 'Cateto Opuesto sobre Cateto Adyacente' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Qué selección ganó la Copa América 2024 disputada en Estados Unidos con gol de Lautaro Martínez en el alargue?',
        opciones: [
          { id: 'a', texto: 'Colombia' },
          { id: 'b', texto: 'Argentina' },
          { id: 'c', texto: 'Uruguay' }
        ],
        correcta: 'b'
      },
      {
        texto: '¿A qué compuesto químico corresponde la fórmula molecular CO₂?',
        opciones: [
          { id: 'a', texto: 'Monóxido de carbono' },
          { id: 'b', texto: 'Dióxido de carbono' },
          { id: 'c', texto: 'Agua oxigenada' }
        ],
        correcta: 'b'
      },
      {
        texto: 'En probabilidad, si tirás dos monedas al aire al mismo tiempo, ¿cuál es la probabilidad de que ambas salgan "Cara"?',
        opciones: [
          { id: 'a', texto: '1/2 (50%)' },
          { id: 'b', texto: '1/4 (25%)' },
          { id: 'c', texto: '1/3 (33,3%)' }
        ],
        correcta: 'b'
      }
    ]
  },
  {
    id: 5,
    codigoQR: 'qr-5',
    aliases: ['qr-aro', 'emboca'],
    codigoEncargado: 'ARO96',
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
        texto: 'En electricidad, ¿cómo se llama la ley cuya fórmula es V = I · R (Voltaje = Intensidad de corriente por Resistencia)?',
        opciones: [
          { id: 'a', texto: 'Ley de Ohm' },
          { id: 'b', texto: 'Ley de Coulomb' },
          { id: 'c', texto: 'Ley de Faraday' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cuál es el primer elemento de la Tabla Periódica (con número atómico 1)?',
        opciones: [
          { id: 'a', texto: 'Helio (He)' },
          { id: 'b', texto: 'Hidrógeno (H)' },
          { id: 'c', texto: 'Litio (Li)' }
        ],
        correcta: 'b'
      },
      {
        texto: '¿En qué club de Estados Unidos juega Lionel Messi tras su paso por el PSG?',
        opciones: [
          { id: 'a', texto: 'Los Angeles Galaxy' },
          { id: 'b', texto: 'Inter Miami' },
          { id: 'c', texto: 'New York City FC' }
        ],
        correcta: 'b'
      },
      {
        texto: 'En álgebra, ¿a qué es igual el desarrollo del binomio al cuadrado (a + b)² ?',
        opciones: [
          { id: 'a', texto: 'a² + b²' },
          { id: 'b', texto: 'a² + 2ab + b²' },
          { id: 'c', texto: '2a + 2b' }
        ],
        correcta: 'b'
      },
      {
        texto: '¿Cuántos grados suman siempre los tres ángulos interiores de cualquier triángulo?',
        opciones: [
          { id: 'a', texto: '180°' },
          { id: 'b', texto: '360°' },
          { id: 'c', texto: '90°' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 6,
    codigoQR: 'qr-6',
    aliases: ['qr-bowling-pinos', 'bowling1'],
    codigoEncargado: 'PINO43',
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
        texto: '¿Qué elemento químico tiene el símbolo "Ag" en la Tabla Periódica?',
        opciones: [
          { id: 'a', texto: 'Argón' },
          { id: 'b', texto: 'Plata' },
          { id: 'c', texto: 'Azufre' }
        ],
        correcta: 'b'
      },
      {
        texto: '¿Con qué fórmula se calcula el área de un triángulo de base "b" y altura "h"?',
        opciones: [
          { id: 'a', texto: '(b · h) / 2' },
          { id: 'b', texto: 'b · h' },
          { id: 'c', texto: '2 · (b + h)' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Qué número de camiseta usó Emiliano "Dibu" Martínez al consagrarse campeón del mundo en Qatar 2022?',
        opciones: [
          { id: 'a', texto: 'El 1' },
          { id: 'b', texto: 'El 23' },
          { id: 'c', texto: 'El 12' }
        ],
        correcta: 'b'
      },
      {
        texto: 'En matemática, ¿cuál es el valor del logaritmo en base 10 de 1000 (log₁₀ 1000)?',
        opciones: [
          { id: 'a', texto: '3' },
          { id: 'b', texto: '10' },
          { id: 'c', texto: '100' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cuál es el gas más abundante en la atmósfera de la Tierra (aproximadamente el 78% del aire)?',
        opciones: [
          { id: 'a', texto: 'Oxígeno (O₂)' },
          { id: 'b', texto: 'Nitrógeno (N₂)' },
          { id: 'c', texto: 'Dióxido de carbono (CO₂)' }
        ],
        correcta: 'b'
      }
    ]
  },
  {
    id: 7,
    codigoQR: 'qr-7',
    aliases: ['qr-dados', 'dados'],
    codigoEncargado: 'DADO68',
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
        texto: 'En un dado estándar de 6 caras, las caras opuestas siempre suman el mismo número. ¿Cuánto suman dos caras opuestas?',
        opciones: [
          { id: 'a', texto: 'Suman 7' },
          { id: 'b', texto: 'Suman 6' },
          { id: 'c', texto: 'Suman 8' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cuál es la fórmula para calcular el volumen de un cubo de arista "L"?',
        opciones: [
          { id: 'a', texto: 'V = 6 · L²' },
          { id: 'b', texto: 'V = L³' },
          { id: 'c', texto: 'V = L · 3' }
        ],
        correcta: 'b'
      },
      {
        texto: '¿Qué elemento de la Tabla Periódica tiene el símbolo "Cu"?',
        opciones: [
          { id: 'a', texto: 'Carbono' },
          { id: 'b', texto: 'Cobre' },
          { id: 'c', texto: 'Calcio' }
        ],
        correcta: 'b'
      },
      {
        texto: '¿Qué jugador argentino convirtió el penal definitivo en la tanda contra Francia en la final del Mundial 2022?',
        opciones: [
          { id: 'a', texto: 'Gonzalo Montiel' },
          { id: 'b', texto: 'Leandro Paredes' },
          { id: 'c', texto: 'Paulo Dybala' }
        ],
        correcta: 'a'
      },
      {
        texto: 'En matemática, ¿cuánto vale el factorial de 5 (escrito como 5!, es decir 5×4×3×2×1)?',
        opciones: [
          { id: 'a', texto: '120' },
          { id: 'b', texto: '60' },
          { id: 'c', texto: '25' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 8,
    codigoQR: 'qr-8',
    aliases: ['qr-tejo', 'tejo', 'qr-arco'],
    codigoEncargado: 'TEJO29',
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
        texto: '¿Qué físico formuló la famosa ecuación de equivalencia entre masa y energía E = m · c²?',
        opciones: [
          { id: 'a', texto: 'Isaac Newton' },
          { id: 'b', texto: 'Albert Einstein' },
          { id: 'c', texto: 'Nikola Tesla' }
        ],
        correcta: 'b'
      },
      {
        texto: 'En la Tabla Periódica, ¿a qué grupo pertenecen el Helio (He), el Neón (Ne) y el Argón (Ar)?',
        opciones: [
          { id: 'a', texto: 'Gases Nobles' },
          { id: 'b', texto: 'Metales Alcalinos' },
          { id: 'c', texto: 'Halógenos' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cuál es el club con más títulos de la UEFA Champions League en toda la historia?',
        opciones: [
          { id: 'a', texto: 'AC Milan' },
          { id: 'b', texto: 'Real Madrid' },
          { id: 'c', texto: 'FC Barcelona' }
        ],
        correcta: 'b'
      },
      {
        texto: '¿Cómo se calcula el perímetro (longitud de la circunferencia) de un círculo de radio "r"?',
        opciones: [
          { id: 'a', texto: 'P = 2 · π · r' },
          { id: 'b', texto: 'P = π · r²' },
          { id: 'c', texto: 'P = 4 · π · r' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cuál es el resultado de (3² + 4²) ÷ 5 ?',
        opciones: [
          { id: 'a', texto: '5' },
          { id: 'b', texto: '7' },
          { id: 'c', texto: '25' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 9,
    codigoQR: 'qr-9',
    aliases: ['qr-pasavasos', 'pasavasos'],
    codigoEncargado: 'VASO15',
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
        texto: '¿Cuál es la fórmula química de la sal de mesa común?',
        opciones: [
          { id: 'a', texto: 'NaCl (Cloruro de sodio)' },
          { id: 'b', texto: 'H₂SO₄' },
          { id: 'c', texto: 'CaCO₃' }
        ],
        correcta: 'a'
      },
      {
        texto: 'En geometría, ¿con qué fórmula se calcula el volumen de un cilindro de radio "r" y altura "h"?',
        opciones: [
          { id: 'a', texto: 'V = π · r² · h' },
          { id: 'b', texto: 'V = 2 · π · r · h' },
          { id: 'c', texto: 'V = (π · r² · h) / 3' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿En qué club inglés brilló Julián Álvarez antes de ser transferido al Atlético de Madrid en 2024?',
        opciones: [
          { id: 'a', texto: 'Liverpool' },
          { id: 'b', texto: 'Manchester City' },
          { id: 'c', texto: 'Chelsea' }
        ],
        correcta: 'b'
      },
      {
        texto: 'En la escala de pH químico (que va de 0 a 14), ¿qué valor corresponde a una sustancia neutra como el agua pura?',
        opciones: [
          { id: 'a', texto: 'pH = 7' },
          { id: 'b', texto: 'pH = 0' },
          { id: 'c', texto: 'pH = 14' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Si el 20% de un número es 30, ¿cuál es ese número?',
        opciones: [
          { id: 'a', texto: '150' },
          { id: 'b', texto: '120' },
          { id: 'c', texto: '600' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 10,
    codigoQR: 'qr-10',
    aliases: ['qr-malabarista', 'malabarista'],
    codigoEncargado: 'AIRE64',
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
        texto: '¿Con qué gas noble (cuyo símbolo es "He") se inflan los globos para que floten hacia el techo?',
        opciones: [
          { id: 'a', texto: 'Hidrógeno' },
          { id: 'b', texto: 'Helio' },
          { id: 'c', texto: 'Nitrógeno' }
        ],
        correcta: 'b'
      },
      {
        texto: 'En la Tierra, ¿cuál es el valor aproximado de la aceleración de la gravedad (g)?',
        opciones: [
          { id: 'a', texto: '9,8 m/s²' },
          { id: 'b', texto: '3,14 m/s²' },
          { id: 'c', texto: '15,2 m/s²' }
        ],
        correcta: 'a'
      },
      {
        texto: 'En una función lineal de fórmula y = m·x + b, ¿qué representa la letra "m"?',
        opciones: [
          { id: 'a', texto: 'La pendiente de la recta' },
          { id: 'b', texto: 'La ordenada al origen' },
          { id: 'c', texto: 'El vértice de la parábola' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cuántas Copas del Mundo de la FIFA tiene la Selección de Brasil en su historia?',
        opciones: [
          { id: 'a', texto: '4 Mundiales' },
          { id: 'b', texto: '5 Mundiales' },
          { id: 'c', texto: '3 Mundiales' }
        ],
        correcta: 'b'
      },
      {
        texto: 'En la ecuación de los gases ideales P · V = n · R · T, ¿qué representan las letras P y V?',
        opciones: [
          { id: 'a', texto: 'Peso y Velocidad' },
          { id: 'b', texto: 'Presión y Volumen' },
          { id: 'c', texto: 'Potencia y Voltaje' }
        ],
        correcta: 'b'
      }
    ]
  },
  {
    id: 11,
    codigoQR: 'qr-11',
    aliases: ['qr-aldente', 'aldente'],
    codigoEncargado: 'PASTA81',
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
        texto: '¿A qué compuesto orgánico fundamental para la energía del cuerpo corresponde la fórmula C₆H₁₂O₆?',
        opciones: [
          { id: 'a', texto: 'A la Glucosa' },
          { id: 'b', texto: 'Al Etanol' },
          { id: 'c', texto: 'Al Metano' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cuál es el único número primo que además es un número par?',
        opciones: [
          { id: 'a', texto: 'El 2' },
          { id: 'b', texto: 'El 4' },
          { id: 'c', texto: 'El 0' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿En qué club italiano fue capitán y goleador Lautaro Martínez al consagrarse campeón de la Serie A 2023/2024?',
        opciones: [
          { id: 'a', texto: 'AC Milan' },
          { id: 'b', texto: 'Inter de Milán' },
          { id: 'c', texto: 'Juventus' }
        ],
        correcta: 'b'
      },
      {
        texto: '¿Qué elemento de la Tabla Periódica tiene el símbolo "Ca" y es clave para los huesos?',
        opciones: [
          { id: 'a', texto: 'Carbono' },
          { id: 'b', texto: 'Calcio' },
          { id: 'c', texto: 'Cadmio' }
        ],
        correcta: 'b'
      },
      {
        texto: 'En análisis matemático, ¿cuál es la derivada de la función f(x) = x² ?',
        opciones: [
          { id: 'a', texto: "f'(x) = 2x" },
          { id: 'b', texto: "f'(x) = x" },
          { id: 'c', texto: "f'(x) = x³ / 3" }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 12,
    codigoQR: 'qr-12',
    aliases: ['qr-tateti-ppt', 'tatetippt'],
    codigoEncargado: 'DUELO37',
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
        texto: 'En álgebra, ¿cómo se llama la identidad notable a² - b² = (a - b) · (a + b)?',
        opciones: [
          { id: 'a', texto: 'Diferencia de cuadrados' },
          { id: 'b', texto: 'Trinomio cuadrado perfecto' },
          { id: 'c', texto: 'Factor común por grupos' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Qué elemento químico tiene el símbolo "Pb" en la Tabla Periódica?',
        opciones: [
          { id: 'a', texto: 'Platino' },
          { id: 'b', texto: 'Plomo' },
          { id: 'c', texto: 'Potasio' }
        ],
        correcta: 'b'
      },
      {
        texto: '¿Qué selección europea ganó la Eurocopa 2024 tras vencer 2-1 a Inglaterra en la final?',
        opciones: [
          { id: 'a', texto: 'Francia' },
          { id: 'b', texto: 'España' },
          { id: 'c', texto: 'Alemania' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Si una matriz cuadrada de 2x2 tiene filas [3, 1] y [2, 4], ¿cuál es su determinante (3·4 - 1·2)?',
        opciones: [
          { id: 'a', texto: '10' },
          { id: 'b', texto: '14' },
          { id: 'c', texto: '12' }
        ],
        correcta: 'a'
      },
      {
        texto: 'En física, ¿a qué magnitud corresponde la fórmula Ec = ½ · m · v²?',
        opciones: [
          { id: 'a', texto: 'Energía Cinética' },
          { id: 'b', texto: 'Energía Potencial Gravitatoria' },
          { id: 'c', texto: 'Trabajo Mecánico' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 13,
    codigoQR: 'qr-13',
    aliases: ['qr-tuerca', 'tuerca'],
    codigoEncargado: 'METAL92',
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
        texto: 'El acero es una aleación formada principalmente por Hierro (Fe) y un pequeño porcentaje de... ¿qué otro elemento?',
        opciones: [
          { id: 'a', texto: 'Carbono (C)' },
          { id: 'b', texto: 'Calcio (Ca)' },
          { id: 'c', texto: 'Cloro (Cl)' }
        ],
        correcta: 'a'
      },
      {
        texto: 'En física, ¿cómo se calcula el Torque o Momento de una fuerza (τ) aplicado con una llave sobre una tuerca?',
        opciones: [
          { id: 'a', texto: 'Fuerza por distancia al eje (F · d)' },
          { id: 'b', texto: 'Masa dividido volumen (m / V)' },
          { id: 'c', texto: 'Velocidad sobre tiempo (v / t)' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Qué delantero noruego del Manchester City rompió el récord de goles en una sola temporada de Premier League en 2023?',
        opciones: [
          { id: 'a', texto: 'Martin Ødegaard' },
          { id: 'b', texto: 'Erling Haaland' },
          { id: 'c', texto: 'Alexander Sørloth' }
        ],
        correcta: 'b'
      },
      {
        texto: '¿Cuántos lados tiene un hexágono regular (la forma clásica de una tuerca)?',
        opciones: [
          { id: 'a', texto: '6 lados' },
          { id: 'b', texto: '8 lados' },
          { id: 'c', texto: '5 lados' }
        ],
        correcta: 'a'
      },
      {
        texto: 'En matemática, todo número (distinto de cero) elevado a la potencia 0 (por ejemplo, 25⁰) da como resultado:',
        opciones: [
          { id: 'a', texto: '0' },
          { id: 'b', texto: '1' },
          { id: 'c', texto: 'El mismo número' }
        ],
        correcta: 'b'
      }
    ]
  },
  {
    id: 14,
    codigoQR: 'qr-14',
    aliases: ['qr-tateti', 'tateti'],
    codigoEncargado: 'CRUZ58',
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
        texto: '¿Cuál es el nombre del teorema cuya fórmula es a² + b² = c² para triángulos rectángulos?',
        opciones: [
          { id: 'a', texto: 'Teorema de Pitágoras' },
          { id: 'b', texto: 'Teorema de Euclides' },
          { id: 'c', texto: 'Teorema de Gauss' }
        ],
        correcta: 'a'
      },
      {
        texto: 'En la Tabla Periódica, ¿qué elemento tiene el símbolo "W" (conocido también como Wolframio)?',
        opciones: [
          { id: 'a', texto: 'Tungsteno' },
          { id: 'b', texto: 'Bismuto' },
          { id: 'c', texto: 'Vanadio' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cuántos Balones de Oro ganó Lionel Messi a lo largo de su carrera hasta 2024?',
        opciones: [
          { id: 'a', texto: '7 Balones de Oro' },
          { id: 'b', texto: '8 Balones de Oro' },
          { id: 'c', texto: '6 Balones de Oro' }
        ],
        correcta: 'b'
      },
      {
        texto: 'En la famosa sucesión de Fibonacci (1, 1, 2, 3, 5, 8, 13...), ¿qué número sigue después del 13?',
        opciones: [
          { id: 'a', texto: '21' },
          { id: 'b', texto: '18' },
          { id: 'c', texto: '26' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿A qué es igual la raíz cúbica de 27 (∛27)?',
        opciones: [
          { id: 'a', texto: '3' },
          { id: 'b', texto: '9' },
          { id: 'c', texto: '6' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 15,
    codigoQR: 'qr-15',
    aliases: ['qr-rompecabezas', 'rompecabezas'],
    codigoEncargado: 'PIEZA47',
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
        texto: '¿Qué elemento químico es la base fundamental de toda la química orgánica y de los diamantes (símbolo "C")?',
        opciones: [
          { id: 'a', texto: 'Carbono' },
          { id: 'b', texto: 'Cobalto' },
          { id: 'c', texto: 'Cromo' }
        ],
        correcta: 'a'
      },
      {
        texto: 'En geometría, ¿cuánto suman los ángulos interiores de cualquier cuadrilátero (como un rectángulo o un rombo)?',
        opciones: [
          { id: 'a', texto: '180°' },
          { id: 'b', texto: '360°' },
          { id: 'c', texto: '270°' }
        ],
        correcta: 'b'
      },
      {
        texto: '¿Qué mediocampista argentino fue elegido "Mejor Jugador Joven" del Mundial de Qatar 2022?',
        opciones: [
          { id: 'a', texto: 'Enzo Fernández' },
          { id: 'b', texto: 'Alexis Mac Allister' },
          { id: 'c', texto: 'Thiago Almada' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Con qué fórmula se calcula el área de un trapecio de base mayor "B", base menor "b" y altura "h"?',
        opciones: [
          { id: 'a', texto: '[(B + b) · h] / 2' },
          { id: 'b', texto: 'B · b · h' },
          { id: 'c', texto: '(B - b) / h' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿En qué parte del átomo se encuentran los protones y los neutrones?',
        opciones: [
          { id: 'a', texto: 'En el núcleo atómico' },
          { id: 'b', texto: 'En la nube electrónica exterior' },
          { id: 'c', texto: 'Fuera del átomo' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 16,
    codigoQR: 'qr-16',
    aliases: ['qr-piramide', 'piramide'],
    codigoEncargado: 'CIMA76',
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
        texto: 'En geometría espacial, ¿cuál es la fórmula para calcular el volumen de una pirámide con área de base "Ab" y altura "h"?',
        opciones: [
          { id: 'a', texto: 'V = (Ab · h) / 3' },
          { id: 'b', texto: 'V = Ab · h' },
          { id: 'c', texto: 'V = (Ab · h) / 2' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Usando la fórmula de Gauss n·(n+1)/2, ¿cuánto da la suma de los números del 1 al 7 (1+2+3+4+5+6+7)?',
        opciones: [
          { id: 'a', texto: '28' },
          { id: 'b', texto: '21' },
          { id: 'c', texto: '35' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Qué elemento químico tiene el símbolo "Sn" en la Tabla Periódica?',
        opciones: [
          { id: 'a', texto: 'Selenio' },
          { id: 'b', texto: 'Estaño' },
          { id: 'c', texto: 'Estroncio' }
        ],
        correcta: 'b'
      },
      {
        texto: '¿Qué selección sudamericana es la máxima ganadora histórica de la Copa América junto con Argentina?',
        opciones: [
          { id: 'a', texto: 'Uruguay' },
          { id: 'b', texto: 'Brasil' },
          { id: 'c', texto: 'Chile' }
        ],
        correcta: 'a'
      },
      {
        texto: 'En trigonometría, ¿cuánto vale el Coseno de 0° (cos 0°)?',
        opciones: [
          { id: 'a', texto: '1' },
          { id: 'b', texto: '0' },
          { id: 'c', texto: '-1' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 17,
    codigoQR: 'qr-17',
    aliases: ['qr-memoria', 'memoria'],
    codigoEncargado: 'MENTE23',
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
        texto: '¿Cuáles son los primeros 5 dígitos decimales del número irracional Pi (π = 3, ...)?',
        opciones: [
          { id: 'a', texto: '3,14159...' },
          { id: 'b', texto: '3,14951...' },
          { id: 'c', texto: '3,15149...' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Qué elemento químico tiene el símbolo "P" en la Tabla Periódica?',
        opciones: [
          { id: 'a', texto: 'Potasio' },
          { id: 'b', texto: 'Fósforo' },
          { id: 'c', texto: 'Plata' }
        ],
        correcta: 'b'
      },
      {
        texto: '¿En qué año ganó Argentina su segundo Mundial de fútbol en México con Diego Maradona como capitán?',
        opciones: [
          { id: 'a', texto: 'En 1978' },
          { id: 'b', texto: 'En 1986' },
          { id: 'c', texto: 'En 1990' }
        ],
        correcta: 'b'
      },
      {
        texto: 'En informática y matemática binaria, ¿a qué número decimal equivale el código binario 1010?',
        opciones: [
          { id: 'a', texto: 'Al número 10' },
          { id: 'b', texto: 'Al número 8' },
          { id: 'c', texto: 'Al número 12' }
        ],
        correcta: 'a'
      },
      {
        texto: 'En combinatoria, ¿de cuántas formas distintas se pueden ordenar en fila 3 pelotitas de colores diferentes (3!)?',
        opciones: [
          { id: 'a', texto: 'De 6 formas' },
          { id: 'b', texto: 'De 3 formas' },
          { id: 'c', texto: 'De 9 formas' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 18,
    codigoQR: 'qr-18',
    aliases: ['qr-minions', 'minions'],
    codigoEncargado: 'LENTE51',
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
        texto: 'Las bananas son ricas en Potasio. ¿Cuál es el número atómico del Potasio (K) en la Tabla Periódica?',
        opciones: [
          { id: 'a', texto: '19' },
          { id: 'b', texto: '11' },
          { id: 'c', texto: '8' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Quién es el autor de la Ley de Gravitación Universal cuya fórmula es F = G · (m₁ · m₂) / r² ?',
        opciones: [
          { id: 'a', texto: 'Isaac Newton' },
          { id: 'b', texto: 'Galileo Galilei' },
          { id: 'c', texto: 'Johannes Kepler' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Qué jugador francés convirtió los 3 goles de su selección en la final del Mundial de Qatar 2022?',
        opciones: [
          { id: 'a', texto: 'Antoine Griezmann' },
          { id: 'b', texto: 'Kylian Mbappé' },
          { id: 'c', texto: 'Olivier Giroud' }
        ],
        correcta: 'b'
      },
      {
        texto: 'En trigonometría, ¿a qué es igual siempre la identidad fundamental sen²(x) + cos²(x) ?',
        opciones: [
          { id: 'a', texto: 'Es igual a 1' },
          { id: 'b', texto: 'Es igual a 0' },
          { id: 'c', texto: 'Es igual a π' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cuál es el hueso más largo del cuerpo humano?',
        opciones: [
          { id: 'a', texto: 'El fémur' },
          { id: 'b', texto: 'El húmero' },
          { id: 'c', texto: 'La tibia' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 19,
    codigoQR: 'qr-19',
    aliases: ['qr-bowling', 'bowling2'],
    codigoEncargado: 'BOTE34',
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
        texto: 'En física, ¿cómo se define la Cantidad de Movimiento Lineal (o Momento Lineal "p") de una bola en movimiento?',
        opciones: [
          { id: 'a', texto: 'p = masa · velocidad (m · v)' },
          { id: 'b', texto: 'p = fuerza / área (F / A)' },
          { id: 'c', texto: 'p = masa / tiempo (m / t)' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Qué diferencia la fórmula química del Agua Oxigenada (H₂O₂) de la del Agua común (H₂O)?',
        opciones: [
          { id: 'a', texto: 'Tiene un átomo extra de Oxígeno por molécula' },
          { id: 'b', texto: 'Tiene un átomo extra de Hidrógeno' },
          { id: 'c', texto: 'Contiene átomos de Carbono' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Qué director técnico argentino sacó campeón a la Selección en la Copa América 2021, Finalissima 2022, Mundial 2022 y Copa América 2024?',
        opciones: [
          { id: 'a', texto: 'Lionel Scaloni' },
          { id: 'b', texto: 'Marcelo Gallardo' },
          { id: 'c', texto: 'Diego Simeone' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cuáles son las dos soluciones (raíces) de la ecuación cuadrática x² - 5x + 6 = 0 ?',
        opciones: [
          { id: 'a', texto: 'x = 2 y x = 3' },
          { id: 'b', texto: 'x = 1 y x = 6' },
          { id: 'c', texto: 'x = -2 y x = -3' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Con qué fórmula se calcula el volumen de una esfera de radio "r"?',
        opciones: [
          { id: 'a', texto: 'V = (4/3) · π · r³' },
          { id: 'b', texto: 'V = 4 · π · r²' },
          { id: 'c', texto: 'V = 2 · π · r³' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 20,
    codigoQR: 'qr-20',
    aliases: ['qr-pescador', 'pescador'],
    codigoEncargado: 'CAÑA89',
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
        texto: '¿Cómo se llama el principio físico que explica por qué los barcos flotan ("Todo cuerpo sumergido recibe un empuje de abajo hacia arriba...")?',
        opciones: [
          { id: 'a', texto: 'Principio de Arquímedes' },
          { id: 'b', texto: 'Principio de Pascal' },
          { id: 'c', texto: 'Teorema de Bernoulli' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Qué elemento químico es un líquido rojizo a temperatura ambiente y tiene el símbolo "Br" en la Tabla Periódica?',
        opciones: [
          { id: 'a', texto: 'Boro' },
          { id: 'b', texto: 'Bromo' },
          { id: 'c', texto: 'Bario' }
        ],
        correcta: 'b'
      },
      {
        texto: '¿En qué estadio mítico de Londres ganó Argentina la "Finalissima" 2022 por 3-0 frente a Italia?',
        opciones: [
          { id: 'a', texto: 'En el Estadio de Wembley' },
          { id: 'b', texto: 'En Old Trafford' },
          { id: 'c', texto: 'En Anfield' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Si en una pecera hay 6 peces rojos y 4 peces azules, ¿cuál es la probabilidad de pescar al azar un pez azul en el primer intento?',
        opciones: [
          { id: 'a', texto: '4/10 (40%)' },
          { id: 'b', texto: '4/6 (66%)' },
          { id: 'c', texto: '1/4 (25%)' }
        ],
        correcta: 'a'
      },
      {
        texto: 'En la Tabla Periódica, ¿qué símbolo tiene el elemento Cloro?',
        opciones: [
          { id: 'a', texto: 'Cl' },
          { id: 'b', texto: 'Cr' },
          { id: 'c', texto: 'Co' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 21,
    codigoQR: 'qr-21',
    aliases: ['qr-enhebralo', 'enhebralo'],
    codigoEncargado: 'HILO12',
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
        texto: 'En una circunferencia, ¿cuál es la relación exacta entre el Diámetro (D) y el Radio (r)?',
        opciones: [
          { id: 'a', texto: 'D = 2 · r (el doble del radio)' },
          { id: 'b', texto: 'D = r² (el radio al cuadrado)' },
          { id: 'c', texto: 'D = π · r' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Qué elemento semiconductor, cuyo símbolo es "Si", es el componente principal de los microchips y del vidrio?',
        opciones: [
          { id: 'a', texto: 'Silicio' },
          { id: 'b', texto: 'Sodio' },
          { id: 'c', texto: 'Azufre' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Qué futbolista argentino hizo goles en la final de la Copa América 2021, en la Finalissima 2022 y en la final del Mundial 2022?',
        opciones: [
          { id: 'a', texto: 'Ángel Di María' },
          { id: 'b', texto: 'Rodrigo De Paul' },
          { id: 'c', texto: 'Nicolás Otamendi' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cuál es el Mínimo Común Múltiplo (MCM) entre los números 4 y 6?',
        opciones: [
          { id: 'a', texto: '12' },
          { id: 'b', texto: '24' },
          { id: 'c', texto: '2' }
        ],
        correcta: 'a'
      },
      {
        texto: 'En el Sistema Internacional de Unidades, ¿en qué unidad se mide la frecuencia de una onda?',
        opciones: [
          { id: 'a', texto: 'En Hercios (Hz)' },
          { id: 'b', texto: 'En Julios (J)' },
          { id: 'c', texto: 'En Newtons (N)' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 22,
    codigoQR: 'qr-22',
    aliases: ['qr-pong', 'pong'],
    codigoEncargado: 'AGUA45',
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
        texto: 'Cuando lanzás una pelotita por el aire formando un arco, ¿qué forma geométrica describe su trayectoria (tiro oblicuo)?',
        opciones: [
          { id: 'a', texto: 'Una parábola' },
          { id: 'b', texto: 'Una hipérbola' },
          { id: 'c', texto: 'Una asíntota' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cuál es la densidad del agua pura en condiciones estándar?',
        opciones: [
          { id: 'a', texto: '1 g/cm³ (o 1 kg/litro)' },
          { id: 'b', texto: '10 g/cm³' },
          { id: 'c', texto: '0,1 g/cm³' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Cuál es el símbolo químico del Azufre en la Tabla Periódica?',
        opciones: [
          { id: 'a', texto: 'S' },
          { id: 'b', texto: 'Az' },
          { id: 'c', texto: 'Zf' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Contra qué selección europea empató Argentina 2-2 y luego venció por penales en los cuartos de final de Qatar 2022?',
        opciones: [
          { id: 'a', texto: 'Países Bajos (Holanda)' },
          { id: 'b', texto: 'Croacia' },
          { id: 'c', texto: 'Polonia' }
        ],
        correcta: 'a'
      },
      {
        texto: 'En trigonometría, ¿cuánto vale el Seno de 90° (sen 90°)?',
        opciones: [
          { id: 'a', texto: '1' },
          { id: 'b', texto: '0' },
          { id: 'c', texto: '0,5' }
        ],
        correcta: 'a'
      }
    ]
  },
  {
    id: 23,
    codigoQR: 'qr-23',
    aliases: ['qr-jenga', 'jenga'],
    codigoEncargado: 'TORRE90',
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
        texto: 'En física estática, ¿qué condición debe cumplirse con el Centro de Gravedad de una torre para que NO se derrumbe?',
        opciones: [
          { id: 'a', texto: 'Su proyección vertical debe caer dentro de la base de apoyo' },
          { id: 'b', texto: 'Su masa debe ser igual a cero' },
          { id: 'c', texto: 'Su altura debe superar el metro' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Con qué fórmula se calcula el volumen de un prisma rectangular (como un bloque de Jenga) de largo "a", ancho "b" y alto "c"?',
        opciones: [
          { id: 'a', texto: 'V = a · b · c' },
          { id: 'b', texto: 'V = a + b + c' },
          { id: 'c', texto: 'V = (a · b) / c' }
        ],
        correcta: 'a'
      },
      {
        texto: '¿Qué elemento de la Tabla Periódica tiene el símbolo "Zn"?',
        opciones: [
          { id: 'a', texto: 'Zirconio' },
          { id: 'b', texto: 'Zinc' },
          { id: 'c', texto: 'Xenón' }
        ],
        correcta: 'b'
      },
      {
        texto: '¿Qué club brasileño ganó la Copa Libertadores 2023 tras vencer a Boca Juniors en el estadio Maracaná?',
        opciones: [
          { id: 'a', texto: 'Palmeiras' },
          { id: 'b', texto: 'Fluminense' },
          { id: 'c', texto: 'Flamengo' }
        ],
        correcta: 'b'
      },
      {
        texto: '¿Cuál es el resultado de elevar 3 a la cuarta potencia (3⁴)?',
        opciones: [
          { id: 'a', texto: '81' },
          { id: 'b', texto: '12' },
          { id: 'c', texto: '27' }
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
    codigoEncargado: 'BONUS101',
    titulo: 'QR Secreto #1',
    puntos: 100,
    tipo: 'bonus',
    info: '¡Encontraste uno de los códigos QR ocultos en el salón! Sumás 100 puntos directos.',
    preguntas: []
  },
  'qr-secreto-2': {
    id: 102,
    codigoEncargado: 'BONUS102',
    titulo: 'QR Secreto #2',
    puntos: 100,
    tipo: 'bonus',
    info: '¡Encontraste uno de los códigos QR ocultos en el salón! Sumás 100 puntos directos.',
    preguntas: []
  },
  'qr-trampa': {
    id: 103,
    codigoEncargado: 'TRAMPA99',
    titulo: 'SISTEMA COMPROMETIDO',
    puntos: -50,
    tipo: 'trampa',
    info: '¡Cuidado! Escaneaste el QR trampa escondido en el salón. Resta 50 puntos al equipo.',
    preguntas: []
  }
};

// 1. Buscador exclusivo para LECTURA DE CÁMARA QR
const buscarJuegoPorQR = (codigoCrudo) => {
  if (!codigoCrudo) return null;
  const limpio = codigoCrudo.toString().trim().toLowerCase();

  if (CODIGOS_ESPECIALES[limpio]) return CODIGOS_ESPECIALES[limpio];

  return LISTA_JUEGOS_OFICIAL.find(
    (j) =>
      j.codigoQR.toLowerCase() === limpio ||
      `juego_${j.id}` === limpio ||
      `juego-${j.id}` === limpio ||
      j.aliases.some((alias) => alias.toLowerCase() === limpio) ||
      j.codigoEncargado.toLowerCase() === limpio
  ) || null;
};

// 2. Buscador exclusivo para CUADRO MANUAL (ANTI-TRAMPA: solo acepta el código del encargado)
const buscarJuegoPorClaveEncargado = (claveCruda) => {
  if (!claveCruda) return null;
  const limpio = claveCruda.toString().trim().toUpperCase();

  const especial = Object.values(CODIGOS_ESPECIALES).find(
    (esp) => esp.codigoEncargado.toUpperCase() === limpio
  );
  if (especial) return especial;

  return LISTA_JUEGOS_OFICIAL.find(
    (j) => j.codigoEncargado.toUpperCase() === limpio
  ) || null;
};

// ============================================================================
// ROTACIÓN INTELIGENTE DE LAS 5 PREGUNTAS SIN REPETIR
// ============================================================================
const sortearPreguntaSinRepetir = (juego) => {
  const total = juego.preguntas.length;
  const storageKey = `brillando_rotacion_juego_${juego.id}`;
  let usados = [];

  try {
    usados = JSON.parse(localStorage.getItem(storageKey) || '[]');
  } catch (_) {
    usados = [];
  }

  let disponibles = juego.preguntas
    .map((_, idx) => idx)
    .filter((idx) => !usados.includes(idx));

  // Si ya vieron las 5 preguntas de ese juego, reiniciamos el mazo evitando repetir la última
  if (disponibles.length === 0) {
    const ultimaUsada = usados[usados.length - 1];
    usados = ultimaUsada !== undefined ? [ultimaUsada] : [];
    disponibles = juego.preguntas
      .map((_, idx) => idx)
      .filter((idx) => !usados.includes(idx));
  }

  const elegido = disponibles[Math.floor(Math.random() * disponibles.length)];
  usados.push(elegido);

  try {
    localStorage.setItem(storageKey, JSON.stringify(usados));
  } catch (_) {}

  return juego.preguntas[elegido];
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
// HELPER 2: TIMEOUT CON REINTENTO AUTOMÁTICO
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

  // Cámara y código del encargado
  const [cameraError, setCameraError] = useState(false);
  const [codigoManualInput, setCodigoManualInput] = useState('');

  // Modal de aviso cuando el escáner está bloqueado antes de las 16:30hs
  const [modalBloqueoHorario, setModalBloqueoHorario] = useState(false);

  // Caché persistente del grupo
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
  // 7. APERTURA DE CÁMARA SEGURA (CON BLOQUEO HASTA EL SÁBADO 16:30 HS)
  // ============================================================================
  const handleAbrirEscanerSeguro = () => {
    if (scannerCooldown || isProcessing) return;

    // Verifica si ya son las 16:30 hs del sábado (o si desbloqueaste manualmente)
    if (!estaEscanerHabilitado()) {
      setModalBloqueoHorario(true);
      return;
    }

    setScannerCooldown(true);
    setCameraError(false);
    setCodigoManualInput('');
    setView('escaner');
    setTimeout(() => setScannerCooldown(false), 800);
  };

  // ============================================================================
  // 8. INICIAR DESAFÍO (RECIBE EL JUEGO VALIDADO POR CÁMARA O CLAVE DE ENCARGADO)
  // ============================================================================
  const iniciarDesafioValidado = async (baseJuego) => {
    if (!baseJuego || isProcessing) return;

    if (!estaEscanerHabilitado()) {
      setModalBloqueoHorario(true);
      setView('dashboard');
      return;
    }

    const completados = (grupoDataCache?.juegosCompletados || []).map(Number);
    if (completados.includes(Number(baseJuego.id))) {
      alert(`⚠️ ¡JUEGO YA COMPLETADO!\nSu escuadrón ya sumó los puntos de "${baseJuego.titulo}". Busquen otra estación.`);
      setView('dashboard');
      return;
    }

    const refSegura = await asegurarGrupoDocRef();
    if (!refSegura) {
      alert("Reconectando con tu escuadrón... Tocá nuevamente.");
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

    // CASO NORMAL: Rotación inteligente entre las 5 preguntas sin repetir
    const preguntaSorteada = sortearPreguntaSinRepetir(baseJuego);

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

  // Lectura óptica desde la cámara QR
  const handleScan = (resultado) => {
    if (!resultado || isProcessing) return;
    const textoQR = Array.isArray(resultado) ? resultado[0]?.rawValue : (resultado?.text || resultado);
    if (!textoQR) return;

    const juegoEncontrado = buscarJuegoPorQR(textoQR);
    if (!juegoEncontrado) {
      alert(`Código QR no reconocido en el sistema.`);
      return;
    }
    iniciarDesafioValidado(juegoEncontrado);
  };

  // Ingreso manual (SOLO acepta el código secreto del encargado, bloqueando trampas)
  const handleValidarClaveEncargado = (e) => {
    e.preventDefault();
    if (!codigoManualInput.trim() || isProcessing) return;

    const juegoAutorizado = buscarJuegoPorClaveEncargado(codigoManualInput);
    if (!juegoAutorizado) {
      alert("🔒 CÓDIGO INVÁLIDO.\nSolo el encargado de la posta tiene la clave de desbloqueo luego de ganar el juego.");
      return;
    }
    iniciarDesafioValidado(juegoAutorizado);
  };

  // ============================================================================
  // 9. VALIDACIÓN DE TRIVIA BLINDADA
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
  
  // ================= VISTA: DASHBOARD DEL JUGADOR =================
  if (view === 'dashboard') {
    return (
      <>
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

        {/* MODAL DE BLOQUEO HORARIO (HASTA EL SÁBADO 16:30 HS) */}
        {modalBloqueoHorario && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-5"
            onClick={() => setModalBloqueoHorario(false)}
          >
            <div
              className="w-full max-w-sm rounded-3xl border-2 border-yellow-400 bg-[#0e0e12] p-6 text-center text-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-yellow-400/15 border border-yellow-400/40 text-4xl">
                🔒
              </div>
              <span className="inline-block rounded-full bg-yellow-400/20 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest text-yellow-400 mb-2">
                Escáner en espera
              </span>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-2">
                ¡Se habilita a las 16:30 hs!
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed mb-6">
                Ya tienen su escuadrón listo y registrado. El escáner de códigos QR se activará mañana <b>sábado a las 16:30 hs</b> cuando comiencen los juegos en el Congreso.
              </p>
              <button
                type="button"
                onClick={() => setModalBloqueoHorario(false)}
                className="w-full rounded-full bg-yellow-400 py-3.5 text-xs font-black uppercase tracking-widest text-black"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // ================= VISTA: ESCÁNER QR + CÓDIGO DEL ENCARGADO (ANTI-TRAMPA) =================
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
              Si abriste el link desde WhatsApp o Instagram, tocá los 3 puntitos arriba a la derecha y elegí <b>"Abrir en Chrome"</b>, o pedile el código al encargado del juego:
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

        {/* CUADRO ANTI-TRAMPA: SOLO ACEPTA CLAVE DEL ENCARGADO DEL JUEGO */}
        <form 
          onSubmit={handleValidarClaveEncargado}
          className="w-full max-w-sm bg-white/5 border border-white/15 rounded-2xl p-4 mb-6"
        >
          <label className="block font-mono text-[11px] uppercase tracking-wider text-yellow-400 font-bold mb-2 text-center">
            🔑 PREGUNTAR CODIGO A ENCARGADO DEL JUEGO
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ingresar clave del encargado..."
              value={codigoManualInput}
              onChange={(e) => setCodigoManualInput(e.target.value)}
              className="flex-1 bg-black border border-white/25 rounded-xl px-3 py-2.5 text-sm text-white font-mono uppercase focus:outline-none focus:border-yellow-400"
            />
            <button
              type="submit"
              className="bg-yellow-400 text-black font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider"
            >
              Validar
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

  // ================= VISTA: TRIVIA =================
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