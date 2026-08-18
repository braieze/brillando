// src/config/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // Importamos la base de datos
import { getAuth } from "firebase/auth";           // Importamos la autenticación

// Tus credenciales de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCtNmaSg641TVp2Rt92LlRGfuGiNeHRmEY",
  authDomain: "brillando-830f5.firebaseapp.com",
  projectId: "brillando-830f5",
  storageBucket: "brillando-830f5.firebasestorage.app",
  messagingSenderId: "163379395634",
  appId: "1:163379395634:web:8cce40da259f5f1ffcd02b",
  measurementId: "G-3EJ7L00SYE"
};

// Inicializamos la aplicación de Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Inicializamos y exportamos los servicios que vamos a usar
export const db = getFirestore(app);
export const auth = getAuth(app);