// Lectura y escritura en Firestore. Las reglas del servidor son las que mandan;
// acá solo se arman los datos.

import {
  db, collection, doc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot,
  getDoc, getDocs, query, orderBy, limit, where,
} from './firebase.js';
import { estado } from './estado.js';
import { hoy as fechaDeHoy } from './fechas.js';

const deseosCol = collection(db, 'wishlist_items');
const comidasCol = collection(db, 'food_items');
const gustosDoc = doc(db, 'preferences', 'lentina');
const entradasCol = collection(db, 'entries');
const borradoresCol = collection(db, 'drafts');
const fotosCol = collection(db, 'photos');
const fotosGrandesCol = collection(db, 'photo_files');
const respuestasCol = collection(db, 'answers');
const graciasCol = collection(db, 'gratitude');
const cartasCol = collection(db, 'letters');
const cartasTextoCol = collection(db, 'letter_bodies');
const lugaresCol = collection(db, 'places');
const planesCol = collection(db, 'plans');
const cancionesCol = collection(db, 'songs');
const recetasCol = collection(db, 'recipes');
const reservasCol = collection(db, 'reservations');
const audiosCol = collection(db, 'voice_notes');
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

  escuchar(query(respuestasCol, where('autor', '==', estado.sesion)), (snap) => {
    estado.misRespuestas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    alCambiar();
  });

  const otro = estado.sesion === 'lentina' ? 'manolo' : 'lentina';
  const deHoy = fechaDeHoy();
  escuchar(doc(graciasCol, `${deHoy}_${estado.sesion}`), (snap) => {
    estado.graciasHoy.mia = snap.exists() ? snap.data().texto : null;
    alCambiar();
  });
  escuchar(doc(graciasCol, `${deHoy}_${otro}`), (snap) => {
    estado.graciasHoy.suya = snap.exists() ? snap.data().texto : null;
    alCambiar();
  });

  escuchar(cartasCol, (snap) => {
    estado.cartas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    alCambiar();
  });

  escuchar(lugaresCol, (snap) => {
    estado.lugares = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    alCambiar();
  });

  escuchar(planesCol, (snap) => {
    estado.planes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    alCambiar();
  });

  escuchar(recetasCol, (snap) => {
    estado.recetas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    alCambiar();
  });

  escuchar(cancionesCol, (snap) => {
    estado.canciones = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    alCambiar();
  });

  // Solo las reservas propias: las del otro el servidor no las entrega, que es
  // justamente lo que mantiene la sorpresa.
  escuchar(query(reservasCol, where('autor', '==', estado.sesion)), (snap) => {
    estado.misReservas = snap.docs.map((d) => d.id);
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
  estado.cartas = [];
  estado.lugares = [];
  estado.planes = [];
  estado.canciones = [];
  estado.recetas = [];
  estado.misReservas = [];
  estado.deseos = [];
  estado.comidas = [];
  estado.gustos = {};
  estado.ajustes = {};
}

// ---------- Diario ----------

// ---------- Notas de voz ----------
// Cada una en su propio documento, que es lo más pesado que guardamos.

async function guardarAudios(idEntrada, audios) {
  const ids = [];
  let bytes = 0;
  for (const nota of audios) {
    bytes += nota.bytes || 0;
    const referencia = await addDoc(audiosCol, {
      autor: estado.sesion,
      entryId: idEntrada,
      segundos: nota.segundos,
      bytes: nota.bytes || 0,
      audio: nota.audio,
      createdAt: Date.now(),
    });
    ids.push(referencia.id);
  }
  if (ids.length) await contarFotos(0, bytes);
  return ids;
}

export async function borrarAudios(ids) {
  for (const id of ids || []) {
    try {
      const instantanea = await getDoc(doc(audiosCol, id));
      const bytes = instantanea.exists() ? (instantanea.data().bytes || 0) : 0;
      await deleteDoc(doc(audiosCol, id));
      await contarFotos(0, -bytes);
    } catch (e) {
      // Si ya no estaba, no hay nada que hacer.
    }
  }
}

const audiosEnMemoria = new Map();

export async function traerAudio(id) {
  if (audiosEnMemoria.has(id)) return audiosEnMemoria.get(id);
  const instantanea = await getDoc(doc(audiosCol, id));
  const valor = instantanea.exists() ? instantanea.data() : null;
  audiosEnMemoria.set(id, valor);
  return valor;
}

export async function crearEntrada(contenido, fotos, audios) {
  const referencia = await addDoc(entradasCol, {
    ...contenido,
    autor: estado.sesion,
    fotos: [],
    audios: [],
    reactions: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  const cambios = {};
  if (fotos && fotos.length) cambios.fotos = await guardarFotos(referencia.id, fotos);
  if (audios && audios.length) cambios.audios = await guardarAudios(referencia.id, audios);
  if (Object.keys(cambios).length) await updateDoc(doc(entradasCol, referencia.id), cambios);
  return referencia.id;
}

export async function editarEntrada(id, contenido, fotos, audios) {
  const cambios = { ...contenido, updatedAt: Date.now() };
  if (fotos) {
    const existentes = fotos.filter((f) => f.id).map((f) => f.id);
    const nuevas = fotos.filter((f) => !f.id);
    const ids = nuevas.length ? await guardarFotos(id, nuevas) : [];
    cambios.fotos = [...existentes, ...ids];
  }
  if (audios) {
    const existentes = audios.filter((a) => a.id).map((a) => a.id);
    const nuevas = audios.filter((a) => !a.id);
    const ids = nuevas.length ? await guardarAudios(id, nuevas) : [];
    cambios.audios = [...existentes, ...ids];
  }
  await updateDoc(doc(entradasCol, id), cambios);
}

export async function borrarEntrada(entrada) {
  for (const idFoto of entrada.fotos || []) {
    await borrarFoto(idFoto);
  }
  await borrarAudios(entrada.audios || []);
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
  let bytes = 0;
  for (let i = 0; i < fotos.length; i += 1) {
    const foto = fotos[i];
    const peso = foto.mini.length + foto.grande.length;
    bytes += peso;
    const referencia = await addDoc(fotosCol, {
      autor: estado.sesion,
      entryId: idEntrada,
      orden: i,
      ancho: foto.ancho,
      alto: foto.alto,
      bytes: peso,
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
  if (ids.length) await contarFotos(ids.length, bytes);
  return ids;
}

export async function borrarFotos(ids) {
  for (const id of ids || []) {
    await borrarFoto(id);
  }
}

async function borrarFoto(id) {
  try {
    const instantanea = await getDoc(doc(fotosCol, id));
    const bytes = instantanea.exists() ? (instantanea.data().bytes || 0) : 0;
    await deleteDoc(doc(fotosGrandesCol, id));
    await deleteDoc(doc(fotosCol, id));
    await contarFotos(-1, -bytes);
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

// El álbum sí descarga las miniaturas: es lo que viene a mirar.
export async function traerFotosDelAlbum(cuantas) {
  const snap = await getDocs(query(fotosCol, orderBy('createdAt', 'desc'), limit(cuantas)));
  return snap.docs.map((d) => {
    const datos = d.data();
    miniaturasEnMemoria.set(d.id, datos.mini);
    return { id: d.id, entryId: datos.entryId, mini: datos.mini, createdAt: datos.createdAt };
  });
}

// Un recuerdo al azar sin tener que descargar todos: se elige una fecha al azar
// del tiempo que llevamos juntos y se trae el recuerdo más cercano.
export async function recuerdoAlAzar(desde, hasta) {
  const inicio = new Date(`${desde}T12:00:00Z`).getTime();
  const fin = new Date(`${hasta}T12:00:00Z`).getTime();
  const alAzar = new Date(inicio + Math.random() * Math.max(1, fin - inicio));
  const fecha = alAzar.toISOString().slice(0, 10);

  const antes = await getDocs(query(
    entradasCol, where('fecha', '<=', fecha), orderBy('fecha', 'desc'), limit(1),
  ));
  if (antes.size) return { id: antes.docs[0].id, ...antes.docs[0].data() };

  const despues = await getDocs(query(
    entradasCol, where('fecha', '>=', fecha), orderBy('fecha', 'asc'), limit(1),
  ));
  if (despues.size) return { id: despues.docs[0].id, ...despues.docs[0].data() };
  return null;
}

export async function traerFotoGrande(id) {
  const instantanea = await getDoc(doc(fotosGrandesCol, id));
  return instantanea.exists() ? instantanea.data().grande : null;
}

// ---------- Comentarios ----------

export async function traerComentarios(idEntrada) {
  const snap = await getDocs(query(collection(db, 'entries', idEntrada, 'comments'), orderBy('createdAt', 'asc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function comentar(idEntrada, texto) {
  return addDoc(collection(db, 'entries', idEntrada, 'comments'), {
    autor: estado.sesion,
    texto,
    createdAt: Date.now(),
  });
}

export function borrarComentario(idEntrada, idComentario) {
  return deleteDoc(doc(db, 'entries', idEntrada, 'comments', idComentario));
}

// ---------- Calendario ----------

export async function traerMes(anioMes) {
  const snap = await getDocs(query(
    entradasCol,
    where('fecha', '>=', `${anioMes}-01`),
    where('fecha', '<=', `${anioMes}-31`),
  ));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---------- Pregunta del día ----------
// Un documento por persona y día. Las reglas solo dejan leer la respuesta del
// otro cuando ya existe la tuya, así que acá se pide y se acepta el "no".

export function guardarRespuesta(fecha, pregunta, texto) {
  return setDoc(doc(respuestasCol, `${fecha}_${estado.sesion}`), {
    autor: estado.sesion,
    date: fecha,
    pregunta,
    texto,
    createdAt: Date.now(),
  });
}

export async function traerRespuestaDelOtro(fecha) {
  const otro = estado.sesion === 'lentina' ? 'manolo' : 'lentina';
  try {
    const instantanea = await getDoc(doc(respuestasCol, `${fecha}_${otro}`));
    return instantanea.exists() ? instantanea.data().texto : null;
  } catch (e) {
    // permission-denied: respondió, pero todavía no te toca verla.
    return 'oculta';
  }
}

// ---------- Gracias del día ----------

export function guardarGracias(fecha, texto) {
  return setDoc(doc(graciasCol, `${fecha}_${estado.sesion}`), {
    autor: estado.sesion,
    date: fecha,
    texto,
    createdAt: Date.now(),
  });
}

// ---------- Cartas ----------
// El sobre y el texto van en documentos separados: así el servidor puede
// entregar uno y negar el otro hasta que llegue la fecha.

export async function crearCarta(sobre, texto) {
  const referencia = await addDoc(cartasCol, {
    ...sobre,
    autor: estado.sesion,
    abiertaEn: null,
    createdAt: Date.now(),
  });
  await setDoc(doc(cartasTextoCol, referencia.id), {
    autor: estado.sesion,
    abreEnMs: sobre.abreEnMs,
    texto,
  });
  return referencia.id;
}

export async function borrarCarta(id) {
  await deleteDoc(doc(cartasTextoCol, id));
  await deleteDoc(doc(cartasCol, id));
}

export function marcarCartaAbierta(id) {
  return updateDoc(doc(cartasCol, id), { abiertaEn: Date.now() });
}

export async function traerTextoDeCarta(id) {
  try {
    const instantanea = await getDoc(doc(cartasTextoCol, id));
    return instantanea.exists() ? instantanea.data().texto : null;
  } catch (e) {
    // permission-denied: todavía no llegó la fecha.
    return 'cerrada';
  }
}

// ---------- Lugares ----------

export function crearLugar(datos) {
  return addDoc(lugaresCol, { ...datos, autor: estado.sesion, createdAt: Date.now() });
}

export function borrarLugar(id) {
  return deleteDoc(doc(lugaresCol, id));
}

// ---------- Ajustes ----------

export function guardarAjustes(datos) {
  return setDoc(ajustesDoc, datos, { merge: true });
}

// Cuánto espacio llevan las fotos, para avisar antes de llegar al 1 GiB del
// plan gratis. Se lleva como contador porque sumarlo de verdad obligaría a
// descargar todas las fotos cada vez.
function contarFotos(cuantas, bytes) {
  const previo = estado.ajustes.almacenamiento || { fotos: 0, bytes: 0 };
  return guardarAjustes({
    almacenamiento: {
      fotos: Math.max(0, (previo.fotos || 0) + cuantas),
      bytes: Math.max(0, (previo.bytes || 0) + bytes),
    },
  });
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

export function alternarReserva(idDeseo, estabaReservado) {
  if (estabaReservado) return deleteDoc(doc(reservasCol, idDeseo));
  return setDoc(doc(reservasCol, idDeseo), { autor: estado.sesion, createdAt: Date.now() });
}

// ---------- Planes juntos ----------

export function crearPlan(datos) {
  return addDoc(planesCol, { ...datos, autor: estado.sesion, hecho: false, hechoEn: null, hechoPor: null, createdAt: Date.now() });
}

export function editarPlan(id, datos) {
  return updateDoc(doc(planesCol, id), datos);
}

export function marcarPlan(id, hecho) {
  return updateDoc(doc(planesCol, id), {
    hecho,
    hechoEn: hecho ? Date.now() : null,
    hechoPor: hecho ? estado.sesion : null,
  });
}

export function borrarPlan(id) {
  return deleteDoc(doc(planesCol, id));
}

// ---------- Recetas ----------

export function crearReceta(datos) {
  return addDoc(recetasCol, {
    ...datos,
    autor: estado.sesion,
    hecha: false,
    hechaEn: null,
    hechaPor: null,
    createdAt: Date.now(),
  });
}

export function editarReceta(id, datos) {
  return updateDoc(doc(recetasCol, id), datos);
}

export function marcarReceta(id, hecha) {
  return updateDoc(doc(recetasCol, id), {
    hecha,
    hechaEn: hecha ? Date.now() : null,
    hechaPor: hecha ? estado.sesion : null,
  });
}

export function borrarReceta(id) {
  return deleteDoc(doc(recetasCol, id));
}

// ---------- Canciones ----------

export function crearCancion(datos) {
  return addDoc(cancionesCol, { ...datos, autor: estado.sesion, createdAt: Date.now() });
}

export function borrarCancion(id) {
  return deleteDoc(doc(cancionesCol, id));
}

// ---------- Resumen del año ----------

export async function traerAnio(anio) {
  const snap = await getDocs(query(
    entradasCol, where('fecha', '>=', `${anio}-01-01`), where('fecha', '<=', `${anio}-12-31`),
  ));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
