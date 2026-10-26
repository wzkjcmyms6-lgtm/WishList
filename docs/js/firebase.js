// Conexión con Firebase. Todo lo demás importa desde acá, así que para probar
// la app sin red basta con reemplazar este archivo por uno simulado.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  setPersistence, browserLocalPersistence,
  updatePassword, reauthenticateWithCredential, EmailAuthProvider,
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, collection, doc,
  addDoc, setDoc, updateDoc, deleteDoc, onSnapshot,
  getDoc, getDocs, query, where, orderBy, limit,
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

// Esta configuración es pública a propósito: va dentro de cualquier app web de
// Firebase. Lo que protege los datos son las reglas de firestore.rules.
const configuracion = {
  apiKey: 'AIzaSyA2lkETQlRHRapFm8KPsTx-CB-oJbbD1kw',
  authDomain: 'ositos-e6e10.firebaseapp.com',
  projectId: 'ositos-e6e10',
  storageBucket: 'ositos-e6e10.firebasestorage.app',
  messagingSenderId: '127533519906',
  appId: '1:127533519906:web:aae0604a5015d1896ca67b',
};

const app = initializeApp(configuracion);

export const auth = getAuth(app);
// La sesión queda guardada en el celular hasta que se toque "Salir".
export const sesionLista = setPersistence(auth, browserLocalPersistence);

export const db = initializeFirestore(app, { localCache: persistentLocalCache() });

export {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  updatePassword, reauthenticateWithCredential, EmailAuthProvider,
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot,
  getDoc, getDocs, query, where, orderBy, limit,
};
