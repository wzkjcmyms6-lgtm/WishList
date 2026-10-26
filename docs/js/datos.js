// Lectura y escritura en Firestore. Las reglas del servidor son las que mandan;
// acá solo se arman los datos.

import {
  db, collection, doc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot,
  getDoc, query, orderBy, limit, where,
} from './firebase.js';
import { estado } from './estado.js';

const deseosCol = collection(db, 'wishlist_items');
const comidasCol = collection(db, 'food_items');
const gustosDoc = doc(db, 'preferences', 'lentina');
const entradasCol = collection(db, 'entries');
const borradoresCol = collection(db, 'drafts');
const fotosCol = collection(db, 'photos');
const fotosGrandesCol = collection(db, 'photo_files');
const ajustesDoc = doc(db, 'settings', 'couple');

let cortarEscuchas = [];

function escuchar(referencia, alRecibir) {
  cortarEscuchas.push(onSnapshot(referencia, alRecibir, () => {
    estado.errorConexion = true;
  }));
}

export function escucharDatos(alCambiar) {
  dejarDeEscuchar();

  escuchar(query(entradasCol, orderBy('fecha', 'desc'), limit(estado.cuantasEntradas)), (snap) => {
    estado.entradas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    estado.hayMasEntradas = snap.size === estado.cuantasEntradas;
    alCambiar();
  });

  escuchar(query(borradoresCol, where('autor', '==', estado.sesion)), (snap) => {
    estado.borradores = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    alCambiar();
  });

  escuchar(ajustesDoc, (snap) => {
    estado.ajustes = snap.exists() ? snap.data() : {};
    alCambiar();
  });

  escuchar(deseosCol, (snap) => {
    estado.deseos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    alCambiar();
  });

  escuchar(comidasCol, (snap) => {
    estado.comidas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    alCambiar();
  });

  // Los gustos de Lentina son la chuleta de regalos de Manuelito: las reglas
  // solo lo dejan leerlos a él, así que ni se piden desde la sesión de ella.
  if (estado.sesion === 'manolo') {
    escuchar(gustosDoc, (snap) => {
      estado.gustos = snap.exists() ? snap.data() : {};
      alCambiar();
    });
  }
}

export function dejarDeEscuchar() {
  cortarEscuchas.forEach((cortar) => cortar());
  cortarEscuchas = [];
  estado.entradas = [];
  estado.borradores = [];
  estado.deseos = [];
  estado.comidas = [];
  estado.gustos = {};
  estado.ajustes = {};
}

// ---------- Diario ----------

export async function crearEntrada(contenido, fotos) {
  const referencia = await addDoc(entradasCol, {
    ...contenido,
    autor: estado.sesion,
    fotos: [],
    reactions: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  if (fotos && fotos.length) {
    const ids = await guardarFotos(referencia.id, fotos);
    await updateDoc(doc(entradasCol, referencia.id), { fotos: ids });
  }
  return referencia.id;
}

export async function editarEntrada(id, contenido, fotos) {
  const cambios = { ...contenido, updatedAt: Date.now() };
  if (fotos) {
    const existentes = fotos.filter((f) => f.id).map((f) => f.id);
    const nuevas = fotos.filter((f) => !f.id);
    const ids = nuevas.length ? await guardarFotos(id, nuevas) : [];
    cambios.fotos = [...existentes, ...ids];
  }
  await updateDoc(doc(entradasCol, id), cambios);
}

export async function borrarEntrada(entrada) {
  for (const idFoto of entrada.fotos || []) {
    await borrarFoto(idFoto);
  }
  await deleteDoc(doc(entradasCol, entrada.id));
}

export function reaccionar(entrada, emoji) {
  const reacciones = { ...(entrada.reactions || {}) };
  if (reacciones[estado.sesion] === emoji) delete reacciones[estado.sesion];
  else reacciones[estado.sesion] = emoji;
  return updateDoc(doc(entradasCol, entrada.id), { reactions: reacciones });
}

// ---------- Borradores ----------

export function guardarBorrador(contenido, id) {
  const datos = { ...contenido, autor: estado.sesion, updatedAt: Date.now() };
  if (id) return updateDoc(doc(borradoresCol, id), datos);
  return addDoc(borradoresCol, { ...datos, createdAt: Date.now() });
}

export function borrarBorrador(id) {
  return deleteDoc(doc(borradoresCol, id));
}

// ---------- Fotos ----------
// Cada foto va en dos documentos: la miniatura, que se carga para la línea de
// tiempo, y la grande aparte, que solo se pide al abrirla. Así ver el diario no
// descarga megas de fotos que nadie miró.

async function guardarFotos(idEntrada, fotos) {
  const ids = [];
  for (let i = 0; i < fotos.length; i += 1) {
    const foto = fotos[i];
    const referencia = await addDoc(fotosCol, {
      autor: estado.sesion,
      entryId: idEntrada,
      orden: i,
      ancho: foto.ancho,
      alto: foto.alto,
      mini: foto.mini,
      createdAt: Date.now(),
    });
    await setDoc(doc(fotosGrandesCol, referencia.id), {
      autor: estado.sesion,
      entryId: idEntrada,
      grande: foto.grande,
    });
    ids.push(referencia.id);
  }
  return ids;
}

export async function borrarFotos(ids) {
  for (const id of ids || []) {
    await borrarFoto(id);
  }
}

async function borrarFoto(id) {
  try {
    await deleteDoc(doc(fotosGrandesCol, id));
    await deleteDoc(doc(fotosCol, id));
  } catch (e) {
    // Si ya no estaba, no hay nada que hacer.
  }
}

const miniaturasEnMemoria = new Map();

export async function traerMiniatura(id) {
  if (miniaturasEnMemoria.has(id)) return miniaturasEnMemoria.get(id);
  const instantanea = await getDoc(doc(fotosCol, id));
  const valor = instantanea.exists() ? instantanea.data().mini : null;
  miniaturasEnMemoria.set(id, valor);
  return valor;
}

export async function traerFotoGrande(id) {
  const instantanea = await getDoc(doc(fotosGrandesCol, id));
  return instantanea.exists() ? instantanea.data().grande : null;
}

// ---------- Ajustes ----------

export function guardarAjustes(datos) {
  return setDoc(ajustesDoc, datos, { merge: true });
}

// ---------- Deseos y comida ----------

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
