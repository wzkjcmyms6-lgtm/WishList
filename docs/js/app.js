// Ositos — arranque, pantallas y acciones.

import { auth, onAuthStateChanged } from './firebase.js';
import {
  estado, PERFILES, CATEGORIAS_GUSTOS, ETIQUETAS, pareja, nombreDe, perfilDeCorreo,
  misDeseos, misComidas,
} from './estado.js';
import {
  raiz, escapar, avisar, comprimirFoto, comprimirFotoSimple,
  dibujarConfirmacion, dibujarFotoAmpliada, activarArrastreDeHoja,
} from './ui.js';
import { hoy, esFechaValida } from './fechas.js';
import { aplicarTema, guardarTema } from './tema.js';
import { armarRespaldo } from './secciones/respaldo.js';
import { empezarAGrabar } from './grabador.js';
import * as sesion from './auth.js';
import * as datos from './datos.js';
import { dibujarInicio } from './secciones/inicio.js';
import {
  dibujarDiario, dibujarHojaEntrada, cargarMiniaturas, dibujarCalendario,
} from './secciones/diario.js';
import { dibujarAlbum, dibujarVisor } from './secciones/album.js';
import { dibujarCartas, dibujarCartaAbierta, dibujarHojaCarta } from './secciones/cartas.js';
import { dibujarMapa, dibujarHojaLugar, montarMapa, centrarEn } from './secciones/mapa.js';
import { dibujarPlanes, dibujarHojaPlan, IDEAS_A_DISTANCIA } from './secciones/planes.js';
import { dibujarCanciones, dibujarHojaCancion } from './secciones/canciones.js';
import { dibujarRecetas, dibujarHojaReceta, IDEAS_DE_RECETAS } from './secciones/recetas.js';
import { dibujarResumen, calcularResumen } from './secciones/resumen.js';
import { activarVisor } from './visor.js';
import { dibujarPregunta, preguntaDeHoy } from './secciones/pregunta.js';
import { dibujarDeseos, dibujarHojaDeseo } from './secciones/deseos.js';
import { dibujarComidas, dibujarHojaComida } from './secciones/comida.js';
import { dibujarGustos } from './secciones/gustos.js';
import { dibujarAjustes } from './secciones/ajustes.js';

// El meta viewport no alcanza en iOS Safari: hay que bloquear el pellizco a
// mano. Se probó dejarlo libre para poder agrandar la letra, pero en el iPhone
// la página terminaba agrandada y corrida, con la hoja a medio salir de la
// pantalla y sin manera de volver. El doble toque ya lo bloquea
// "touch-action: manipulation" en el CSS.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
// Dentro del visor de fotos el pellizco sí sirve: ahí lo maneja visor.js para
// acercar la foto (y solo la foto, no toda la página).
document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1 && !estado.visor) e.preventDefault();
}, { passive: false });

const avisarYRedibujar = (mensaje) => { soltarCandado(); avisar(mensaje); dibujar(); };

const SECCIONES_LISTA = ['deseos', 'comida', 'gustos'];

// ---------- Pantallas ----------

function dibujarCargando() {
  return '<div class="screen-boot"><div class="boot-spinner"></div></div>';
}

function dibujarEsqueleto() {
  return `<div class="esqueleto" aria-busy="true">
    <div class="esqueleto-aviso">Trayendo lo nuestro…</div>
    ${'<div class="esqueleto-tarjeta"></div>'.repeat(3)}
  </div>`;
}

function dibujarErrorConexion() {
  return `<div class="screen-boot"><div class="empty-state">
    <div class="empty-emoji">⚠️</div>
    <div>No se pudo conectar.<br/>Revisa tu internet y recarga la página.</div>
  </div></div>`;
}

function dibujarPanel() {
  const perfil = PERFILES[estado.sesion];
  const nombrePareja = nombreDe(pareja());
  const seccion = estado.seccion;
  const enLista = SECCIONES_LISTA.includes(seccion);

  let contenido;
  // Antes de que llegue la primera respuesta de Firestore, las listas están
  // vacías y la app decía "todavía no hay nada", que con internet lento se lee
  // como si el diario se hubiera borrado. Mejor decir que está cargando.
  if (!estado.datosListos && seccion !== 'ajustes') contenido = dibujarEsqueleto();
  else if (seccion === 'inicio') contenido = dibujarInicio();
  else if (seccion === 'diario') contenido = vistaDelDiario();
  else if (seccion === 'pregunta') contenido = dibujarPregunta();
  else if (seccion === 'cartas') contenido = dibujarCartas();
  else if (seccion === 'mapa') contenido = dibujarMapa();
  else if (seccion === 'planes') contenido = dibujarPlanes();
  else if (seccion === 'canciones') contenido = dibujarCanciones();
  else if (seccion === 'recetas') contenido = dibujarRecetas();
  else if (seccion === 'resumen') contenido = dibujarResumen();
  else if (seccion === 'ajustes') contenido = dibujarAjustes();
  else if (seccion === 'gustos') contenido = dibujarGustos();
  else if (seccion === 'comida') contenido = dibujarComidas();
  else contenido = dibujarDeseos();

  const bajadas = {
    inicio: 'Lo nuestro, de un vistazo',
    diario: { lista: 'Nuestros recuerdos', calendario: 'Nuestro calendario', album: 'Todas nuestras fotos' }[estado.vistaDiario],
    pregunta: 'Para conocernos más',
    cartas: 'Para abrir después',
    mapa: 'Nuestros lugares',
    planes: 'Cosas por hacer juntos',
    canciones: 'La banda sonora',
    recetas: 'Lo que queremos cocinar',
    resumen: 'Nuestro año',
    ajustes: 'Tu cuenta y este celular',
    gustos: `Lo que le gusta a ${escapar(nombrePareja)}`,
    comida: estado.pestana === 'mia' ? 'Tus comidas favoritas' : `Las comidas de ${escapar(nombrePareja)}`,
    deseos: estado.pestana === 'mia' ? 'Estos son tus deseos' : `Los deseos de ${escapar(nombrePareja)}`,
  };

  const pestanasSeccion = enLista ? `<div class="tabs">
    <button class="tab-btn ${seccion === 'deseos' ? 'active' : ''}" data-accion="seccion" data-seccion="deseos">🎁 Deseos</button>
    <button class="tab-btn ${seccion === 'comida' ? 'active' : ''}" data-accion="seccion" data-seccion="comida">🍽️ Comida</button>
    ${estado.sesion === 'manolo'
      ? `<button class="tab-btn ${seccion === 'gustos' ? 'active' : ''}" data-accion="seccion" data-seccion="gustos">💐 Gustos</button>`
      : ''}
  </div>` : '';

  const pestanasPersona = (enLista && seccion !== 'gustos') ? `<div class="tabs">
    <button class="tab-btn ${estado.pestana === 'mia' ? 'active' : ''}" data-accion="pestana" data-pestana="mia">Mi lista</button>
    <button class="tab-btn ${estado.pestana === 'pareja' ? 'active' : ''}" data-accion="pestana" data-pestana="pareja">${escapar(nombrePareja)}</button>
  </div>` : '';

  let fab = '';
  if (seccion === 'diario' && estado.vistaDiario === 'lista') fab = '<button class="fab" aria-label="Escribir un recuerdo" data-accion="nueva-entrada">+</button>';
  else if (enLista && seccion !== 'gustos' && estado.pestana === 'mia') {
    fab = `<button class="fab" aria-label="${seccion === 'comida' ? 'Agregar una comida' : 'Agregar un deseo'}"
                  data-accion="${seccion === 'comida' ? 'nueva-comida' : 'nuevo-deseo'}">+</button>`;
  }

  const navegacion = [
    { clave: 'inicio', icono: '🏠', texto: 'Inicio' },
    { clave: 'diario', icono: '📖', texto: 'Diario' },
    { clave: 'pregunta', icono: '💬', texto: 'Pregunta' },
    { clave: 'deseos', icono: '🎁', texto: 'Deseos' },
    { clave: 'ajustes', icono: '⚙️', texto: 'Ajustes' },
  ].map((item) => {
    const activo = item.clave === 'deseos' ? enLista : seccion === item.clave;
    return `<button class="nav-item ${activo ? 'active' : ''}" data-accion="seccion" data-seccion="${item.clave}">
      <span class="nav-icon">${item.icono}</span>${item.texto}</button>`;
  }).join('');

  const sinInternet = estado.sinInternet
    ? `<div class="sin-internet">Sin internet. Lo que escribas se guarda y se sube cuando vuelva.</div>`
    : '';

  return `<div class="screen-dashboard">
    <div class="dash-header">
      <div>
        <div class="dash-greeting">Hola, ${escapar(nombreDe(estado.sesion))} ${perfil.emoji}</div>
        <div class="dash-sub">${bajadas[seccion] || ''}</div>
      </div>
    </div>
    ${sinInternet}
    ${pestanasSeccion}
    ${pestanasPersona}
    <div class="dashboard-scroll">${contenido}</div>
    ${fab}
    <div class="bottom-nav">${navegacion}</div>
  </div>`;
}

function dibujarHoja() {
  if (!estado.hoja) return '';
  if (estado.hoja.tipo === 'carta') return dibujarHojaCarta();
  if (estado.hoja.tipo === 'lugar') return dibujarHojaLugar();
  if (estado.hoja.tipo === 'plan') return dibujarHojaPlan();
  if (estado.hoja.tipo === 'cancion') return dibujarHojaCancion();
  if (estado.hoja.tipo === 'receta') return dibujarHojaReceta();
  if (estado.hoja.tipo === 'entrada') return dibujarHojaEntrada();
  if (estado.hoja.tipo === 'comida') return dibujarHojaComida();
  return dibujarHojaDeseo();
}

// ---------- Redibujar sin pisarle la mano al que está usando la app ----------
//
// La pantalla entera se vuelve a escribir en cada cambio: eso mantiene el
// código simple, pero borraba tres cosas que la persona estaba usando justo en
// ese momento. Esto las guarda antes de reemplazar el HTML y las devuelve
// después.

// 1) Los nodos que no se pueden recrear sin cortar lo que hacen: la nota de
//    voz que suena y el reproductor de Spotify. Se sacan del árbol viejo y se
//    vuelven a meter en el nuevo, el mismo nodo, sin perder el segundo en que
//    iban.
const nodosVivos = new Map();

function apartarNodosVivos() {
  nodosVivos.clear();
  raiz.querySelectorAll('[data-persistente]').forEach((nodo) => {
    nodosVivos.set(nodo.dataset.persistente, nodo);
    nodo.remove();
  });
}

function devolverNodosVivos() {
  if (!nodosVivos.size) return;
  raiz.querySelectorAll('[data-persistente]').forEach((hueco) => {
    const vivo = nodosVivos.get(hueco.dataset.persistente);
    if (vivo && vivo !== hueco) hueco.replaceWith(vivo);
  });
  nodosVivos.clear();
}

// 2) Dónde estaba el scroll y en qué campo estaba escribiendo.
//
// Ojo: para cuando se redibuja, estado.seccion ya es la nueva, así que hay que
// guardarse a mano en qué pantalla estaba lo que se va a reemplazar. Si no, al
// cambiar de sección la nueva aparecía con el scroll de la anterior.
let pantallaDibujada = null;

function dondeEstamos() {
  return `${estado.pantalla}|${estado.seccion}|${estado.pestana}|${estado.vistaDiario}|${estado.filtroPlan}|${estado.filtroReceta}`;
}

function senaDelCampo(campo) {
  if (!campo || !campo.tagName) return null;
  if (!['INPUT', 'TEXTAREA'].includes(campo.tagName)) return null;
  if (campo.id) return `#${campo.id}`;
  const formulario = campo.closest('form');
  if (formulario && formulario.id && campo.name) return `#${formulario.id} [name="${campo.name}"]`;
  return campo.name ? `[name="${campo.name}"]` : null;
}

const CAMPOS_CON_CURSOR = ['text', 'search', 'url', 'tel', 'password', 'textarea'];

function cursorDe(campo) {
  const tipo = campo.tagName === 'TEXTAREA' ? 'textarea' : campo.type;
  if (!CAMPOS_CON_CURSOR.includes(tipo)) return { desde: null, hasta: null };
  return { desde: campo.selectionStart, hasta: campo.selectionEnd };
}

// El último campo que se estaba usando, con su cursor. Se guarda al salir de
// él porque en Chrome tocar un botón le quita el foco antes de redibujar.
let ultimoCampo = null;
raiz.addEventListener('focusout', (evento) => {
  const sena = senaDelCampo(evento.target);
  if (sena) ultimoCampo = { campo: sena, ...cursorDe(evento.target) };
}, true);

function recordarPantalla() {
  const lista = raiz.querySelector('.dashboard-scroll');
  const hoja = raiz.querySelector('.sheet');
  const activo = document.activeElement;
  const escribiendo = activo && raiz.contains(activo) ? senaDelCampo(activo) : null;
  // Si el foco ya se fue a un botón (el ánimo, una etiqueta), se usa el último
  // campo, pero solo mientras siga abierta la hoja: así el teclado no reaparece
  // de la nada en una pantalla donde nadie estaba escribiendo.
  const deAntes = !escribiendo && estado.hoja ? ultimoCampo : null;
  return {
    donde: pantallaDibujada,
    scroll: lista ? lista.scrollTop : 0,
    scrollHoja: hoja ? hoja.scrollTop : 0,
    campo: escribiendo || (deAntes && deAntes.campo) || null,
    ...(escribiendo ? cursorDe(activo) : { desde: deAntes ? deAntes.desde : null, hasta: deAntes ? deAntes.hasta : null }),
    soloEnLaHoja: Boolean(deAntes),
  };
}

function devolverPantalla(memoria) {
  // Si cambió de sección, el scroll empieza arriba: ahí sí corresponde.
  if (memoria.scroll && memoria.donde === dondeEstamos()) {
    const lista = raiz.querySelector('.dashboard-scroll');
    if (lista) lista.scrollTop = memoria.scroll;
  }
  if (memoria.scrollHoja) {
    const hoja = raiz.querySelector('.sheet');
    if (hoja) hoja.scrollTop = memoria.scrollHoja;
  }
  if (!memoria.campo) return;
  const campo = raiz.querySelector(memoria.campo);
  if (!campo || campo === document.activeElement) return;
  if (memoria.soloEnLaHoja && !campo.closest('.sheet')) return;
  campo.focus({ preventScroll: true });
  if (memoria.desde !== null) {
    try { campo.setSelectionRange(memoria.desde, memoria.hasta); } catch (e) { /* no todos lo aceptan */ }
  }
}

// 3) Al abrir una hoja para escribir algo nuevo, el teclado aparece solo:
//    escribir un recuerdo tiene que costar menos de 30 segundos.
let hojaAnterior = null;

function senaDeLaHoja() {
  if (!estado.hoja) return null;
  return `${estado.hoja.tipo}|${estado.hoja.modo || 'nuevo'}|${(estado.hoja.item && estado.hoja.item.id) || ''}`;
}

function enfocarHojaNueva() {
  const sena = senaDeLaHoja();
  const esNueva = sena && sena !== hojaAnterior;
  hojaAnterior = sena;
  if (!esNueva || estado.hoja.modo === 'editar') return;
  const hoja = raiz.querySelector('.sheet');
  if (!hoja) return;
  const primero = hoja.querySelector('textarea, input[type="text"]');
  if (primero) primero.focus({ preventScroll: true });
}

// El candado de guardado. Antes se soltaba en cada dibujado, y eso lo dejaba
// inútil justo donde hacía falta: Firestore muestra el dato en pantalla —y por
// lo tanto redibuja— apenas lo guarda en el celular, pero la promesa recién se
// cumple cuando el servidor contesta. En ese rato el botón volvía a quedar
// vivo, la hoja seguía abierta, y un segundo toque creaba el deseo de nuevo.
let guardando = false;
let sueltaDelCandado = null;

function soltarCandado() {
  guardando = false;
  clearTimeout(sueltaDelCandado);
}

function dibujar() {
  const memoria = recordarPantalla();
  apartarNodosVivos();

  let html;
  if (estado.pantalla === 'cargando') html = dibujarCargando();
  else if (estado.errorConexion && estado.pantalla !== 'panel') html = dibujarErrorConexion();
  else if (estado.pantalla === 'perfiles') html = sesion.dibujarPerfiles();
  else if (estado.pantalla === 'clave') html = sesion.dibujarClave();
  else if (estado.pantalla === 'pin-crear') html = sesion.dibujarPin('crear');
  else if (estado.pantalla === 'pin-abrir') html = sesion.dibujarPin('abrir');
  else html = dibujarPanel();

  if (estado.actualizacion) {
    html += `<div class="aviso-version">
      <span>Hay una versión nueva de Ositos</span>
      <button class="btn btn-primary" data-accion="actualizar-app">Actualizar</button>
    </div>`;
  }
  html += dibujarHoja();
  html += dibujarConfirmacion();
  html += dibujarFotoAmpliada();
  html += dibujarVisor();
  html += dibujarCartaAbierta();

  raiz.innerHTML = html;
  devolverNodosVivos();
  conectarEventos();
  cargarMiniaturas(raiz);
  if (estado.seccion === 'mapa' && estado.pantalla === 'panel') {
    montarMapa(raiz, { alTocarMapa: tocaronElMapa });
  }
  devolverPantalla(memoria);
  enfocarHojaNueva();
  pantallaDibujada = dondeEstamos();
  sincronizarHistorial();
}

// ---------- Sesión ----------

onAuthStateChanged(auth, async (usuario) => {
  if (!usuario) {
    datos.dejarDeEscuchar();
    estado.sesion = null;
    estado.pantalla = 'perfiles';
    estado.pinBuffer = '';
    estado.pinConfirmando = null;
    estado.errorAcceso = '';
    dibujar();
    return;
  }

  const perfil = perfilDeCorreo(usuario.email);
  if (!perfil) {
    // Una cuenta que no es ninguna de las dos no tiene nada que hacer acá.
    await sesion.salir();
    return;
  }

  estado.sesion = perfil;
  estado.pinBuffer = '';
  estado.pinError = false;
  estado.pinConfirmando = null;
  estado.errorAcceso = '';
  if (sesion.tienePin(perfil)) estado.pantalla = 'pin-abrir';
  else if (sesion.prefiereSinPin(perfil)) estado.pantalla = 'panel';
  else estado.pantalla = 'pin-crear';
  datos.escucharDatos(dibujar);
  dibujar();
});

function entrarAlPanel() {
  estado.pantalla = 'panel';
  estado.seccion = 'inicio';
  estado.pestana = 'mia';
  estado.busqueda = '';
  estado.orden = 'recientes';
  dibujar();
}

// Actualiza solo lo que cambia en la pantalla del PIN. Si se redibujara todo,
// la animación de entrada se repetiría en cada tecla y la pantalla "saltaría".
function refrescarPin() {
  const puntos = raiz.querySelector('.pin-dots');
  if (puntos) puntos.innerHTML = sesion.dibujarPuntos();
  const error = raiz.querySelector('.error-text');
  if (error) error.textContent = estado.errorAcceso;
  const titulo = raiz.querySelector('.pin-greeting');
  if (titulo && estado.pantalla === 'pin-crear') {
    titulo.textContent = estado.pinConfirmando ? 'Repítelo para confirmar' : 'Elige un PIN de 4 dígitos';
  }
}

async function marcarDigito(digito) {
  if (estado.pinBuffer.length >= 4) return;
  estado.pinBuffer += digito;
  estado.pinError = false;
  estado.errorAcceso = '';
  refrescarPin();
  if (estado.pinBuffer.length < 4) return;

  const pin = estado.pinBuffer;

  if (estado.pantalla === 'pin-crear') {
    if (!estado.pinConfirmando) {
      estado.pinConfirmando = pin;
      estado.pinBuffer = '';
      refrescarPin();
      return;
    }
    if (estado.pinConfirmando !== pin) {
      estado.pinError = true;
      estado.errorAcceso = 'No coincide. Empecemos de nuevo.';
      refrescarPin();
      setTimeout(() => {
        estado.pinConfirmando = null;
        estado.pinBuffer = '';
        estado.pinError = false;
        estado.errorAcceso = '';
        refrescarPin();
      }, 700);
      return;
    }
    await sesion.guardarPin(estado.sesion, pin);
    sesion.recordarSinPin(estado.sesion, false);
    estado.pinBuffer = '';
    estado.pinConfirmando = null;
    entrarAlPanel();
    return;
  }

  if (await sesion.verificarPin(estado.sesion, pin)) {
    estado.pinBuffer = '';
    entrarAlPanel();
    return;
  }

  estado.pinError = true;
  refrescarPin();
  setTimeout(() => {
    estado.pinBuffer = '';
    estado.pinError = false;
    refrescarPin();
  }, 450);
}

// ---------- Hojas ----------

const deseoVacio = () => ({ title: '', description: '', price: '', url: '', image: '' });
const comidaVacia = () => ({ name: '', restaurant: '', note: '' });
const entradaVacia = () => ({ texto: '', fecha: hoy(), animo: '', etiquetas: [], lugar: '' });

function abrirHoja(tipo, modo, item, extra = {}) {
  estado.hoja = { tipo, modo, item: { ...item }, subiendo: false, ...extra };
  dibujar();
}

function cerrarHoja() {
  estado.hoja = null;
  dibujar();
}

// Tocar fuera de la hoja (o arrastrarla hacia abajo) es fácil de hacer sin
// querer, y antes se llevaba puesto todo lo escrito sin avisar.
function cerrarHojaConCuidado() {
  if (!estado.hoja) return;
  sincronizarHoja();
  const item = estado.hoja.item || {};
  const hayAlgo = ['texto', 'titulo', 'title', 'nota', 'name', 'nombre', 'historia', 'ingredientes', 'pasos']
    .some((campo) => String(item[campo] || '').trim().length > 2);
  if (!hayAlgo || estado.hoja.modo === 'editar') { cerrarHoja(); return; }
  preguntar('¿Cierras sin guardar lo que escribiste?', cerrarHoja, {
    si: 'Cerrar y descartar',
    no: 'Seguir escribiendo',
  });
}

// ---------- El botón (o el gesto) de "atrás" del celular ----------
//
// Antes salía de la app aunque hubiera una hoja abierta, porque la app nunca
// tocaba el historial. Ahora cada cosa que se abre deja una marca, así que
// "atrás" cierra lo de encima: primero el visor o la hoja, después la sección,
// y recién en Inicio sale.

// Se guarda UNA sola marca en el historial mientras haya algo que cerrar, y se
// vuelve a poner después de cada "atrás". Nunca se saca a mano: history.go()
// es asíncrono y la cuenta se desincronizaba, lo que terminaba sacando de la
// app en vez de cerrar la hoja.
let marcaEnHistorial = false;

function hayAlgoQueCerrar() {
  if (estado.pantalla !== 'panel') return false;
  return Boolean(estado.hoja || estado.confirmacion || estado.visor || estado.fotoAmpliada
    || estado.cartaAbierta || estado.vistaDiario !== 'lista' || estado.seccion !== 'inicio');
}

function sincronizarHistorial() {
  if (!marcaEnHistorial && hayAlgoQueCerrar()) {
    history.pushState({ ositos: true }, '');
    marcaEnHistorial = true;
  }
}

function cerrarUnaCapa() {
  if (estado.visor) { estado.visor = null; return; }
  if (estado.fotoAmpliada) { estado.fotoAmpliada = null; return; }
  if (estado.confirmacion) { estado.confirmacion = null; return; }
  if (estado.cartaAbierta) { estado.cartaAbierta = null; return; }
  if (estado.hoja) { estado.hoja = null; return; }
  if (estado.vistaDiario !== 'lista') { estado.vistaDiario = 'lista'; estado.diaElegido = ''; return; }
  if (estado.seccion !== 'inicio') { estado.seccion = 'inicio'; }
}

window.addEventListener('popstate', () => {
  marcaEnHistorial = false;
  if (!hayAlgoQueCerrar()) return;  // ya estaba en Inicio: que salga, si quiere
  cerrarUnaCapa();
  dibujar();                        // y vuelve a dejar la marca si queda algo
});

async function abrirHojaEntrada(modo, entrada) {
  const item = entrada ? { ...entrada, etiquetas: [...(entrada.etiquetas || [])] } : entradaVacia();
  abrirHoja('entrada', modo, item, {
    fotos: (entrada?.fotos || []).map((id) => ({ id, mini: null })),
    fotosQuitadas: [],
    audios: (entrada?.audios || []).map((id) => ({ id, segundos: 0 })),
    audiosQuitados: [],
    grabando: null,
  });
  // Las miniaturas de las fotos que ya tenía se piden después, sin trabar la hoja.
  if (estado.hoja.fotos.length) {
    for (const foto of estado.hoja.fotos) {
      foto.mini = await datos.traerMiniatura(foto.id);
    }
    if (estado.hoja && estado.hoja.tipo === 'entrada') dibujar();
  }
}

// Guarda lo escrito antes de redibujar, para no perderlo al subir una foto.
function sincronizarHoja() {
  // Cualquier formulario que esté dentro de la hoja: así no hay que acordarse
  // de agregarlo a una lista cada vez que aparece una pantalla nueva.
  const formulario = raiz.querySelector('.sheet form');
  if (!formulario || !estado.hoja) return;
  const campos = new FormData(formulario);
  for (const [clave, valor] of campos.entries()) {
    if (clave === 'image') continue;
    estado.hoja.item[clave] = valor;
  }
}

async function elegirFotoDeseo(archivo) {
  if (!archivo) return;
  sincronizarHoja();
  estado.hoja.subiendo = true;
  dibujar();
  try {
    estado.hoja.item.image = await comprimirFotoSimple(archivo);
  } catch (e) {
    avisarYRedibujar(e.message || 'No se pudo procesar la imagen');
  } finally {
    estado.hoja.subiendo = false;
    dibujar();
  }
}

async function elegirFotoReceta(archivo) {
  if (!archivo) return;
  sincronizarHoja();
  estado.hoja.subiendo = true;
  dibujar();
  try {
    estado.hoja.item.foto = await comprimirFotoSimple(archivo);
  } catch (e) {
    avisarYRedibujar(e.message || 'No se pudo procesar la imagen');
  } finally {
    estado.hoja.subiendo = false;
    dibujar();
  }
}

async function elegirFotosEntrada(archivos) {
  if (!archivos || !archivos.length) return;
  sincronizarHoja();
  estado.hoja.subiendo = true;
  dibujar();
  try {
    const espacio = 6 - estado.hoja.fotos.length;
    for (const archivo of [...archivos].slice(0, espacio)) {
      estado.hoja.fotos.push(await comprimirFoto(archivo));
    }
  } catch (e) {
    avisarYRedibujar(e.message || 'No se pudo procesar la imagen');
  } finally {
    estado.hoja.subiendo = false;
    dibujar();
  }
}

function preguntar(mensaje, alConfirmar, opciones = {}) {
  estado.confirmacion = { mensaje, alConfirmar, ...opciones };
  dibujar();
}

// ---------- Guardados ----------

function leerEntradaDelFormulario() {
  sincronizarHoja();
  const item = estado.hoja.item;
  const fecha = esFechaValida(item.fecha) ? item.fecha : hoy();
  return {
    texto: String(item.texto || '').trim().slice(0, 5000),
    fecha,
    animo: item.animo || '',
    etiquetas: item.etiquetas || [],
    lugar: String(item.lugar || '').trim().slice(0, 120),
  };
}

async function guardarEntrada() {
  const contenido = leerEntradaDelFormulario();
  if (!contenido.texto) { avisarYRedibujar('Escribe algo, aunque sea una línea'); return; }

  const { modo, item, fotos, fotosQuitadas, audios, audiosQuitados } = estado.hoja;
  // La hoja se cierra ya: el recuerdo está guardado en el celular y aparece en
  // la lista al instante; lo que falta es la confirmación del servidor. Si esa
  // falla de verdad, la hoja vuelve con todo lo escrito.
  const hojaPorSiFalla = estado.hoja;
  estado.hoja = null;
  avisarYRedibujar(modo === 'editar' ? 'Recuerdo guardado' : '¡Guardado! 💛');
  try {
    if (modo === 'editar') {
      await datos.editarEntrada(item.id, contenido, fotos, audios);
      if (fotosQuitadas.length) await datos.borrarFotos(fotosQuitadas);
      if (audiosQuitados.length) await datos.borrarAudios(audiosQuitados);
    } else {
      const nuevas = fotos.filter((f) => !f.id);
      const nuevosAudios = audios.filter((a) => !a.id);
      await datos.crearEntrada(contenido, nuevas, nuevosAudios);
      if (modo === 'borrador') await datos.borrarBorrador(item.id);
    }
  } catch (e) {
    estado.hoja = hojaPorSiFalla;
    avisarYRedibujar('No se pudo guardar. Revisa tu conexión.');
  }
}

async function guardarComoBorrador() {
  const contenido = leerEntradaDelFormulario();
  if (!contenido.texto) { avisarYRedibujar('Escribe algo primero'); return; }
  if (estado.hoja.fotos.some((f) => !f.id)) {
    avisarYRedibujar('Las fotos se guardan al publicar el recuerdo');
  }
  try {
    await datos.guardarBorrador(contenido, estado.hoja.modo === 'borrador' ? estado.hoja.item.id : null);
    estado.hoja = null;
    avisarYRedibujar('Guardado como borrador');
  } catch (e) {
    avisarYRedibujar('No se pudo guardar. Revisa tu conexión.');
  }
}

async function guardarDeseo(campos) {
  const titulo = (campos.title || '').trim();
  if (!titulo) { avisarYRedibujar('Pon un título para el deseo'); return; }
  const contenido = {
    title: titulo.slice(0, 200),
    description: (campos.description || '').trim().slice(0, 1000),
    url: (campos.url || '').trim().slice(0, 500),
    price: (campos.price || '').trim().slice(0, 50),
    image: campos.image || '',
  };
  const esNuevo = estado.hoja.modo === 'nuevo';
  const id = esNuevo ? null : estado.hoja.item.id;
  const hojaPorSiFalla = estado.hoja;
  estado.hoja = null;
  avisarYRedibujar(esNuevo ? '¡Agregado a tu lista! 🎉' : 'Cambios guardados');
  try {
    if (esNuevo) await datos.crearDeseo(contenido);
    else await datos.editarDeseo(id, contenido);
  } catch (e) {
    estado.hoja = hojaPorSiFalla;
    avisarYRedibujar('No se pudo guardar. Revisa tu conexión.');
  }
}

async function guardarComida(campos) {
  const nombre = (campos.name || '').trim();
  if (!nombre) { avisarYRedibujar('Pon el nombre de la comida'); return; }
  const contenido = {
    name: nombre.slice(0, 120),
    restaurant: (campos.restaurant || '').trim().slice(0, 150),
    note: (campos.note || '').trim().slice(0, 300),
  };
  const esNueva = estado.hoja.modo === 'nuevo';
  const id = esNueva ? null : estado.hoja.item.id;
  const hojaPorSiFalla = estado.hoja;
  estado.hoja = null;
  avisarYRedibujar(esNueva ? '¡Agregado! 🍽️' : 'Cambios guardados');
  try {
    if (esNueva) await datos.crearComida(contenido);
    else await datos.editarComida(id, contenido);
  } catch (e) {
    estado.hoja = hojaPorSiFalla;
    avisarYRedibujar('No se pudo guardar. Revisa tu conexión.');
  }
}

async function guardarGustos(campos) {
  try {
    await datos.guardarGustos(campos);
    avisarYRedibujar('Guardado 💐');
  } catch (e) {
    avisarYRedibujar('No se pudo guardar. Revisa tu conexión.');
  }
}

async function cambiarClave(formulario) {
  const campos = new FormData(formulario);
  const actual = campos.get('actual');
  const nueva = campos.get('nueva');
  const repetir = campos.get('repetir');

  if (nueva !== repetir) { avisarYRedibujar('Las dos contraseñas nuevas no coinciden'); return; }
  if (String(nueva).length < 6) { avisarYRedibujar('La nueva necesita al menos 6 caracteres'); return; }

  try {
    await sesion.cambiarClave(actual, nueva);
    avisarYRedibujar('Contraseña cambiada ✅');
  } catch (e) {
    avisarYRedibujar(sesion.mensajeDeError(e));
  }
}

async function entrar(clave) {
  estado.entrando = true;
  estado.errorAcceso = '';
  dibujar();
  try {
    await sesion.entrarConClave(estado.perfilElegido, clave);
    // onAuthStateChanged se encarga de lo que sigue.
  } catch (e) {
    estado.errorAcceso = sesion.mensajeDeError(e);
  } finally {
    estado.entrando = false;
    soltarCandado();
    if (!estado.sesion) dibujar();
  }
}

async function abrirFotoGrande(id) {
  estado.fotoAmpliada = 'cargando';
  dibujar();
  try {
    const grande = await datos.traerFotoGrande(id);
    estado.fotoAmpliada = grande || (await datos.traerMiniatura(id));
  } catch (e) {
    estado.fotoAmpliada = null;
    avisarYRedibujar('No se pudo abrir la foto');
    return;
  }
  dibujar();
}

// ---------- Eventos ----------

const acciones = {
  'elegir-perfil': (elemento) => {
    estado.perfilElegido = elemento.dataset.id;
    estado.errorAcceso = '';
    estado.pantalla = 'clave';
    dibujar();
  },
  'volver-perfiles': () => {
    estado.perfilElegido = null;
    estado.errorAcceso = '';
    estado.pantalla = 'perfiles';
    dibujar();
  },
  'ver-clave': () => {
    const campo = raiz.querySelector('#campo-clave');
    const boton = raiz.querySelector('[data-accion="ver-clave"]');
    const oculto = campo.type === 'password';
    campo.type = oculto ? 'text' : 'password';
    boton.textContent = oculto ? '🙈 Ocultar la contraseña' : '👁 Ver la contraseña';
  },
  'pin-digito': (elemento) => marcarDigito(elemento.dataset.digito),
  'pin-borrar': () => {
    if (!estado.pinBuffer.length) return;
    estado.pinBuffer = estado.pinBuffer.slice(0, -1);
    estado.pinError = false;
    refrescarPin();
  },
  'saltar-pin': () => {
    sesion.recordarSinPin(estado.sesion, true);
    entrarAlPanel();
  },
  'olvide-pin': async () => {
    sesion.borrarPin(estado.sesion);
    await sesion.salir();
  },
  'salir': async () => { await sesion.salir(); },
  'configurar-pin': () => {
    estado.pinBuffer = '';
    estado.pinConfirmando = null;
    estado.pinError = false;
    estado.errorAcceso = '';
    estado.pantalla = 'pin-crear';
    dibujar();
  },
  'descargar-respaldo': () => descargarRespaldo(),
  'actualizar-app': () => {
    if (estado.actualizacion) estado.actualizacion.postMessage('actualizar');
    window.location.reload();
  },
  'elegir-tema': (elemento) => {
    guardarTema(elemento.dataset.valor);
    dibujar();
  },
  'quitar-pin': () => {
    sesion.borrarPin(estado.sesion);
    sesion.recordarSinPin(estado.sesion, true);
    avisarYRedibujar('Candado quitado de este celular');
  },

  'seccion': (elemento) => {
    estado.seccion = elemento.dataset.seccion;
    estado.busqueda = '';
    estado.orden = 'recientes';
    estado.vistaDiario = 'lista';
    dibujar();
    if (estado.seccion === 'pregunta') cargarRespuestasDelOtro();
  },
  'pestana': (elemento) => {
    estado.pestana = elemento.dataset.pestana;
    estado.busqueda = '';
    estado.orden = 'recientes';
    dibujar();
  },
  'ir-ajustes': () => { estado.seccion = 'ajustes'; dibujar(); },
  'ir-diario': () => { estado.seccion = 'diario'; dibujar(); },

  'nueva-entrada': () => abrirHojaEntrada('nuevo', null),
  'editar-entrada': (elemento) => {
    const entrada = estado.entradas.find((e) => e.id === elemento.dataset.id);
    if (entrada) abrirHojaEntrada('editar', entrada);
  },
  'editar-borrador': (elemento) => {
    const borrador = estado.borradores.find((b) => b.id === elemento.dataset.id);
    if (borrador) abrirHojaEntrada('borrador', borrador);
  },
  'borrar-entrada': (elemento) => {
    const id = elemento.dataset.id;
    preguntar('¿Borrar este recuerdo? No se puede deshacer.', async () => {
      const entrada = estado.entradas.find((e) => e.id === id);
      try {
        if (entrada) await datos.borrarEntrada(entrada);
        estado.hoja = null;
        avisarYRedibujar('Recuerdo borrado');
      } catch (e) {
        avisarYRedibujar('No se pudo borrar');
      }
    });
  },
  'borrar-borrador': (elemento) => {
    const id = elemento.dataset.id;
    preguntar('¿Borrar este borrador?', async () => {
      try {
        await datos.borrarBorrador(id);
        estado.hoja = null;
        avisarYRedibujar('Borrador borrado');
      } catch (e) {
        avisarYRedibujar('No se pudo borrar');
      }
    });
  },
  'guardar-borrador': () => guardarComoBorrador(),
  'reaccionar': async (elemento) => {
    const entrada = estado.entradas.find((e) => e.id === elemento.dataset.id);
    if (!entrada) return;
    try {
      await datos.reaccionar(entrada, elemento.dataset.emoji);
    } catch (e) {
      avisarYRedibujar('No se pudo reaccionar');
    }
  },
  'elegir-animo': (elemento) => {
    sincronizarHoja();
    const emoji = elemento.dataset.emoji;
    estado.hoja.item.animo = estado.hoja.item.animo === emoji ? '' : emoji;
    dibujar();
  },
  'alternar-etiqueta': (elemento) => {
    sincronizarHoja();
    const clave = elemento.dataset.valor;
    const actuales = estado.hoja.item.etiquetas || [];
    estado.hoja.item.etiquetas = actuales.includes(clave)
      ? actuales.filter((c) => c !== clave)
      : [...actuales, clave];
    dibujar();
  },
  'grabar': () => grabar(),
  'parar-grabacion': () => pararGrabacion(),
  'cancelar-grabacion': () => {
    if (grabacionEnCurso) grabacionEnCurso.cancelar();
    grabacionEnCurso = null;
    if (estado.hoja) estado.hoja.grabando = null;
    dibujar();
  },
  'quitar-audio': (elemento) => {
    sincronizarHoja();
    const indice = Number(elemento.dataset.indice);
    const [quitada] = estado.hoja.audios.splice(indice, 1);
    if (quitada && quitada.id) estado.hoja.audiosQuitados.push(quitada.id);
    dibujar();
  },
  'oir-audio': async (elemento) => {
    const id = elemento.dataset.audio;
    try {
      const nota = await datos.traerAudio(id);
      if (nota) estado.audiosSonando[id] = nota;
      dibujar();
    } catch (e) {
      avisarYRedibujar('No se pudo cargar la nota de voz');
    }
  },
  'quitar-foto-entrada': (elemento) => {
    sincronizarHoja();
    const indice = Number(elemento.dataset.indice);
    const [quitada] = estado.hoja.fotos.splice(indice, 1);
    if (quitada && quitada.id) estado.hoja.fotosQuitadas.push(quitada.id);
    dibujar();
  },
  'abrir-foto': (elemento) => abrirFotoGrande(elemento.dataset.foto),
  'filtro-autor': (elemento) => { estado.filtroAutor = elemento.dataset.valor; dibujar(); },
  'filtro-etiqueta': (elemento) => {
    estado.filtroEtiqueta = estado.filtroEtiqueta === elemento.dataset.valor ? '' : elemento.dataset.valor;
    dibujar();
  },
  'mas-entradas': () => {
    estado.cuantasEntradas += 15;
    datos.escucharDatos(dibujar);
  },

  'ver-comentarios': async (elemento) => {
    const id = elemento.dataset.id;
    if (estado.comentariosAbiertos === id) {
      estado.comentariosAbiertos = '';
      dibujar();
      return;
    }
    estado.comentariosAbiertos = id;
    dibujar();
    try {
      estado.comentarios[id] = await datos.traerComentarios(id);
      dibujar();
    } catch (e) {
      avisarYRedibujar('No se pudieron cargar los comentarios');
    }
  },
  'borrar-comentario': async (elemento) => {
    const { id, comentario } = elemento.dataset;
    try {
      await datos.borrarComentario(id, comentario);
      estado.comentarios[id] = await datos.traerComentarios(id);
      dibujar();
    } catch (e) {
      avisarYRedibujar('No se pudo borrar el comentario');
    }
  },

  'ver-calendario': () => {
    estado.vistaDiario = 'calendario';
    estado.diaElegido = '';
    estado.mesCalendario = estado.mesCalendario || hoy().slice(0, 7);
    dibujar();
    cargarMes();
  },
  'ver-album': () => {
    estado.vistaDiario = 'album';
    dibujar();
    cargarAlbum();
  },
  'ver-lista': () => { estado.vistaDiario = 'lista'; dibujar(); },
  'mas-fotos': () => {
    estado.cuantasFotos += 30;
    cargarAlbum();
  },
  'abrir-visor': (elemento) => abrirVisor(Number(elemento.dataset.indice)),
  'cerrar-visor': () => { estado.visor = null; dibujar(); },
  'sacar-recuerdo': () => sacarDelFrasco(),
  'ir-cartas': () => { estado.seccion = 'cartas'; dibujar(); },
  'ir-mapa': () => { estado.seccion = 'mapa'; estado.agregandoLugar = false; dibujar(); },
  'ir-planes': () => { estado.seccion = 'planes'; dibujar(); },
  'ir-canciones': () => { estado.seccion = 'canciones'; dibujar(); },
  'ir-recetas': () => { estado.seccion = 'recetas'; dibujar(); },

  'nueva-receta': () => abrirHoja('receta', 'nuevo', {
    titulo: '', ingredientes: '', pasos: '', enlace: '', foto: '', aDistancia: false,
  }),
  'editar-receta': (elemento) => {
    const receta = estado.recetas.find((r) => r.id === elemento.dataset.id);
    if (receta) abrirHoja('receta', 'editar', receta);
  },
  'borrar-receta': (elemento) => {
    const id = elemento.dataset.id;
    preguntar('¿Borrar esta receta?', async () => {
      try {
        await datos.borrarReceta(id);
        estado.hoja = null;
        avisarYRedibujar('Receta borrada');
      } catch (e) {
        avisarYRedibujar('No se pudo borrar');
      }
    });
  },
  'marcar-receta': (elemento) => marcarReceta(elemento.dataset.id),
  'filtro-receta': (elemento) => { estado.filtroReceta = elemento.dataset.valor; dibujar(); },
  'quitar-foto-receta': () => {
    sincronizarHoja();
    estado.hoja.item.foto = '';
    dibujar();
  },
  'ver-foto-receta': (elemento) => {
    const receta = estado.recetas.find((r) => r.id === elemento.dataset.id);
    if (receta && receta.foto) { estado.fotoAmpliada = receta.foto; dibujar(); }
  },
  'usar-receta': async (elemento) => {
    const idea = IDEAS_DE_RECETAS[Number(elemento.dataset.indice)];
    if (!idea) return;
    try {
      await datos.crearReceta({ titulo: idea, ingredientes: '', pasos: '', enlace: '', foto: '', aDistancia: true });
      avisarYRedibujar('Agregada a las recetas 🍳');
    } catch (e) {
      avisarYRedibujar('No se pudo agregar');
    }
  },
  'ir-resumen': () => {
    estado.seccion = 'resumen';
    estado.resumen = null;
    dibujar();
    armarResumen(Number(hoy().slice(0, 4)));
  },
  'resumen-anio': (elemento) => {
    estado.resumen = null;
    dibujar();
    armarResumen(Number(elemento.dataset.valor));
  },

  'nuevo-plan': () => abrirHoja('plan', 'nuevo', { titulo: '', nota: '', modo: 'juntos' }),
  'modo-plan': (elemento) => {
    sincronizarHoja();
    estado.hoja.item.modo = elemento.dataset.valor;
    dibujar();
  },
  'filtro-plan': (elemento) => { estado.filtroPlan = elemento.dataset.valor; dibujar(); },
  'usar-idea': async (elemento) => {
    const idea = IDEAS_A_DISTANCIA[Number(elemento.dataset.indice)];
    if (!idea) return;
    try {
      await datos.crearPlan({ titulo: idea, nota: '', modo: 'distancia' });
      avisarYRedibujar('Agregado a los planes ✨');
    } catch (e) {
      avisarYRedibujar('No se pudo agregar');
    }
  },
  'marcar-plan': (elemento) => marcarPlan(elemento.dataset.id),
  'borrar-plan': (elemento) => {
    const id = elemento.dataset.id;
    preguntar('¿Borrar este plan?', async () => {
      try { await datos.borrarPlan(id); avisarYRedibujar('Plan borrado'); }
      catch (e) { avisarYRedibujar('No se pudo borrar'); }
    });
  },

  'nueva-cancion': () => abrirHoja('cancion', 'nuevo', { titulo: '', artista: '', enlace: '', historia: '' }),
  'borrar-cancion': (elemento) => {
    const id = elemento.dataset.id;
    preguntar('¿Quitar esta canción?', async () => {
      try { await datos.borrarCancion(id); avisarYRedibujar('Canción quitada'); }
      catch (e) { avisarYRedibujar('No se pudo quitar'); }
    });
  },
  'alternar-agregar-lugar': () => {
    estado.agregandoLugar = !estado.agregandoLugar;
    dibujar();
  },
  'centrar-lugar': (elemento) => {
    centrarEn(estado.lugares.find((l) => l.id === elemento.dataset.id));
  },
  'borrar-lugar': (elemento) => {
    const id = elemento.dataset.id;
    preguntar('¿Borrar este lugar del mapa?', async () => {
      try { await datos.borrarLugar(id); avisarYRedibujar('Lugar borrado'); }
      catch (e) { avisarYRedibujar('No se pudo borrar'); }
    });
  },
  'volver-inicio': () => { estado.seccion = 'inicio'; dibujar(); },
  'nueva-carta': () => abrirHoja('carta', 'nuevo', {
    titulo: '', texto: '', tipo: 'motivo', motivo: 'cualquiera', abreEn: '',
  }),
  'tipo-carta': (elemento) => {
    sincronizarHoja();
    estado.hoja.item.tipo = elemento.dataset.valor;
    dibujar();
  },
  'elegir-motivo': (elemento) => {
    sincronizarHoja();
    estado.hoja.item.motivo = elemento.dataset.valor;
    dibujar();
  },
  'abrir-carta': (elemento) => abrirCarta(elemento.dataset.id),
  'cerrar-carta': () => { estado.cartaAbierta = null; dibujar(); },
  'borrar-carta': (elemento) => {
    const id = elemento.dataset.id;
    preguntar('¿Borrar esta carta? No se puede deshacer.', async () => {
      try { await datos.borrarCarta(id); avisarYRedibujar('Carta borrada'); }
      catch (e) { avisarYRedibujar('No se pudo borrar'); }
    });
  },
  'guardar-frasco': () => { estado.recuerdoDelFrasco = null; dibujar(); },
  'mes-anterior': () => moverMes(-1),
  'mes-siguiente': () => moverMes(1),
  'elegir-dia': (elemento) => {
    estado.diaElegido = estado.diaElegido === elemento.dataset.fecha ? '' : elemento.dataset.fecha;
    dibujar();
  },

  'editar-respuesta': () => { estado.editandoRespuesta = true; dibujar(); },
  'editar-gracias': () => { estado.editandoGracias = true; dibujar(); },

  'nuevo-deseo': () => abrirHoja('deseo', 'nuevo', deseoVacio()),
  'nueva-comida': () => abrirHoja('comida', 'nuevo', comidaVacia()),
  'editar-deseo': (elemento) => {
    const deseo = misDeseos().find((d) => d.id === elemento.dataset.id);
    if (deseo) abrirHoja('deseo', 'editar', deseo);
  },
  'editar-comida': (elemento) => {
    const comida = misComidas().find((c) => c.id === elemento.dataset.id);
    if (comida) abrirHoja('comida', 'editar', comida);
  },
  'borrar-deseo': (elemento) => {
    const id = elemento.dataset.id;
    preguntar('¿Eliminar este deseo? No se puede deshacer.', async () => {
      try { await datos.borrarDeseo(id); avisarYRedibujar('Eliminado'); }
      catch (e) { avisarYRedibujar('No se pudo eliminar'); }
    });
  },
  'borrar-comida': (elemento) => {
    const id = elemento.dataset.id;
    preguntar('¿Eliminar esta comida? No se puede deshacer.', async () => {
      try { await datos.borrarComida(id); avisarYRedibujar('Eliminado'); }
      catch (e) { avisarYRedibujar('No se pudo eliminar'); }
    });
  },
  'reservar': (elemento) => cambiarReserva(elemento.dataset.id),
  'soltar-reserva': (elemento) => cambiarReserva(elemento.dataset.id),
  'ver-foto': (elemento) => {
    const deseo = estado.deseos.find((d) => d.id === elemento.dataset.id);
    if (deseo && deseo.image) { estado.fotoAmpliada = deseo.image; dibujar(); }
  },
  'foto-cerrar': () => { estado.fotoAmpliada = null; dibujar(); },
  'ordenar': (elemento) => { estado.orden = elemento.dataset.orden; dibujar(); },

  'hoja-cancelar': () => cerrarHoja(),
  'quitar-foto': () => {
    sincronizarHoja();
    estado.hoja.item.image = '';
    dibujar();
  },
  'hoja-borrar': (elemento) => {
    const id = elemento.dataset.id;
    const esComida = estado.hoja.tipo === 'comida';
    preguntar(esComida ? '¿Eliminar esta comida? No se puede deshacer.' : '¿Eliminar este deseo? No se puede deshacer.', async () => {
      try {
        if (esComida) await datos.borrarComida(id);
        else await datos.borrarDeseo(id);
        estado.hoja = null;
        avisarYRedibujar('Eliminado');
      } catch (e) {
        avisarYRedibujar('No se pudo eliminar');
      }
    });
  },
  'borrar-fecha': async (elemento) => {
    const indice = Number(elemento.dataset.indice);
    const fechas = (estado.ajustes.fechas || []).filter((f, i) => i !== indice);
    try {
      await datos.guardarAjustes({ fechas });
      avisarYRedibujar('Fecha borrada');
    } catch (e) {
      avisarYRedibujar('No se pudo borrar');
    }
  },
  'confirmar-si': () => {
    const tarea = estado.confirmacion && estado.confirmacion.alConfirmar;
    estado.confirmacion = null;
    dibujar();
    if (tarea) tarea();
  },
  'confirmar-no': () => { estado.confirmacion = null; dibujar(); },
};

// La respuesta del otro se pide de a una: las reglas solo la dan cuando ya
// existe la tuya de ese día, así que una consulta de todas fallaría entera.
async function cargarRespuestasDelOtro() {
  const fechas = [hoy(), ...estado.misRespuestas.map((r) => r.date)];
  const unicas = [...new Set(fechas)].slice(0, 16);
  let hubo = false;
  for (const fecha of unicas) {
    if (estado.respuestasDelOtro[fecha] !== undefined && estado.respuestasDelOtro[fecha] !== 'oculta') continue;
    estado.respuestasDelOtro[fecha] = await datos.traerRespuestaDelOtro(fecha);
    hubo = true;
  }
  if (hubo && estado.seccion === 'pregunta') dibujar();
}

function vistaDelDiario() {
  if (estado.vistaDiario === 'calendario') return dibujarCalendario();
  if (estado.vistaDiario === 'album') return dibujarAlbum();
  return dibujarDiario();
}

async function cargarAlbum() {
  estado.albumCargando = true;
  dibujar();
  try {
    const fotos = await datos.traerFotosDelAlbum(estado.cuantasFotos);
    estado.fotosAlbum = fotos;
    estado.hayMasFotos = fotos.length === estado.cuantasFotos;
  } catch (e) {
    estado.fotosAlbum = [];
    avisarYRedibujar('No se pudieron cargar las fotos');
  } finally {
    estado.albumCargando = false;
    dibujar();
  }
}

async function abrirVisor(indice) {
  estado.visor = { indice, grande: null, escala: 1, x: 0, y: 0 };
  dibujar();
  const foto = estado.fotosAlbum[indice];
  if (!foto) return;
  try {
    const grande = await datos.traerFotoGrande(foto.id);
    if (!estado.visor || estado.visor.indice !== indice) return;
    estado.visor.grande = grande || foto.mini;
  } catch (e) {
    if (estado.visor) estado.visor.grande = foto.mini;
  }
  dibujar();
}

function cambiarFotoDelVisor(direccion) {
  if (!estado.visor) return;
  const siguiente = estado.visor.indice + direccion;
  if (siguiente < 0 || siguiente >= estado.fotosAlbum.length) {
    estado.visor.escala = 1;
    estado.visor.x = 0;
    estado.visor.y = 0;
    dibujar();
    return;
  }
  abrirVisor(siguiente);
}

async function descargarRespaldo() {
  estado.respaldo = { enCurso: true, paso: 'Preparando…' };
  dibujar();
  try {
    const archivo = await armarRespaldo((paso) => {
      estado.respaldo = { enCurso: true, paso };
      dibujar();
    });
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `ositos-${hoy()}.zip`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    estado.respaldo = null;
    avisarYRedibujar('Respaldo listo 💾');
  } catch (e) {
    estado.respaldo = null;
    avisarYRedibujar('No se pudo armar el respaldo');
  }
}

async function armarResumen(anio) {
  try {
    const entradas = await datos.traerAnio(anio);
    estado.resumen = calcularResumen(entradas, anio);
  } catch (e) {
    estado.resumen = calcularResumen([], anio);
  }
  if (estado.seccion === 'resumen') dibujar();
}

// Al tachar un plan se ofrece convertirlo en recuerdo: la idea es que lo que
// se hizo termine escrito, no solo marcado.
async function marcarPlan(id) {
  const plan = estado.planes.find((p) => p.id === id);
  if (!plan) return;
  const seHizo = !plan.hecho;
  try {
    await datos.marcarPlan(id, seHizo);
  } catch (e) {
    avisarYRedibujar('No se pudo marcar');
    return;
  }
  if (!seHizo) { dibujar(); return; }
  preguntar(`¡Lo hicieron! ¿Escribes el recuerdo de "${plan.titulo}"?`, () => {
    abrirHojaEntrada('nuevo', null).then(() => {
      if (!estado.hoja) return;
      estado.hoja.item.texto = plan.titulo;
      estado.hoja.item.etiquetas = ['primera-vez'];
      dibujar();
    });
  });
}

// Igual que con los planes: lo cocinado merece quedar escrito.
async function marcarReceta(id) {
  const receta = estado.recetas.find((r) => r.id === id);
  if (!receta) return;
  const seHizo = !receta.hecha;
  try {
    await datos.marcarReceta(id, seHizo);
  } catch (e) {
    avisarYRedibujar('No se pudo marcar');
    return;
  }
  if (!seHizo) { dibujar(); return; }
  preguntar(`¡La cocinaron! ¿Escribes el recuerdo de "${receta.titulo}"?`, () => {
    abrirHojaEntrada('nuevo', null).then(() => {
      if (!estado.hoja) return;
      estado.hoja.item.texto = `Cocinamos ${receta.titulo}.`;
      estado.hoja.item.etiquetas = ['comida'];
      dibujar();
    });
  });
}

let grabacionEnCurso = null;

async function grabar() {
  sincronizarHoja();
  try {
    estado.hoja.grabando = { segundos: 0 };
    dibujar();
    grabacionEnCurso = await empezarAGrabar({
      alContar: (segundos) => {
        if (!estado.hoja || !estado.hoja.grabando) return;
        const tiempo = raiz.querySelector('.grabando-tiempo');
        estado.hoja.grabando.segundos = segundos;
        // Solo el reloj, para no redibujar la hoja entera cada cuarto de segundo.
        if (tiempo) tiempo.textContent = `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
      },
      alCortarse: () => pararGrabacion(),
    });
  } catch (e) {
    estado.hoja.grabando = null;
    grabacionEnCurso = null;
    avisarYRedibujar('No se pudo usar el micrófono. Revisa los permisos.');
  }
}

async function pararGrabacion() {
  if (!grabacionEnCurso) return;
  const grabacion = grabacionEnCurso;
  grabacionEnCurso = null;
  const resultado = await grabacion.detener();
  if (!estado.hoja) return;
  estado.hoja.grabando = null;
  if (resultado.error) {
    avisarYRedibujar(resultado.error);
    return;
  }
  estado.hoja.audios.push(resultado);
  dibujar();
}

function tocaronElMapa(lat, lng) {
  if (!estado.agregandoLugar) return;
  estado.agregandoLugar = false;
  abrirHoja('lugar', 'nuevo', { nombre: '', lat, lng });
}

async function abrirCarta(id) {
  estado.cartaAbierta = { id, texto: null };
  dibujar();
  const carta = estado.cartas.find((c) => c.id === id);
  const texto = await datos.traerTextoDeCarta(id);
  if (!estado.cartaAbierta || estado.cartaAbierta.id !== id) return;
  estado.cartaAbierta.texto = texto;
  dibujar();
  if (texto && texto !== 'cerrada' && carta && !carta.abiertaEn && carta.autor !== estado.sesion) {
    try { await datos.marcarCartaAbierta(id); } catch (e) { /* no pasa nada */ }
  }
}

async function sacarDelFrasco() {
  const desde = esFechaValida(estado.ajustes.inicio) ? estado.ajustes.inicio : '2020-01-01';
  try {
    const recuerdo = await datos.recuerdoAlAzar(desde, hoy());
    estado.recuerdoDelFrasco = recuerdo || 'vacio';
  } catch (e) {
    estado.recuerdoDelFrasco = 'vacio';
  }
  dibujar();
}

async function cargarMes() {
  try {
    estado.entradasDelMes = await datos.traerMes(estado.mesCalendario);
  } catch (e) {
    estado.entradasDelMes = [];
  }
  if (estado.vistaDiario === 'calendario') dibujar();
}

function moverMes(cuantos) {
  const [anio, mes] = estado.mesCalendario.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1 + cuantos, 1));
  estado.mesCalendario = `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}`;
  estado.diaElegido = '';
  dibujar();
  cargarMes();
}

async function cambiarReserva(id) {
  try {
    await datos.alternarReserva(id, estado.misReservas.includes(id));
  } catch (e) {
    avisarYRedibujar('No se pudo actualizar. Revisa tu conexión.');
  }
}

function conectarBusqueda(elemento, campo) {
  elemento.addEventListener('input', () => {
    estado[campo] = elemento.value;
    dibujar();  // dibujar() deja el cursor donde estaba
  });
}

function conectarEventos() {
  raiz.querySelectorAll('[data-accion]').forEach((elemento) => {
    const accion = elemento.dataset.accion;

    if (accion === 'buscar') { conectarBusqueda(elemento, 'busqueda'); return; }
    if (accion === 'buscar-diario') { conectarBusqueda(elemento, 'busquedaDiario'); return; }

    if (accion === 'archivo-foto') {
      elemento.addEventListener('change', () => elegirFotoDeseo(elemento.files[0]));
      return;
    }
    if (accion === 'archivo-receta') {
      elemento.addEventListener('change', () => elegirFotoReceta(elemento.files[0]));
      return;
    }

    if (accion === 'archivo-entrada') {
      elemento.addEventListener('change', () => elegirFotosEntrada(elemento.files));
      return;
    }

    if (accion === 'carta-fondo') {
      elemento.addEventListener('click', (evento) => {
        if (evento.target === elemento) { estado.cartaAbierta = null; dibujar(); }
      });
      return;
    }

    if (accion === 'hoja-fondo' || accion === 'confirmar-fondo' || accion === 'foto-fondo' || accion === 'visor-fondo') {
      elemento.addEventListener('click', (evento) => {
        if (evento.target !== elemento) return;
        if (accion === 'hoja-fondo') cerrarHojaConCuidado();
        else if (accion === 'confirmar-fondo') { estado.confirmacion = null; dibujar(); }
        else if (accion === 'visor-fondo') { estado.visor = null; dibujar(); }
        else { estado.fotoAmpliada = null; dibujar(); }
      });
      return;
    }

    const tarea = acciones[accion];
    if (tarea) elemento.addEventListener('click', () => tarea(elemento));
  });

  const formClave = raiz.querySelector('#form-clave');
  if (formClave) {
    formClave.addEventListener('submit', (evento) => {
      evento.preventDefault();
      entrar(raiz.querySelector('#campo-clave').value);
    });
  }

  const formEntrada = raiz.querySelector('#form-entrada');
  if (formEntrada) {
    formEntrada.addEventListener('submit', (evento) => {
      evento.preventDefault();
      guardarEntrada();
    });
  }

  const formDeseo = raiz.querySelector('#form-deseo');
  if (formDeseo) {
    formDeseo.addEventListener('submit', (evento) => {
      evento.preventDefault();
      const campos = new FormData(formDeseo);
      const enlaceFoto = campos.get('image');
      guardarDeseo({
        title: campos.get('title'),
        description: campos.get('description'),
        price: campos.get('price'),
        url: campos.get('url'),
        image: estado.hoja.item.image || (typeof enlaceFoto === 'string' ? enlaceFoto : ''),
      });
    });
  }

  const formComida = raiz.querySelector('#form-comida');
  if (formComida) {
    formComida.addEventListener('submit', (evento) => {
      evento.preventDefault();
      const campos = new FormData(formComida);
      guardarComida({
        name: campos.get('name'),
        restaurant: campos.get('restaurant'),
        note: campos.get('note'),
      });
    });
  }

  const formGustos = raiz.querySelector('#form-gustos');
  if (formGustos) {
    formGustos.addEventListener('submit', (evento) => {
      evento.preventDefault();
      const campos = new FormData(formGustos);
      const contenido = {};
      CATEGORIAS_GUSTOS.forEach((categoria) => {
        contenido[categoria.clave] = String(campos.get(categoria.clave) || '').trim().slice(0, 300);
      });
      guardarGustos(contenido);
    });
  }

  const formClaveNueva = raiz.querySelector('#form-clave-nueva');
  if (formClaveNueva) {
    formClaveNueva.addEventListener('submit', (evento) => {
      evento.preventDefault();
      cambiarClave(formClaveNueva);
    });
  }

  const formRespuesta = raiz.querySelector('#form-respuesta');
  if (formRespuesta) {
    formRespuesta.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      const texto = String(new FormData(formRespuesta).get('texto') || '').trim().slice(0, 2000);
      if (!texto) { avisarYRedibujar('Escribe tu respuesta'); return; }
      try {
        await datos.guardarRespuesta(hoy(), preguntaDeHoy().texto, texto);
        estado.editandoRespuesta = false;
        avisarYRedibujar('Respondido 💬');
        cargarRespuestasDelOtro();
      } catch (e) {
        avisarYRedibujar('No se pudo guardar. Revisa tu conexión.');
      }
    });
  }

  const formGracias = raiz.querySelector('#form-gracias');
  if (formGracias) {
    formGracias.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      const texto = String(new FormData(formGracias).get('texto') || '').trim().slice(0, 200);
      if (!texto) { avisarYRedibujar('Escribe algo'); return; }
      try {
        await datos.guardarGracias(hoy(), texto);
        estado.editandoGracias = false;
        avisarYRedibujar('Guardado 💛');
      } catch (e) {
        avisarYRedibujar('No se pudo guardar. Revisa tu conexión.');
      }
    });
  }

  raiz.querySelectorAll('.comentario-form').forEach((formulario) => {
    formulario.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      const id = formulario.dataset.entrada;
      const texto = String(new FormData(formulario).get('texto') || '').trim().slice(0, 500);
      if (!texto) return;
      try {
        await datos.comentar(id, texto);
        estado.comentarios[id] = await datos.traerComentarios(id);
        soltarCandado();
        dibujar();
      } catch (e) {
        avisarYRedibujar('No se pudo comentar');
      }
    });
  });

  const formApodos = raiz.querySelector('#form-apodos');
  if (formApodos) {
    formApodos.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      const campos = new FormData(formApodos);
      const apodos = {
        lentina: String(campos.get('lentina') || '').trim().slice(0, 30),
        manolo: String(campos.get('manolo') || '').trim().slice(0, 30),
      };
      try {
        await datos.guardarAjustes({ apodos });
        avisarYRedibujar('Apodos guardados 💛');
      } catch (e) {
        avisarYRedibujar('No se pudo guardar');
      }
    });
  }

  const formCarta = raiz.querySelector('#form-carta');
  if (formCarta) {
    formCarta.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      sincronizarHoja();
      const item = estado.hoja.item;
      const titulo = String(item.titulo || '').trim().slice(0, 80);
      const texto = String(item.texto || '').trim().slice(0, 5000);
      if (!titulo || !texto) { avisarYRedibujar('Faltan el título o el texto'); return; }

      const esPorFecha = item.tipo === 'fecha';
      if (esPorFecha && !esFechaValida(item.abreEn)) { avisarYRedibujar('Elige el día en que se abre'); return; }

      const sobre = esPorFecha
        ? {
            titulo,
            tipo: 'fecha',
            abreEn: item.abreEn,
            // Mediodía de Bolivia: la carta se abre ese día, no la noche antes.
            abreEnMs: new Date(`${item.abreEn}T16:00:00Z`).getTime(),
          }
        : { titulo, tipo: 'motivo', motivo: item.motivo || 'cualquiera', abreEn: '', abreEnMs: 0 };

      const hojaPorSiFalla = estado.hoja;
      estado.hoja = null;
      avisarYRedibujar('Carta guardada 💌');
      try {
        await datos.crearCarta(sobre, texto);
      } catch (e) {
        estado.hoja = hojaPorSiFalla;
        avisarYRedibujar('No se pudo guardar. Revisa tu conexión.');
      }
    });
  }

  const formPlan = raiz.querySelector('#form-plan');
  if (formPlan) {
    formPlan.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      const campos = new FormData(formPlan);
      const titulo = String(campos.get('titulo') || '').trim().slice(0, 120);
      if (!titulo) { avisarYRedibujar('Ponle un nombre al plan'); return; }
      const plan = {
        titulo,
        nota: String(campos.get('nota') || '').trim().slice(0, 500),
        modo: estado.hoja.item.modo || 'juntos',
      };
      const hojaPorSiFalla = estado.hoja;
      estado.hoja = null;
      avisarYRedibujar('Plan agregado ✨');
      try {
        await datos.crearPlan(plan);
      } catch (e) {
        estado.hoja = hojaPorSiFalla;
        avisarYRedibujar('No se pudo guardar. Revisa tu conexión.');
      }
    });
  }

  const formReceta = raiz.querySelector('#form-receta');
  if (formReceta) {
    formReceta.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      const campos = new FormData(formReceta);
      const titulo = String(campos.get('titulo') || '').trim().slice(0, 120);
      if (!titulo) { avisarYRedibujar('Ponle nombre a la receta'); return; }
      const contenido = {
        titulo,
        ingredientes: String(campos.get('ingredientes') || '').trim().slice(0, 2000),
        pasos: String(campos.get('pasos') || '').trim().slice(0, 4000),
        enlace: String(campos.get('enlace') || '').trim().slice(0, 500),
        aDistancia: campos.get('aDistancia') === 'on',
        foto: estado.hoja.item.foto || '',
      };
      const editando = estado.hoja.modo === 'editar' ? estado.hoja.item.id : null;
      const hojaPorSiFalla = estado.hoja;
      estado.hoja = null;
      avisarYRedibujar('Receta guardada 🍳');
      try {
        if (editando) await datos.editarReceta(editando, contenido);
        else await datos.crearReceta(contenido);
      } catch (e) {
        estado.hoja = hojaPorSiFalla;
        avisarYRedibujar('No se pudo guardar. Revisa tu conexión.');
      }
    });
  }

  const formCancion = raiz.querySelector('#form-cancion');
  if (formCancion) {
    formCancion.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      const campos = new FormData(formCancion);
      const titulo = String(campos.get('titulo') || '').trim().slice(0, 120);
      if (!titulo) { avisarYRedibujar('Falta el nombre de la canción'); return; }
      const cancion = {
        titulo,
        artista: String(campos.get('artista') || '').trim().slice(0, 120),
        enlace: String(campos.get('enlace') || '').trim().slice(0, 500),
        historia: String(campos.get('historia') || '').trim().slice(0, 1000),
      };
      const hojaPorSiFalla = estado.hoja;
      estado.hoja = null;
      avisarYRedibujar('Canción guardada 🎵');
      try {
        await datos.crearCancion(cancion);
      } catch (e) {
        estado.hoja = hojaPorSiFalla;
        avisarYRedibujar('No se pudo guardar. Revisa tu conexión.');
      }
    });
  }

  const formLugar = raiz.querySelector('#form-lugar');
  if (formLugar) {
    formLugar.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      const nombre = String(new FormData(formLugar).get('nombre') || '').trim().slice(0, 80);
      if (!nombre) { avisarYRedibujar('Ponle un nombre al lugar'); return; }
      const { lat, lng } = estado.hoja.item;
      const hojaPorSiFalla = estado.hoja;
      estado.hoja = null;
      avisarYRedibujar('Lugar guardado 📍');
      try {
        await datos.crearLugar({ nombre, lat, lng });
      } catch (e) {
        estado.hoja = hojaPorSiFalla;
        avisarYRedibujar('No se pudo guardar. Revisa tu conexión.');
      }
    });
  }

  const formInicio = raiz.querySelector('#form-inicio');
  if (formInicio) {
    formInicio.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      const fecha = new FormData(formInicio).get('inicio');
      if (!esFechaValida(fecha)) { avisarYRedibujar('Esa fecha no es válida'); return; }
      try {
        await datos.guardarAjustes({ inicio: fecha });
        avisarYRedibujar('Fecha guardada 💞');
      } catch (e) {
        avisarYRedibujar('No se pudo guardar');
      }
    });
  }

  const formFechaNueva = raiz.querySelector('#form-fecha-nueva');
  if (formFechaNueva) {
    formFechaNueva.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      const campos = new FormData(formFechaNueva);
      const nombre = String(campos.get('nombre') || '').trim().slice(0, 60);
      const fecha = campos.get('fecha');
      if (!nombre || !esFechaValida(fecha)) { avisarYRedibujar('Faltan el nombre o el día'); return; }
      const fechas = [...(estado.ajustes.fechas || []), { nombre, fecha }];
      try {
        await datos.guardarAjustes({ fechas });
        avisarYRedibujar('Fecha agregada 🎉');
      } catch (e) {
        avisarYRedibujar('No se pudo guardar');
      }
    });
  }

  activarArrastreDeHoja(cerrarHojaConCuidado);

  if (estado.visor) {
    activarVisor(raiz, {
      cambiar: cambiarFotoDelVisor,
      refrescarAyuda: () => {
        const ayuda = raiz.querySelector('.visor-ayuda');
        if (!ayuda) return;
        ayuda.textContent = estado.visor.escala > 1
          ? 'Arrastra para moverte · doble toque para alejar'
          : 'Pellizca para acercar · desliza para cambiar';
      },
    });
  }
}

// ---------- Un solo guardado por toque ----------
//
// Guardar es con await, y en ese rato el botón seguía vivo: dos toques seguidos
// creaban dos recuerdos iguales. Este guardián va en fase de captura, antes que
// cualquier formulario, y el candado se suelta en el próximo dibujado (todos
// los guardados terminan dibujando).
raiz.addEventListener('submit', (evento) => {
  if (guardando) { evento.preventDefault(); evento.stopPropagation(); return; }
  guardando = true;
  const boton = evento.target.querySelector('button[type="submit"]');
  if (boton) boton.disabled = true;
  clearTimeout(sueltaDelCandado);
  // Si algo falla y no se vuelve a dibujar, el botón no queda muerto.
  sueltaDelCandado = setTimeout(() => { guardando = false; dibujar(); }, 8000);
}, true);

window.addEventListener('online', () => { estado.sinInternet = false; dibujar(); });
window.addEventListener('offline', () => { estado.sinInternet = true; dibujar(); });

aplicarTema();
dibujar();

// Service worker: hace que la app abra sin internet y avisa cuando hay una
// versión nueva, en vez de cambiarla por debajo sin que nadie se entere.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((registro) => {
      if (registro.waiting) {
        estado.actualizacion = registro.waiting;
        dibujar();
      }
      registro.addEventListener('updatefound', () => {
        const nuevo = registro.installing;
        if (!nuevo) return;
        nuevo.addEventListener('statechange', () => {
          if (nuevo.state === 'installed' && navigator.serviceWorker.controller) {
            estado.actualizacion = nuevo;
            dibujar();
          }
        });
      });
    }).catch(() => undefined);
  });
}
