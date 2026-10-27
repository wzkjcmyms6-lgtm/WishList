// Sección Diario: la línea de tiempo de recuerdos y la hoja para escribir.

import { estado, PERFILES, ETIQUETAS, ANIMOS, REACCIONES, nombreDe } from '../estado.js';
import { escapar, claseTema } from '../ui.js';
import { comoTitulo, enPalabras, hoy, nombreDelMes } from '../fechas.js';
import { traerMiniatura } from '../datos.js';
import { enMinutos, MAXIMO_SEGUNDOS, sePuedeGrabar } from '../grabador.js';

export function entradasVisibles() {
  const busqueda = estado.busquedaDiario.trim().toLowerCase();
  return estado.entradas.filter((entrada) => {
    if (estado.filtroAutor !== 'todos' && entrada.autor !== estado.filtroAutor) return false;
    if (estado.filtroEtiqueta && !(entrada.etiquetas || []).includes(estado.filtroEtiqueta)) return false;
    if (busqueda) {
      const texto = `${entrada.texto || ''} ${entrada.lugar || ''}`.toLowerCase();
      if (!texto.includes(busqueda)) return false;
    }
    return true;
  });
}

function firma(entrada) {
  const perfil = PERFILES[entrada.autor] || PERFILES.lentina;
  return `<span class="entrada-autor ${claseTema(perfil.tema)}">${perfil.emoji} ${escapar(nombreDe(entrada.autor))}</span>`;
}

function dibujarFotos(entrada) {
  const fotos = entrada.fotos || [];
  if (!fotos.length) return '';
  const clase = fotos.length === 1 ? 'una' : fotos.length === 2 ? 'dos' : 'varias';
  const celdas = fotos.map((id) =>
    `<button type="button" class="entrada-foto" data-accion="abrir-foto" data-foto="${id}" data-cargar="${id}">
      <span class="foto-cargando"></span>
    </button>`).join('');
  return `<div class="entrada-fotos ${clase}">${celdas}</div>`;
}

function dibujarAudios(entrada) {
  const audios = entrada.audios || [];
  if (!audios.length) return '';
  const piezas = audios.map((id) => {
    const cargado = estado.audiosSonando[id];
    if (cargado) {
      return `<audio class="audio-nota" controls autoplay src="${cargado.audio}"></audio>`;
    }
    return `<button type="button" class="audio-boton" data-accion="oir-audio" data-audio="${id}">
      ▶️ <span>Nota de voz</span>
    </button>`;
  }).join('');
  return `<div class="audios">${piezas}</div>`;
}

function dibujarReacciones(entrada) {
  const reacciones = entrada.reactions || {};
  const puestas = Object.entries(reacciones).filter(([, emoji]) => emoji);
  const mias = reacciones[estado.sesion];

  const mostradas = puestas.length
    ? `<div class="entrada-reacciones-puestas">${puestas.map(([quien, emoji]) =>
        `<span class="reaccion-puesta" title="${escapar(nombreDe(quien))}">${emoji}</span>`).join('')}</div>`
    : '';

  if (entrada.autor === estado.sesion) return mostradas;

  const opciones = REACCIONES.map((emoji) =>
    `<button class="reaccion ${mias === emoji ? 'elegida' : ''}" data-accion="reaccionar"
             data-id="${entrada.id}" data-emoji="${emoji}">${emoji}</button>`).join('');
  return `${mostradas}<div class="entrada-reacciones">${opciones}</div>`;
}

function tarjetaEntrada(entrada, esBorrador) {
  const etiquetas = (entrada.etiquetas || [])
    .map((clave) => ETIQUETAS.find((e) => e.clave === clave))
    .filter(Boolean)
    .map((e) => `<span class="entrada-etiqueta">${e.texto}</span>`)
    .join('');

  const propia = esBorrador || entrada.autor === estado.sesion;
  const acciones = propia ? `<div class="entrada-acciones">
      <button class="icon-btn" data-accion="${esBorrador ? 'editar-borrador' : 'editar-entrada'}" data-id="${entrada.id}">✏️</button>
      <button class="icon-btn danger" data-accion="${esBorrador ? 'borrar-borrador' : 'borrar-entrada'}" data-id="${entrada.id}">🗑️</button>
    </div>` : '';

  return `<article class="entrada card-enter">
    <div class="entrada-cabecera">
      <div>
        ${firma(entrada)}
        ${entrada.animo ? `<span class="entrada-animo">${entrada.animo}</span>` : ''}
        ${esBorrador ? '<span class="entrada-borrador">Borrador</span>' : ''}
      </div>
      ${acciones}
    </div>
    ${entrada.texto ? `<div class="entrada-texto">${escapar(entrada.texto)}</div>` : ''}
    ${dibujarFotos(entrada)}
    ${dibujarAudios(entrada)}
    ${entrada.lugar ? `<div class="entrada-lugar">📍 ${escapar(entrada.lugar)}</div>` : ''}
    ${etiquetas ? `<div class="entrada-etiquetas">${etiquetas}</div>` : ''}
    ${esBorrador ? '' : dibujarReacciones(entrada)}
    ${esBorrador ? '' : dibujarComentarios(entrada)}
  </article>`;
}

function dibujarComentarios(entrada) {
  const abiertos = estado.comentariosAbiertos === entrada.id;
  const lista = estado.comentarios[entrada.id] || [];
  const cuantos = lista.length;

  const boton = `<button class="comentarios-boton" data-accion="ver-comentarios" data-id="${entrada.id}">
    💬 ${abiertos ? 'Ocultar' : (cuantos ? `${cuantos} comentario${cuantos === 1 ? '' : 's'}` : 'Comentar')}
  </button>`;

  if (!abiertos) return `<div class="entrada-pie">${boton}</div>`;

  const burbujas = lista.map((comentario) => {
    const perfil = PERFILES[comentario.autor] || PERFILES.lentina;
    const propio = comentario.autor === estado.sesion;
    return `<div class="comentario">
      <span class="comentario-autor ${claseTema(perfil.tema)}">${perfil.emoji}</span>
      <div class="comentario-texto">${escapar(comentario.texto)}</div>
      ${propio ? `<button class="comentario-borrar" data-accion="borrar-comentario"
                   data-id="${entrada.id}" data-comentario="${comentario.id}">✕</button>` : ''}
    </div>`;
  }).join('');

  return `<div class="entrada-pie">
    ${boton}
    <div class="comentarios">
      ${burbujas || '<div class="ajuste-nota">Todavía no hay comentarios.</div>'}
      <form class="comentario-form" data-entrada="${entrada.id}">
        <input type="text" name="texto" maxlength="500" required placeholder="Escribe un comentario…" />
        <button type="submit" class="btn btn-secondary">Enviar</button>
      </form>
    </div>
  </div>`;
}

// ---------- Calendario ----------

export function dibujarCalendario() {
  const mes = estado.mesCalendario || hoy().slice(0, 7);
  const [anio, numeroMes] = mes.split('-').map(Number);
  const primerDia = new Date(Date.UTC(anio, numeroMes - 1, 1)).getUTCDay();
  const diasDelMes = new Date(Date.UTC(anio, numeroMes, 0)).getUTCDate();

  const porDia = {};
  estado.entradasDelMes.forEach((entrada) => {
    porDia[entrada.fecha] = (porDia[entrada.fecha] || 0) + 1;
  });

  const nombres = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
    .map((d) => `<div class="calendario-nombre">${d}</div>`).join('');

  let celdas = '';
  for (let i = 0; i < primerDia; i += 1) celdas += '<div></div>';
  for (let dia = 1; dia <= diasDelMes; dia += 1) {
    const fecha = `${mes}-${String(dia).padStart(2, '0')}`;
    const cuantas = porDia[fecha] || 0;
    const esHoy = fecha === hoy();
    const elegido = estado.diaElegido === fecha;
    celdas += `<button class="calendario-dia ${cuantas ? 'con-recuerdos' : ''} ${esHoy ? 'es-hoy' : ''} ${elegido ? 'elegido' : ''}"
      ${cuantas ? `data-accion="elegir-dia" data-fecha="${fecha}"` : ''}>
      <span>${dia}</span>
      ${cuantas ? '<span class="calendario-punto"></span>' : ''}
    </button>`;
  }

  const delDia = estado.diaElegido
    ? estado.entradasDelMes
        .filter((e) => e.fecha === estado.diaElegido)
        .map((e) => tarjetaEntrada(e, false))
        .join('')
    : '';

  return `<div class="calendario">
    <button class="btn btn-secondary volver-lista" data-accion="ver-lista">‹ Volver a los recuerdos</button>
    <div class="calendario-cabecera">
      <button class="calendario-flecha" data-accion="mes-anterior">‹</button>
      <div class="calendario-mes">${nombreDelMes(`${mes}-01`)} ${anio}</div>
      <button class="calendario-flecha" data-accion="mes-siguiente">›</button>
    </div>
    <div class="calendario-grilla">${nombres}${celdas}</div>
    ${estado.diaElegido
      ? `<div class="calendario-dia-elegido">
          <div class="diario-fecha">${escapar(comoTitulo(estado.diaElegido))}</div>
          ${delDia}
        </div>`
      : '<div class="ajuste-nota">Los días con un puntito tienen recuerdos. Tócalos para verlos.</div>'}
  </div>`;
}

function filtros() {
  const autores = [
    { clave: 'todos', texto: 'Todo' },
    { clave: 'lentina', texto: `${PERFILES.lentina.emoji} Lentina` },
    { clave: 'manolo', texto: `${PERFILES.manolo.emoji} Manuelito` },
  ];
  const fichasAutor = autores.map((a) =>
    `<button class="sort-chip ${estado.filtroAutor === a.clave ? 'active' : ''}"
             data-accion="filtro-autor" data-valor="${a.clave}">${a.texto}</button>`).join('');

  const fichasEtiqueta = ETIQUETAS.map((e) =>
    `<button class="sort-chip ${estado.filtroEtiqueta === e.clave ? 'active' : ''}"
             data-accion="filtro-etiqueta" data-valor="${e.clave}">${e.texto}</button>`).join('');

  return `<div class="list-controls">
    <div class="search-box">
      <span class="search-icon">🔍</span>
      <input type="text" id="campo-busqueda-diario" class="search-input" data-accion="buscar-diario"
             placeholder="Buscar en los recuerdos..." value="${escapar(estado.busquedaDiario)}" />
    </div>
    <div class="sort-chips">
      ${fichasAutor}
      <button class="sort-chip" data-accion="ver-calendario">📅 Calendario</button>
      <button class="sort-chip" data-accion="ver-album">📷 Álbum</button>
    </div>
    <div class="sort-chips">${fichasEtiqueta}</div>
  </div>`;
}

export function dibujarDiario() {
  const visibles = entradasVisibles();
  const hayFiltro = estado.filtroAutor !== 'todos' || estado.filtroEtiqueta || estado.busquedaDiario.trim();

  if (!estado.entradas.length && !estado.borradores.length) {
    return `<div class="empty-state">
      <div class="empty-emoji">📖</div>
      <div>Todavía no hay recuerdos.<br/>Toca + y escribe el primero.</div>
    </div>`;
  }

  const borradores = estado.borradores.length
    ? `<div class="diario-grupo">
        <div class="diario-fecha">Tus borradores</div>
        ${estado.borradores
          .slice()
          .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
          .map((b) => tarjetaEntrada(b, true)).join('')}
      </div>`
    : '';

  let cuerpo = '';
  let fechaActual = null;
  visibles.forEach((entrada) => {
    if (entrada.fecha !== fechaActual) {
      if (fechaActual !== null) cuerpo += '</div>';
      fechaActual = entrada.fecha;
      cuerpo += `<div class="diario-grupo"><div class="diario-fecha">${escapar(comoTitulo(entrada.fecha))}</div>`;
    }
    cuerpo += tarjetaEntrada(entrada, false);
  });
  if (fechaActual !== null) cuerpo += '</div>';

  if (!visibles.length) {
    cuerpo = `<div class="empty-state small">
      <div class="empty-emoji">🔎</div>
      <div>${hayFiltro ? 'Nada coincide con eso.' : 'Todavía no hay recuerdos.'}</div>
    </div>`;
  }

  const masEntradas = estado.hayMasEntradas && !hayFiltro
    ? '<button class="btn btn-secondary cargar-mas" data-accion="mas-entradas">Ver recuerdos más viejos</button>'
    : '';

  return `${filtros()}<div class="diario">${borradores}${cuerpo}${masEntradas}</div>`;
}

// Las miniaturas se piden recién cuando la tarjeta ya está en pantalla, para no
// descargar fotos que nadie miró.
export async function cargarMiniaturas(raiz) {
  const pendientes = raiz.querySelectorAll('[data-cargar]');
  for (const hueco of pendientes) {
    const id = hueco.dataset.cargar;
    hueco.removeAttribute('data-cargar');
    try {
      const mini = await traerMiniatura(id);
      if (mini) hueco.innerHTML = `<img src="${mini}" alt="" loading="lazy" />`;
      else hueco.innerHTML = '<span class="foto-rota">🖼️</span>';
    } catch (e) {
      hueco.innerHTML = '<span class="foto-rota">🖼️</span>';
    }
  }
}

function dibujarGrabador() {
  if (!sePuedeGrabar()) return '';
  const { audios = [], grabando } = estado.hoja;

  const guardadas = audios.map((nota, i) => `
    <div class="audio-elegido">
      <span class="audio-duracion">🎙️ ${enMinutos(nota.segundos || 0)}</span>
      ${nota.audio ? `<audio class="audio-nota" controls src="${nota.audio}"></audio>` : '<span class="ajuste-nota">Guardada</span>'}
      <button type="button" class="foto-quitar quieta" data-accion="quitar-audio" data-indice="${i}">✕</button>
    </div>`).join('');

  if (grabando) {
    return `<div class="field">
      <label>Nota de voz</label>
      <div class="grabando">
        <span class="punto-rojo"></span>
        <span class="grabando-tiempo">${enMinutos(grabando.segundos || 0)}</span>
        <span class="ajuste-nota">se corta al minuto</span>
        <button type="button" class="btn btn-primary" data-accion="parar-grabacion">Listo</button>
        <button type="button" class="btn btn-danger-text" data-accion="cancelar-grabacion">✕</button>
      </div>
    </div>`;
  }

  return `<div class="field">
    <label>Nota de voz (opcional, hasta ${MAXIMO_SEGUNDOS} s)</label>
    ${guardadas}
    ${audios.length < 3
      ? '<button type="button" class="upload-btn" data-accion="grabar">🎙️ Grabar una nota de voz</button>'
      : '<div class="ajuste-nota">Ya son tres notas, el máximo por recuerdo.</div>'}
  </div>`;
}

// ---------- Hoja de escribir ----------

export function dibujarHojaEntrada() {
  const { modo, item, fotos = [], subiendo } = estado.hoja;
  const esEdicion = modo === 'editar' || modo === 'borrador';

  const animos = ANIMOS.map((emoji) =>
    `<button type="button" class="animo ${item.animo === emoji ? 'elegido' : ''}"
             data-accion="elegir-animo" data-emoji="${emoji}">${emoji}</button>`).join('');

  const etiquetas = ETIQUETAS.map((e) =>
    `<button type="button" class="sort-chip ${(item.etiquetas || []).includes(e.clave) ? 'active' : ''}"
             data-accion="alternar-etiqueta" data-valor="${e.clave}">${e.texto}</button>`).join('');

  const miniaturas = fotos.map((foto, i) => `
    <div class="foto-elegida">
      <img src="${foto.mini}" alt="" />
      <button type="button" class="foto-quitar" data-accion="quitar-foto-entrada" data-indice="${i}">✕</button>
    </div>`).join('');

  return `<div class="sheet-overlay" data-accion="hoja-fondo"><div class="sheet">
    <div class="sheet-handle"></div>
    <div class="sheet-title">${esEdicion ? 'Editar recuerdo' : 'Nuevo recuerdo'}</div>
    <form id="form-entrada">

      <div class="field">
        <textarea name="texto" id="campo-texto" class="texto-grande" required maxlength="5000"
                  placeholder="¿Qué pasó hoy?">${escapar(item.texto)}</textarea>
      </div>

      <div class="field">
        <label>¿Cómo te sentiste? (opcional)</label>
        <div class="animos">${animos}</div>
      </div>

      <div class="field">
        <label>Fotos (hasta 6, opcional)</label>
        ${miniaturas ? `<div class="fotos-elegidas">${miniaturas}</div>` : ''}
        ${fotos.length < 6 ? `<label class="upload-btn ${subiendo ? 'disabled' : ''}">
          ${subiendo ? 'Procesando…' : '📷 Agregar fotos'}
          <input type="file" accept="image/*" multiple data-accion="archivo-entrada" ${subiendo ? 'disabled' : ''} hidden />
        </label>` : '<div class="ajuste-nota">Ya son 6 fotos, el máximo por recuerdo.</div>'}
      </div>

      ${dibujarGrabador()}

      <div class="field">
        <label>¿Qué día fue?</label>
        <input type="date" name="fecha" value="${escapar(item.fecha || hoy())}" max="${hoy()}" />
        <div class="ajuste-nota">Cámbiala para guardar un recuerdo viejo.</div>
      </div>

      <div class="field">
        <label>Etiquetas (opcional)</label>
        <div class="sort-chips envuelto">${etiquetas}</div>
      </div>

      <div class="field">
        <label>Lugar (opcional)</label>
        <input type="text" name="lugar" placeholder="Ej. el parque de siempre"
               value="${escapar(item.lugar)}" maxlength="120" />
      </div>

      <div class="sheet-actions">
        <button type="button" class="btn btn-secondary" data-accion="hoja-cancelar">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
      <div class="sheet-actions" style="margin-top:10px">
        <button type="button" class="btn btn-secondary" data-accion="guardar-borrador">Guardar como borrador</button>
      </div>
      ${esEdicion ? `<div class="sheet-actions" style="margin-top:10px">
        <button type="button" class="btn btn-danger-text"
                data-accion="${modo === 'borrador' ? 'borrar-borrador' : 'borrar-entrada'}" data-id="${item.id}">
          Eliminar
        </button>
      </div>` : ''}
    </form>
  </div></div>`;
}
