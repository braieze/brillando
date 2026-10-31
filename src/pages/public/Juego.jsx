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
        texto: 'En las películas de Toy Story, ¿cómo se llama el vaquero protagonista?',
        opciones: [
          { id: 'a', texto: 'Woody' },
          { id: 'b', texto: 'Buzz Lightyear' },
          { id: 'c', texto: 'Jessie' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Matemática: Si vas al kiosco, comprás 3 alfajores de $600 cada uno y pagás con $2000, ¿cuánto te tienen que dar de vuelto?',
        opciones: [
          { id: 'a', texto: '$200' },
          { id: 'b', texto: '$800' },
          { id: 'c', texto: '$400' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Fútbol: ¿Qué país le ganó la final del Mundial 2014 a la Selección Argentina?',
        opciones: [
          { id: 'a', texto: 'Brasil' },
          { id: 'b', texto: 'Francia' },
          { id: 'c', texto: 'Alemania' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Geografía: ¿Cuál es el río más caudaloso y ancho del mundo, que pasa por Brasil?',
        opciones: [
          { id: 'a', texto: 'Río Nilo' },
          { id: 'b', texto: 'Río Amazonas' },
          { id: 'c', texto: 'Río Paraná' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Lógica: Si estás participando en una carrera y lográs pasar al corredor que va en segundo lugar, ¿en qué posición quedás?',
        opciones: [
          { id: 'a', texto: 'Primero' },
          { id: 'b', texto: 'Tercero' },
          { id: 'c', texto: 'Segundo' }
        ],
        correcta: 'c'
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
        texto: 'En la película de Disney/Pixar "Intensa-Mente", ¿cuál de estas emociones NO estaba en la mente de Riley en la primera película?',
        opciones: [
          { id: 'a', texto: 'Furia' },
          { id: 'b', texto: 'Desagrado' },
          { id: 'c', texto: 'Envidia' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Matemática rápida: ¿Cuál es el resultado correcto de la operación 5 + 5 x 2?',
        opciones: [
          { id: 'a', texto: '20' },
          { id: 'b', texto: '15' },
          { id: 'c', texto: '10' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Fútbol: ¿Cómo es el apodo de Emiliano Martínez, el arquero campeón del mundo con Argentina?',
        opciones: [
          { id: 'a', texto: 'El Dibu' },
          { id: 'b', texto: 'El Cuti' },
          { id: 'c', texto: 'El Fideo' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Entretenimiento: ¿En qué famoso videojuego los personajes tienen forma de cubo y el objetivo es sobrevivir construyendo cosas?',
        opciones: [
          { id: 'a', texto: 'Roblox' },
          { id: 'b', texto: 'Fortnite' },
          { id: 'c', texto: 'Minecraft' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Geografía: ¿En qué continente se encuentra el gigantesco desierto del Sahara?',
        opciones: [
          { id: 'a', texto: 'Asia' },
          { id: 'b', texto: 'África' },
          { id: 'c', texto: 'Oceanía' }
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
        texto: 'Animación: ¿Qué animal es el mejor amigo parlanchín de Shrek en las películas de Dreamworks?',
        opciones: [
          { id: 'a', texto: 'Un dragón' },
          { id: 'b', texto: 'Un burro' },
          { id: 'c', texto: 'Un gato' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Matemática: Si el radio de un círculo mide exactamente 4 cm, ¿cuánto mide su diámetro total?',
        opciones: [
          { id: 'a', texto: '2 cm' },
          { id: 'b', texto: '8 cm' },
          { id: 'c', texto: '16 cm' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Fútbol: ¿Qué club argentino de Primera División hace de local en el estadio conocido como "El Monumental"?',
        opciones: [
          { id: 'a', texto: 'Boca Juniors' },
          { id: 'b', texto: 'Independiente' },
          { id: 'c', texto: 'River Plate' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Geografía: ¿Cuál es la ciudad capital de Japón?',
        opciones: [
          { id: 'a', texto: 'Pekín' },
          { id: 'b', texto: 'Tokio' },
          { id: 'c', texto: 'Seúl' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Lógica: Algunos meses del año tienen 31 días y otros tienen 30. ¿Cuántos meses tienen 28 días?',
        opciones: [
          { id: 'a', texto: 'Solo febrero' },
          { id: 'b', texto: 'Todos los 12 meses' },
          { id: 'c', texto: 'Ninguno' }
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
        texto: 'Disney: En la película "El Rey León", ¿cómo se llama el tío malvado de Simba que quiere robarle el trono?',
        opciones: [
          { id: 'a', texto: 'Mufasa' },
          { id: 'b', texto: 'Timón' },
          { id: 'c', texto: 'Scar' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Matemática: Si un pantalón cuesta $10.000 y te hacen un 20% de descuento, ¿cuánto te descuentan en pesos?',
        opciones: [
          { id: 'a', texto: '$2.000' },
          { id: 'b', texto: '$1.000' },
          { id: 'c', texto: '$200' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Fútbol: En un partido de fútbol 11 profesional, ¿cuántos jugadores de un mismo equipo pueden estar en la cancha al mismo tiempo?',
        opciones: [
          { id: 'a', texto: '10 jugadores' },
          { id: 'b', texto: '11 jugadores' },
          { id: 'c', texto: '12 jugadores' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Entretenimiento: ¿Cómo se llama el famoso productor argentino que hace las "Music Sessions" con números?',
        opciones: [
          { id: 'a', texto: 'Duki' },
          { id: 'b', texto: 'Wos' },
          { id: 'c', texto: 'Bizarrap' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Geografía: ¿En qué país europeo se encuentra la famosísima Torre Eiffel?',
        opciones: [
          { id: 'a', texto: 'España' },
          { id: 'b', texto: 'Francia' },
          { id: 'c', texto: 'Italia' }
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
        texto: 'Marvel: ¿Qué superhéroe usa un escudo indestructible de color rojo, azul y blanco con una estrella en el medio?',
        opciones: [
          { id: 'a', texto: 'Iron Man' },
          { id: 'b', texto: 'Thor' },
          { id: 'c', texto: 'Capitán América' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Matemática: En la ecuación X + 15 = 40, ¿qué número tiene que ser la X?',
        opciones: [
          { id: 'a', texto: '15' },
          { id: 'b', texto: '25' },
          { id: 'c', texto: '35' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Fútbol: ¿En qué país asiático se jugó el Mundial del año 2022 donde la Selección Argentina salió campeona?',
        opciones: [
          { id: 'a', texto: 'Rusia' },
          { id: 'b', texto: 'Japón' },
          { id: 'c', texto: 'Qatar' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Geografía: ¿Cuál de estos océanos es el más grande de todo el planeta Tierra?',
        opciones: [
          { id: 'a', texto: 'Océano Pacífico' },
          { id: 'b', texto: 'Océano Atlántico' },
          { id: 'c', texto: 'Océano Índico' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Lógica: ¿Qué cosa es tan pero tan frágil que si decís su nombre, la rompés?',
        opciones: [
          { id: 'a', texto: 'El cristal' },
          { id: 'b', texto: 'El viento' },
          { id: 'c', texto: 'El silencio' }
        ],
        correcta: 'c'
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
        texto: 'Disney: En la película "Frozen", ¿cómo se llama el simpático muñeco de nieve que cobra vida?',
        opciones: [
          { id: 'a', texto: 'Sven' },
          { id: 'b', texto: 'Kristoff' },
          { id: 'c', texto: 'Olaf' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Matemática: ¿Cuánto te da si calculás la raíz cuadrada de 64 (√64)?',
        opciones: [
          { id: 'a', texto: '6' },
          { id: 'b', texto: '8' },
          { id: 'c', texto: '12' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Fútbol: ¿Qué gigantesco club español juega sus partidos de local en el estadio "Santiago Bernabéu"?',
        opciones: [
          { id: 'a', texto: 'Barcelona' },
          { id: 'b', texto: 'Real Madrid' },
          { id: 'c', texto: 'Atlético de Madrid' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Entretenimiento: ¿En qué famosa plataforma de streaming podés ver la serie "Stranger Things"?',
        opciones: [
          { id: 'a', texto: 'Netflix' },
          { id: 'b', texto: 'Disney+' },
          { id: 'c', texto: 'Amazon Prime Video' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Geografía: ¿En qué provincia argentina tenés que viajar para ir a ver las Cataratas del Iguazú?',
        opciones: [
          { id: 'a', texto: 'Salta' },
          { id: 'b', texto: 'Mendoza' },
          { id: 'c', texto: 'Misiones' }
        ],
        correcta: 'c'
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
        texto: 'Disney Pixar: En la película "Buscando a Nemo", ¿cómo se llama el pez azul que siempre sufre de pérdida de memoria a corto plazo?',
        opciones: [
          { id: 'a', texto: 'Marlin' },
          { id: 'b', texto: 'Dory' },
          { id: 'c', texto: 'Crush' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Matemática: Un triángulo equilátero es aquel que se caracteriza por tener...',
        opciones: [
          { id: 'a', texto: 'Sus tres lados completamente iguales' },
          { id: 'b', texto: 'Todos sus lados distintos' },
          { id: 'c', texto: 'Dos lados iguales y uno diferente' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Fútbol: ¿Qué jugador argentino ganó el premio Balón de Oro en el año 2023 por octava vez en su carrera?',
        opciones: [
          { id: 'a', texto: 'Lautaro Martínez' },
          { id: 'b', texto: 'Julián Álvarez' },
          { id: 'c', texto: 'Lionel Messi' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Geografía: Mirando el mapa del mundo, ¿cuál es el país más grande de todos en extensión territorial?',
        opciones: [
          { id: 'a', texto: 'Canadá' },
          { id: 'b', texto: 'Estados Unidos' },
          { id: 'c', texto: 'Rusia' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Lógica: ¿Qué cosa es esa que cuanto más te seca el cuerpo, más húmeda se vuelve?',
        opciones: [
          { id: 'a', texto: 'El agua' },
          { id: 'b', texto: 'Una toalla' },
          { id: 'c', texto: 'El viento' }
        ],
        correcta: 'b'
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
        texto: 'Marvel: ¿De qué dos colores principales es el traje clásico de Spiderman (El Hombre Araña)?',
        opciones: [
          { id: 'a', texto: 'Negro y Blanco' },
          { id: 'b', texto: 'Rojo y Amarillo' },
          { id: 'c', texto: 'Rojo y Azul' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Matemática: Si dibujás un rectángulo que tiene 5 cm de base y 4 cm de altura, ¿cuál es su área total (base por altura)?',
        opciones: [
          { id: 'a', texto: '18 cm²' },
          { id: 'b', texto: '20 cm²' },
          { id: 'c', texto: '9 cm²' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Fútbol: Por regla general de la FIFA, ¿cada cuántos años se organiza un Mundial de Fútbol masculino?',
        opciones: [
          { id: 'a', texto: 'Cada 2 años' },
          { id: 'b', texto: 'Cada 5 años' },
          { id: 'c', texto: 'Cada 4 años' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Entretenimiento: Al principio de una partida del videojuego Fortnite, ¿desde dónde saltan los jugadores para caer en la isla?',
        opciones: [
          { id: 'a', texto: 'Desde un micro o autobús volador' },
          { id: 'b', texto: 'Desde un tren en movimiento' },
          { id: 'c', texto: 'Nacen directamente en el piso' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Geografía: ¿Cuál es el país largo y angosto con el que Argentina comparte frontera en todo el lado Oeste de la Cordillera?',
        opciones: [
          { id: 'a', texto: 'Uruguay' },
          { id: 'b', texto: 'Chile' },
          { id: 'c', texto: 'Bolivia' }
        ],
        correcta: 'b'
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
        texto: 'Disney: ¿Cómo se llama la famosa princesa que huye a las 12 de la noche y pierde un zapato de cristal en la escalera?',
        opciones: [
          { id: 'a', texto: 'Cenicienta' },
          { id: 'b', texto: 'Blancanieves' },
          { id: 'c', texto: 'Ariel (La Sirenita)' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Matemática: ¿Cuánto es el resultado de calcular 3 elevado al cubo (es decir, 3 x 3 x 3)?',
        opciones: [
          { id: 'a', texto: '9' },
          { id: 'b', texto: '12' },
          { id: 'c', texto: '27' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Fútbol: ¿A qué Selección le convirtió Diego Maradona el histórico gol esquivando jugadores conocido como el "Gol del Siglo"?',
        opciones: [
          { id: 'a', texto: 'Brasil' },
          { id: 'b', texto: 'Inglaterra' },
          { id: 'c', texto: 'Italia' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Geografía: ¿En qué país europeo moderno se encuentra la ciudad de Roma y las ruinas del Coliseo?',
        opciones: [
          { id: 'a', texto: 'En Italia' },
          { id: 'b', texto: 'En Grecia' },
          { id: 'c', texto: 'En España' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Lógica: El padre de Juan tiene 4 hijos varones: Lucas, Marcos, Mateo y... ¿Cómo se llama el cuarto hijo?',
        opciones: [
          { id: 'a', texto: 'Pedro' },
          { id: 'b', texto: 'Juan' },
          { id: 'c', texto: 'No se dice' }
        ],
        correcta: 'b'
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
        texto: 'Disney: En la película "Monsters, Inc.", ¿cómo se llama el monstruo principal que es gigante, peludo, celeste y con manchas púrpuras?',
        opciones: [
          { id: 'a', miketexto: 'Mike Wazowski' },
          { id: 'b', texto: 'Randall' },
          { id: 'c', texto: 'James P. Sullivan (Sulley)' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Matemática: Si una pizza grande viene cortada en 8 porciones iguales y vos te comés 2, ¿qué fracción de la pizza comiste?',
        opciones: [
          { id: 'a', texto: 'Un cuarto (1/4)' },
          { id: 'b', texto: 'La mitad (1/2)' },
          { id: 'c', texto: 'Un tercio (1/3)' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Fútbol: En la televisión actual de fútbol, ¿qué significa exactamente la sigla del "VAR"?',
        opciones: [
          { id: 'a', texto: 'Visual Action Replay' },
          { id: 'b', texto: 'Video Assistant Referee' },
          { id: 'c', texto: 'Virtual Arbitro Review' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Música: ¿Qué famosa cantante de pop internacional rompió récords globales recientemente con su gira "The Eras Tour"?',
        opciones: [
          { id: 'a', texto: 'Dua Lipa' },
          { id: 'b', texto: 'Ariana Grande' },
          { id: 'c', texto: 'Taylor Swift' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Geografía: ¿Cuál es el nombre de la enorme cordillera montañosa que atraviesa todo el lado oeste de América del Sur?',
        opciones: [
          { id: 'a', texto: 'Los Alpes' },
          { id: 'b', texto: 'Cordillera de los Andes' },
          { id: 'c', texto: 'Las Montañas Rocosas' }
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
        texto: 'Disney: ¿Cómo se llama el famosísimo ratón con pantalones rojos creado por Walt Disney que es la cara de la compañía?',
        opciones: [
          { id: 'a', texto: 'Pato Donald' },
          { id: 'b', texto: 'Mickey Mouse' },
          { id: 'c', texto: 'Goofy' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Matemática: En geometría básica, si tenés un "ángulo recto" perfecto, ¿cuántos grados de inclinación mide?',
        opciones: [
          { id: 'a', texto: '45 grados' },
          { id: 'b', texto: '180 grados' },
          { id: 'c', texto: '90 grados' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Fútbol: ¿Cuáles son los dos colores principales que componen la camiseta del club Boca Juniors?',
        opciones: [
          { id: 'a', texto: 'Azul y Oro (Amarillo)' },
          { id: 'b', texto: 'Rojo y Blanco' },
          { id: 'c', texto: 'Celeste y Blanco' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Geografía: ¿En qué país sudamericano se encuentra la famosa y gigante estatua conocida como el "Cristo Redentor"?',
        opciones: [
          { id: 'a', texto: 'Colombia' },
          { id: 'b', texto: 'Argentina' },
          { id: 'c', texto: 'Brasil' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Lógica: Te planteo un acertijo. "Tengo agujas pero no sé coser, tengo números pero no sé leer". ¿Qué soy?',
        opciones: [
          { id: 'a', texto: 'Un erizo' },
          { id: 'b', texto: 'Una calculadora' },
          { id: 'c', texto: 'Un reloj analógico' }
        ],
        correcta: 'c'
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
        texto: 'Disney Pixar: En la emotiva película "Coco", ¿qué instrumento musical toca el pequeño Miguel a escondidas?',
        opciones: [
          { id: 'a', texto: 'El violín' },
          { id: 'b', texto: 'La guitarra' },
          { id: 'c', texto: 'La trompeta' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Matemática: Los números primos son los que solo se pueden dividir por 1 y por sí mismos. ¿Cuál de estos es Primo?',
        opciones: [
          { id: 'a', texto: 'El 9' },
          { id: 'b', texto: 'El 15' },
          { id: 'c', texto: 'El 7' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Fútbol: Mirando hacia el futuro, ¿en qué continente se va a organizar el Mundial de Fútbol de la FIFA del año 2026?',
        opciones: [
          { id: 'a', texto: 'Norteamérica (EEUU, Canadá, México)' },
          { id: 'b', texto: 'Europa' },
          { id: 'c', texto: 'Asia' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Entretenimiento: ¿Cuál es la red social donde se suben mayormente videos en formato vertical bailando "trends" con canciones virales?',
        opciones: [
          { id: 'a', texto: 'X (Twitter)' },
          { id: 'b', texto: 'TikTok' },
          { id: 'c', texto: 'LinkedIn' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Geografía: ¿Cuál es la ciudad que es la Capital Oficial de la República Argentina?',
        opciones: [
          { id: 'a', texto: 'Córdoba' },
          { id: 'b', texto: 'Rosario' },
          { id: 'c', texto: 'Ciudad de Buenos Aires (CABA)' }
        ],
        correcta: 'c'
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
        texto: 'Disney: En la película "Lilo & Stitch", ¿de qué color principal es la piel de Stitch (el experimento 626)?',
        opciones: [
          { id: 'a', texto: 'Rojo' },
          { id: 'b', texto: 'Azul' },
          { id: 'c', texto: 'Verde' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Matemática: Si tu familia viaja en auto a una velocidad constante de 100 km por hora, ¿cuántos kilómetros van a recorrer si manejan 2 horas seguidas?',
        opciones: [
          { id: 'a', texto: '150 kilómetros' },
          { id: 'b', texto: '100 kilómetros' },
          { id: 'c', texto: '200 kilómetros' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Fútbol: Si en un mismo partido un árbitro le muestra dos veces la tarjeta amarilla a un mismo jugador, ¿qué pasa?',
        opciones: [
          { id: 'a', texto: 'Lo suspenden 5 minutos' },
          { id: 'b', texto: 'Le muestran la tarjeta roja y es expulsado' },
          { id: 'c', texto: 'Debe pagar una multa ahí mismo' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Geografía: ¿Cuál es el único país de toda América del Sur donde el idioma oficial es el portugués?',
        opciones: [
          { id: 'a', texto: 'Uruguay' },
          { id: 'b', texto: 'Perú' },
          { id: 'c', texto: 'Brasil' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Lógica: Entrás a una cabaña muy fría y a oscuras. Tenés UN solo fósforo. Adentro hay una vela y una estufa a leña. ¿Qué encendés primero?',
        opciones: [
          { id: 'a', texto: 'El fósforo' },
          { id: 'b', texto: 'La vela' },
          { id: 'c', texto: 'La estufa' }
        ],
        correcta: 'a'
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
        texto: 'Disney: ¿Qué princesa de los cuentos de Disney está encerrada en una torre y tiene una larga trenza de pelo mágico súper rubio?',
        opciones: [
          { id: 'a', texto: 'Mérida' },
          { id: 'b', texto: 'Mulán' },
          { id: 'c', texto: 'Rapunzel' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Matemática: Esta es regla de oro. Si multiplicás CUALQUIER número (por más gigante que sea) por 0 (cero), el resultado siempre es...',
        opciones: [
          { id: 'a', texto: 'Cero (0)' },
          { id: 'b', texto: 'Uno (1)' },
          { id: 'c', texto: 'El mismo número gigante' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Fútbol: ¿Qué famosísimo jugador de fútbol de Portugal salta, se da vuelta y grita "¡Siuuu!" cada vez que festeja un gol?',
        opciones: [
          { id: 'a', texto: 'Joao Félix' },
          { id: 'b', texto: 'Cristiano Ronaldo' },
          { id: 'c', texto: 'Pepe' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Entretenimiento: ¿En qué famoso juego de aventuras y construcción absolutamente todo, desde los cerdos hasta la tierra, está hecho con formas cuadradas?',
        opciones: [
          { id: 'a', texto: 'Lego Digital' },
          { id: 'b', texto: 'Roblox' },
          { id: 'c', texto: 'Minecraft' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Geografía: Si mirás el mapa de los países de Europa, hay uno muy famoso que tiene una forma perfecta de "bota". ¿Cuál es?',
        opciones: [
          { id: 'a', texto: 'Grecia' },
          { id: 'b', texto: 'Italia' },
          { id: 'c', texto: 'España' }
        ],
        correcta: 'b'
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
        texto: 'Disney: En la famosa película "El Rey León", ¿qué tipo de animal salvaje es el protagonista principal Simba?',
        opciones: [
          { id: 'a', texto: 'Un tigre' },
          { id: 'b', texto: 'Un león' },
          { id: 'c', texto: 'Un leopardo' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Matemática: En geometría, sin importar el tamaño del triángulo que dibujes, ¿cuánto suman siempre sus tres ángulos internos?',
        opciones: [
          { id: 'a', texto: '360° grados' },
          { id: 'b', texto: '180° grados' },
          { id: 'c', texto: '90° grados' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Fútbol: ¿A qué poderosísimo club de España se fue a jugar el delantero francés Kylian Mbappé en el año 2024?',
        opciones: [
          { id: 'a', texto: 'Real Madrid' },
          { id: 'b', texto: 'París Saint-Germain (PSG)' },
          { id: 'c', texto: 'Manchester City' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Geografía: ¿Cuál es la ciudad que es la Capital Oficial del país de España, donde reside el rey?',
        opciones: [
          { id: 'a', texto: 'Sevilla' },
          { id: 'b', texto: 'Barcelona' },
          { id: 'c', texto: 'Madrid' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Lógica: Te planteo un acertijo. "Tengo llaves pero no puedo abrir ninguna cerradura". ¿Qué objeto soy?',
        opciones: [
          { id: 'a', texto: 'Un teclado / un piano' },
          { id: 'b', texto: 'Un llavero' },
          { id: 'c', texto: 'Una caja fuerte' }
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
    info: 'El jugador debe armar la pirámide completa de vasos (con base de 7) y luego volver a juntar todos los vasos en una sola pila usando únicamente 1 mano.',
    tipo: 'normal',
    preguntas: [
      {
        texto: 'Disney Pixar: En la primera película de "Buscando a Nemo", ¿cómo se llama el pez payaso que es el padre súper protector de Nemo?',
        opciones: [
          { id: 'a', texto: 'Bruce' },
          { id: 'b', texto: 'Gill' },
          { id: 'c', texto: 'Marlin' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Matemática: En geometría, a la figura plana cerrada que tiene exactamente 6 (seis) lados se la conoce como...',
        opciones: [
          { id: 'a', texto: 'Hexágono' },
          { id: 'b', texto: 'Pentágono' },
          { id: 'c', texto: 'Octágono' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Fútbol: En un partido profesional, ¿cómo se le llama al árbitro que corre por el costado de la cancha levantando una bandera de colores?',
        opciones: [
          { id: 'a', texto: 'Veedor del partido' },
          { id: 'b', texto: 'Juez de línea (Linesman)' },
          { id: 'c', texto: 'Comisario deportivo' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Música: ¿Qué artista boricua compuso y cantó la canción hiper viral "Despacito" junto a Daddy Yankee?',
        opciones: [
          { id: 'a', texto: 'Luis Fonsi' },
          { id: 'b', texto: 'Maluma' },
          { id: 'c', texto: 'Ricky Martin' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Geografía: ¿A qué país del mundo pertenece el famosísimo monumento conocido como la "Estatua de la Libertad"?',
        opciones: [
          { id: 'a', texto: 'A Francia' },
          { id: 'b', texto: 'Al Reino Unido' },
          { id: 'c', texto: 'A los Estados Unidos' }
        ],
        correcta: 'c'
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
        texto: 'Disney: En la película "Encanto", donde todos tienen poderes, ¿cuál es el don o súper poder de la hermana musculosa Luisa?',
        opciones: [
          { id: 'a', texto: 'Hacer florecer las plantas' },
          { id: 'b', texto: 'Tener una súper fuerza' },
          { id: 'c', texto: 'Curar con arepas de queso' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Matemática: Pensá rápido en las tablas de multiplicar. ¿Cuánto es exactamente 8 multiplicado por 7 (8 x 7)?',
        opciones: [
          { id: 'a', texto: '56' },
          { id: 'b', texto: '54' },
          { id: 'c', texto: '64' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Fútbol: ¿En qué país sudamericano nació Lionel Andrés Messi, el astro del fútbol mundial?',
        opciones: [
          { id: 'a', texto: 'Nació en España' },
          { id: 'b', texto: 'Nació en Brasil' },
          { id: 'c', texto: 'Nació en Argentina' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Geografía: ¿Cómo se llama el río hiper ancho y amarronado que separa a la Argentina del país vecino Uruguay?',
        opciones: [
          { id: 'a', texto: 'El Río Paraná' },
          { id: 'b', texto: 'El Río de la Plata' },
          { id: 'c', texto: 'El Río Colorado' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Lógica: Te planteo un acertijo. "Es tuyo desde que nacés, pero todas las demás personas lo usan muchísimo más que vos". ¿Qué es?',
        opciones: [
          { id: 'a', texto: 'Tu ropa' },
          { id: 'b', texto: 'Tu celular' },
          { id: 'c', texto: 'Tu nombre propio' }
        ],
        correcta: 'c'
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
        texto: 'Marvel: Dentro del grupo de Los Vengadores, ¿quién es el poderoso dios del trueno que usa un martillo pesado llamado Mjolnir?',
        opciones: [
          { id: 'a', texto: 'Iron Man' },
          { id: 'b', texto: 'Hulk' },
          { id: 'c', texto: 'Thor' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Matemática: Tenés 100 pesos (o caramelos) y tenés que dividirlos exactamente entre 4 amigos. ¿Cuánto le toca a cada uno?',
        opciones: [
          { id: 'a', texto: '25 a cada uno' },
          { id: 'b', texto: '20 a cada uno' },
          { id: 'c', texto: '50 a cada uno' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Fútbol: En un partido de fútbol profesional de 90 minutos, ¿cuánto tiempo debe durar el descanso o entretiempo en el medio?',
        opciones: [
          { id: 'a', texto: '10 minutos exactos' },
          { id: 'b', texto: '15 minutos exactos' },
          { id: 'c', texto: '20 minutos exactos' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Animación: ¿En qué queridísima película de DreamWorks el protagonista es un ogro verde gigante y bastante enojón que vive en un pantano?',
        opciones: [
          { id: 'a', texto: 'Mi Villano Favorito' },
          { id: 'b', texto: 'Toy Story' },
          { id: 'c', texto: 'Shrek' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Geografía: Si viajás a los Estados Unidos (USA), ¿qué idioma vas a necesitar hablar mayormente para que te entiendan?',
        opciones: [
          { id: 'a', texto: 'El español' },
          { id: 'b', texto: 'El inglés' },
          { id: 'c', texto: 'El francés' }
        ],
        correcta: 'b'
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
        texto: 'Cine: En la saga de Piratas del Caribe, ¿cómo se llama el aterrador villano que tiene tentáculos de pulpo o calamar en la cara?',
        opciones: [
          { id: 'a', texto: 'Jack Sparrow' },
          { id: 'b', texto: 'El Capitán Barbossa' },
          { id: 'c', texto: 'Davy Jones' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Matemática: Si estás leyendo los números Romanos antiguos, ¿qué número representa la letra "X" mayúscula?',
        opciones: [
          { id: 'a', texto: 'El número 5' },
          { id: 'b', texto: 'El número 10' },
          { id: 'c', texto: 'El número 50' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Fútbol: En la liga de Inglaterra (Premier League), ¿qué club poderoso viste camiseta celeste y es dirigido por Pep Guardiola?',
        opciones: [
          { id: 'a', texto: 'Manchester United' },
          { id: 'b', texto: 'Manchester City' },
          { id: 'c', texto: 'Chelsea' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Geografía: Si querés ir a ver las famosas Pirámides de Egipto y caminar por el desierto, ¿a qué continente tenés que viajar?',
        opciones: [
          { id: 'a', texto: 'A Asia' },
          { id: 'b', texto: 'A Europa' },
          { id: 'c', texto: 'A África' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Lógica: Te planteo un acertijo. "Cuanto más le quitás o excavás, más grande se vuelve". ¿Qué es?',
        opciones: [
          { id: 'a', texto: 'Una nube' },
          { id: 'b', texto: 'Un agujero / Un pozo' },
          { id: 'c', texto: 'Un árbol' }
        ],
        correcta: 'b'
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
        texto: 'Disney: En la clásica película animada "Aladdín", ¿cuántos deseos exactos le promete cumplir el Genio de la lámpara a quien la frote?',
        opciones: [
          { id: 'a', texto: 'Le concede 1 solo deseo' },
          { id: 'b', texto: 'Le concede 3 deseos' },
          { id: 'c', texto: 'Le concede 5 deseos' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Matemática: Sin usar la calculadora, ¿cuánto te da si dividís 250 a la mitad exacta?',
        opciones: [
          { id: 'a', texto: '100' },
          { id: 'b', texto: '125' },
          { id: 'c', texto: '150' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Fútbol: En un Mundial, si los dos equipos empatan en un partido de "mata-mata" (eliminación), y siguen empatados tras el tiempo extra, ¿qué pasa?',
        opciones: [
          { id: 'a', texto: 'Se define tirando una moneda' },
          { id: 'b', texto: 'Gana el que menos faltas haya hecho' },
          { id: 'c', texto: 'Se define por tanda de Penales' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Música: ¿Qué famosísima cantante joven argentina es apodada por ella misma y sus fans como "La Nena de Argentina"?',
        opciones: [
          { id: 'a', texto: 'Maria Becerra' },
          { id: 'b', texto: 'Lali Espósito' },
          { id: 'c', texto: 'Tini Stoessel' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Geografía: ¿Cuál es el nombre de la gigante cordillera de montañas nevadas que atraviesa Argentina y sigue por todo el oeste de Sudamérica?',
        opciones: [
          { id: 'a', texto: 'Los Alpes' },
          { id: 'b', texto: 'Los Pirineos' },
          { id: 'c', texto: 'Cordillera de los Andes' }
        ],
        correcta: 'c'
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
        texto: 'Disney Pixar: ¿Qué emotiva película animada se desarrolla durante la festividad del "Día de los Muertos" con calaveras coloridas en México?',
        opciones: [
          { id: 'a', texto: 'Up: Una aventura de altura' },
          { id: 'b', texto: 'Soul' },
          { id: 'c', texto: 'Coco' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Matemática: Si un combo de hamburguesas sale $4.000, y vos pedís 2 combos iguales, ¿cuántos pesos tenés que pagar en total?',
        opciones: [
          { id: 'a', texto: '$6.000' },
          { id: 'b', texto: '$8.000' },
          { id: 'c', texto: '$4.000 (hay 2x1)' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Fútbol: En la Selección y en los clubes de nuestro país, ¿qué significan las históricas tres letras de la sigla "AFA"?',
        opciones: [
          { id: 'a', texto: 'Asociación de Fútbol Argentino' },
          { id: 'b', texto: 'Asociación de Futbolistas Asociados' },
          { id: 'c', texto: 'Agrupación Futbolística Argentina' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Geografía: Si te vas de vacaciones a Mar del Plata en el verano, ¿en qué gran océano te vas a meter a nadar?',
        opciones: [
          { id: 'a', texto: 'Océano Pacífico' },
          { id: 'b', texto: 'Océano Índico' },
          { id: 'c', texto: 'Océano Atlántico' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Lógica: Escuchá bien esta adivinanza: "Blancas son, en la mesa las ponen, las cortan o mezclan... pero no se comen". ¿Qué son?',
        opciones: [
          { id: 'a', texto: 'Las cucharas' },
          { id: 'b', texto: 'Las cartas (baraja francesa)' },
          { id: 'c', texto: 'Las servilletas de papel' }
        ],
        correcta: 'b'
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
    info: 'Se colocan 6 vasos llenos de agua en cada extremo opuesto de la mesa. Turnándose para lanzar, gana quien emboque más pelotitas de ping-pong en 1 minuto.',
    tipo: 'normal',
    preguntas: [
      {
        texto: 'Disney Pixar: En la película "Cars", ¿cómo se llama el auto de carreras rojo, rápido y un poco creído que es el protagonista principal?',
        opciones: [
          { id: 'a', texto: 'Rayo McQueen' },
          { id: 'b', texto: 'El Rey' },
          { id: 'c', texto: 'Tom Mate' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Matemática: Si sumás el número quince consigo mismo tres veces seguidas (15 + 15 + 15), ¿qué resultado obtenés?',
        opciones: [
          { id: 'a', texto: '30' },
          { id: 'b', texto: '60' },
          { id: 'c', texto: '45' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Fútbol: Si en un partido un jugador recibe la pelota cuando está más adelantado que toda la defensa rival, el árbitro anula la jugada cobrando...',
        opciones: [
          { id: 'a', texto: 'Falta ofensiva' },
          { id: 'b', texto: 'Córner o tiro de esquina' },
          { id: 'c', texto: 'Offside (Fuera de juego)' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Redes Sociales: ¿Qué famosísima aplicación tiene de logo el dibujo de una camarita colorida que va del rosa al naranja y violeta?',
        opciones: [
          { id: 'a', texto: 'Snapchat' },
          { id: 'b', texto: 'Facebook' },
          { id: 'c', texto: 'Instagram' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Geografía: Considerando toda la población mundial, ¿cuál es el país que tiene la mayor cantidad de habitantes en el mundo, compitiendo con India?',
        opciones: [
          { id: 'a', texto: 'Rusia' },
          { id: 'b', texto: 'China' },
          { id: 'c', texto: 'Estados Unidos' }
        ],
        correcta: 'b'
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
        texto: 'Disney Pixar: En la película "Up: Una aventura de altura", ¿con qué locura logra el abuelito Fredricksen hacer volar toda su casa por los aires?',
        opciones: [
          { id: 'a', texto: 'Con un motor de cohete' },
          { id: 'b', texto: 'Con magia de hadas' },
          { id: 'c', texto: 'Con muchísimos globos atados' }
        ],
        correcta: 'c'
      },
      {
        texto: 'Matemática: Tenés un billete de 100 pesos y gastás exactamente 45 en golosinas. ¿Cuánto te queda en el bolsillo (100 - 45)?',
        opciones: [
          { id: 'a', texto: '65' },
          { id: 'b', texto: '55' },
          { id: 'c', texto: '45' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Fútbol: En la jerga futbolera, ¿cómo se le llama a la falta brutal que un defensor comete adentro de su propia "área grande"?',
        opciones: [
          { id: 'a', texto: 'Un tiro libre directo' },
          { id: 'b', texto: 'Un Penal' },
          { id: 'c', texto: 'Un Lateral' }
        ],
        correcta: 'b'
      },
      {
        texto: 'Geografía: Si viajás al país limítrofe de Uruguay cruzando "el charco", ¿cuál es su capital oficial?',
        opciones: [
          { id: 'a', texto: 'Montevideo' },
          { id: 'b', texto: 'Asunción' },
          { id: 'c', texto: 'Punta del Este' }
        ],
        correcta: 'a'
      },
      {
        texto: 'Lógica: Te planteo el último acertijo. "Tiene dos manecillas o manos, se la pasa girando todo el día, pero jamás puede aplaudir". ¿Qué es?',
        opciones: [
          { id: 'a', texto: 'Un mono enjaulado' },
          { id: 'b', texto: 'Un ventilador de techo' },
          { id: 'c', texto: 'Un reloj analógico' }
        ],
        correcta: 'c'
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
      alert("🔒 CÓDIGO INVÁLIDO.\nSolo el encargado del juego tiene la clave de desbloqueo luego de ganar el juego.");
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