// Ositos — arranque, pantallas y acciones.

import { auth, onAuthStateChanged } from './firebase.js';
import {
  estado, PERFILES, CATEGORIAS_GUSTOS, ETIQUETAS, pareja, perfilDeCorreo,
  misDeseos, misComidas,
} from './estado.js';
import {
  raiz, escapar, avisar, comprimirFoto, comprimirFotoSimple,
  dibujarAviso, dibujarConfirmacion, dibujarFotoAmpliada, activarArrastreDeHoja,
} from './ui.js';
import { hoy, esFechaValida } from './fechas.js';
import * as sesion from './auth.js';
import * as datos from './datos.js';
import { dibujarInicio } from './secciones/inicio.js';
import { dibujarDiario, dibujarHojaEntrada, cargarMiniaturas } from './secciones/diario.js';
import { dibujarDeseos, dibujarHojaDeseo } from './secciones/deseos.js';
import { dibujarComidas, dibujarHojaComida } from './secciones/comida.js';
import { dibujarGustos } from './secciones/gustos.js';
import { dibujarAjustes } from './secciones/ajustes.js';

// El meta viewport no alcanza en iOS Safari: hay que bloquear el pellizco a
// mano. El doble toque ya lo bloquea "touch-action: manipulation" en el CSS.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

const avisarYRedibujar = (mensaje) => avisar(mensaje, dibujar);

const SECCIONES_LISTA = ['deseos', 'comida', 'gustos'];

// ---------- Pantallas ----------

function dibujarCargando() {
  return '<div class="screen-boot"><div class="boot-spinner"></div></div>';
}

function dibujarErrorConexion() {
  return `<div class="screen-boot"><div class="empty-state">
    <div class="empty-emoji">⚠️</div>
    <div>No se pudo conectar.<br/>Revisa tu internet y recarga la página.</div>
  </div></div>`;
}

function dibujarPanel() {
  const perfil = PERFILES[estado.sesion];
  const nombrePareja = PERFILES[pareja()].nombre;
  const seccion = estado.seccion;
  const enLista = SECCIONES_LISTA.includes(seccion);

  let contenido;
  if (seccion === 'inicio') contenido = dibujarInicio();
  else if (seccion === 'diario') contenido = dibujarDiario();
  else if (seccion === 'ajustes') contenido = dibujarAjustes();
  else if (seccion === 'gustos') contenido = dibujarGustos();
  else if (seccion === 'comida') contenido = dibujarComidas();
  else contenido = dibujarDeseos();

  const bajadas = {
    inicio: 'Lo nuestro, de un vistazo',
    diario: 'Nuestros recuerdos',
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
  if (seccion === 'diario') fab = '<button class="fab" data-accion="nueva-entrada">+</button>';
  else if (enLista && seccion !== 'gustos' && estado.pestana === 'mia') {
    fab = `<button class="fab" data-accion="${seccion === 'comida' ? 'nueva-comida' : 'nuevo-deseo'}">+</button>`;
  }

  const navegacion = [
    { clave: 'inicio', icono: '🏠', texto: 'Inicio' },
    { clave: 'diario', icono: '📖', texto: 'Diario' },
    { clave: 'deseos', icono: '🎁', texto: 'Deseos' },
    { clave: 'ajustes', icono: '⚙️', texto: 'Ajustes' },
  ].map((item) => {
    const activo = item.clave === 'deseos' ? enLista : seccion === item.clave;
    return `<button class="nav-item ${activo ? 'active' : ''}" data-accion="seccion" data-seccion="${item.clave}">
      <span class="nav-icon">${item.icono}</span>${item.texto}</button>`;
  }).join('');

  return `<div class="screen-dashboard">
    <div class="dash-header">
      <div>
        <div class="dash-greeting">Hola, ${escapar(perfil.nombre)} ${perfil.emoji}</div>
        <div class="dash-sub">${bajadas[seccion] || ''}</div>
      </div>
    </div>
    ${pestanasSeccion}
    ${pestanasPersona}
    <div class="dashboard-scroll">${contenido}</div>
    ${fab}
    <div class="bottom-nav">${navegacion}</div>
  </div>`;
}

function dibujarHoja() {
  if (!estado.hoja) return '';
  if (estado.hoja.tipo === 'entrada') return dibujarHojaEntrada();
  if (estado.hoja.tipo === 'comida') return dibujarHojaComida();
  return dibujarHojaDeseo();
}

function dibujar() {
  let html;
  if (estado.pantalla === 'cargando') html = dibujarCargando();
  else if (estado.errorConexion && estado.pantalla !== 'panel') html = dibujarErrorConexion();
  else if (estado.pantalla === 'perfiles') html = sesion.dibujarPerfiles();
  else if (estado.pantalla === 'clave') html = sesion.dibujarClave();
  else if (estado.pantalla === 'pin-crear') html = sesion.dibujarPin('crear');
  else if (estado.pantalla === 'pin-abrir') html = sesion.dibujarPin('abrir');
  else html = dibujarPanel();

  html += dibujarHoja();
  html += dibujarConfirmacion();
  html += dibujarFotoAmpliada();
  html += dibujarAviso();

  raiz.innerHTML = html;
  conectarEventos();
  cargarMiniaturas(raiz);
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

async function abrirHojaEntrada(modo, entrada) {
  const item = entrada ? { ...entrada, etiquetas: [...(entrada.etiquetas || [])] } : entradaVacia();
  abrirHoja('entrada', modo, item, { fotos: (entrada?.fotos || []).map((id) => ({ id, mini: null })), fotosQuitadas: [] });
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
  const formulario = raiz.querySelector('#form-entrada')
    || raiz.querySelector('#form-deseo')
    || raiz.querySelector('#form-comida');
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

function preguntar(mensaje, alConfirmar) {
  estado.confirmacion = { mensaje, alConfirmar };
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

  const { modo, item, fotos, fotosQuitadas } = estado.hoja;
  try {
    if (modo === 'editar') {
      await datos.editarEntrada(item.id, contenido, fotos);
      if (fotosQuitadas.length) await datos.borrarFotos(fotosQuitadas);
    } else {
      const nuevas = fotos.filter((f) => !f.id);
      await datos.crearEntrada(contenido, nuevas);
      if (modo === 'borrador') await datos.borrarBorrador(item.id);
    }
    estado.hoja = null;
    avisarYRedibujar(modo === 'editar' ? 'Recuerdo guardado' : '¡Guardado! 💛');
  } catch (e) {
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
  try {
    if (esNuevo) await datos.crearDeseo(contenido);
    else await datos.editarDeseo(estado.hoja.item.id, contenido);
    estado.hoja = null;
    avisarYRedibujar(esNuevo ? '¡Agregado a tu lista! 🎉' : 'Cambios guardados');
  } catch (e) {
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
  try {
    if (esNueva) await datos.crearComida(contenido);
    else await datos.editarComida(estado.hoja.item.id, contenido);
    estado.hoja = null;
    avisarYRedibujar(esNueva ? '¡Agregado! 🍽️' : 'Cambios guardados');
  } catch (e) {
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
  'quitar-pin': () => {
    sesion.borrarPin(estado.sesion);
    sesion.recordarSinPin(estado.sesion, true);
    avisarYRedibujar('Candado quitado de este celular');
  },

  'seccion': (elemento) => {
    estado.seccion = elemento.dataset.seccion;
    estado.busqueda = '';
    estado.orden = 'recientes';
    dibujar();
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

async function cambiarReserva(id) {
  const deseo = estado.deseos.find((d) => d.id === id);
  if (!deseo) return;
  try {
    await datos.alternarReserva(deseo);
  } catch (e) {
    avisarYRedibujar('No se pudo actualizar. Revisa tu conexión.');
  }
}

function conectarBusqueda(elemento, campo, idCampo) {
  elemento.addEventListener('input', () => {
    const posicion = elemento.selectionStart;
    estado[campo] = elemento.value;
    dibujar();
    const nuevo = raiz.querySelector(idCampo);
    if (nuevo) { nuevo.focus(); nuevo.setSelectionRange(posicion, posicion); }
  });
}

function conectarEventos() {
  raiz.querySelectorAll('[data-accion]').forEach((elemento) => {
    const accion = elemento.dataset.accion;

    if (accion === 'buscar') { conectarBusqueda(elemento, 'busqueda', '#campo-busqueda'); return; }
    if (accion === 'buscar-diario') { conectarBusqueda(elemento, 'busquedaDiario', '#campo-busqueda-diario'); return; }

    if (accion === 'archivo-foto') {
      elemento.addEventListener('change', () => elegirFotoDeseo(elemento.files[0]));
      return;
    }
    if (accion === 'archivo-entrada') {
      elemento.addEventListener('change', () => elegirFotosEntrada(elemento.files));
      return;
    }

    if (accion === 'hoja-fondo' || accion === 'confirmar-fondo' || accion === 'foto-fondo') {
      elemento.addEventListener('click', (evento) => {
        if (evento.target !== elemento) return;
        if (accion === 'hoja-fondo') cerrarHoja();
        else if (accion === 'confirmar-fondo') { estado.confirmacion = null; dibujar(); }
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

  activarArrastreDeHoja(cerrarHoja);
}

dibujar();
