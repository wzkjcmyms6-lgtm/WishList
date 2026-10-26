// Lectura y escritura en Firestore. Las reglas del servidor son las que mandan;
// acá solo se arman los datos.

import {
  db, collection, doc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot,
} from './firebase.js';
import { estado } from './estado.js';

const deseosCol = collection(db, 'wishlist_items');
const comidasCol = collection(db, 'food_items');
const gustosDoc = doc(db, 'preferences', 'lentina');

let cortarEscuchas = [];

export function escucharDatos(alCambiar) {
  dejarDeEscuchar();

  cortarEscuchas.push(onSnapshot(deseosCol, (snap) => {
    estado.deseos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    alCambiar();
  }, () => {
    estado.errorConexion = true;
    alCambiar();
  }));

  cortarEscuchas.push(onSnapshot(comidasCol, (snap) => {
    estado.comidas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    alCambiar();
  }, () => {
    estado.errorConexion = true;
    alCambiar();
  }));

  // Los gustos de Lentina son la chuleta de regalos de Manuelito: las reglas
  // solo lo dejan leerlos a él, así que ni se pide desde la sesión de ella.
  if (estado.sesion === 'manolo') {
    cortarEscuchas.push(onSnapshot(gustosDoc, (snap) => {
      estado.gustos = snap.exists() ? snap.data() : {};
      alCambiar();
    }, () => {
      estado.errorConexion = true;
      alCambiar();
    }));
  }
}

export function dejarDeEscuchar() {
  cortarEscuchas.forEach((cortar) => cortar());
  cortarEscuchas = [];
  estado.deseos = [];
  estado.comidas = [];
  estado.gustos = {};
}

export function crearDeseo(datos) {
  return addDoc(deseosCol, {
    ...datos,
    owner: estado.sesion,
    reserved: false,
    reservedBy: null,
    createdAt: Date.now(),
  });
}

export function editarDeseo(id, datos) {
  return updateDoc(doc(deseosCol, id), datos);
}

export function borrarDeseo(id) {
  return deleteDoc(doc(deseosCol, id));
}

export function alternarReserva(deseo) {
  return updateDoc(doc(deseosCol, deseo.id), {
    reserved: !deseo.reserved,
    reservedBy: !deseo.reserved ? estado.sesion : null,
  });
}

export function crearComida(datos) {
  return addDoc(comidasCol, { ...datos, owner: estado.sesion, createdAt: Date.now() });
}

export function editarComida(id, datos) {
  return updateDoc(doc(comidasCol, id), datos);
}

export function borrarComida(id) {
  return deleteDoc(doc(comidasCol, id));
}

export function guardarGustos(datos) {
  return setDoc(gustosDoc, datos, { merge: true });
}
