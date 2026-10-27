// Recetas que queremos cocinar.
//
// Las que se pueden hacer en videollamada van marcadas, porque pasamos buena
// parte del tiempo lejos y esas son las que sirven igual estando separados.
// Al marcar una como hecha, ofrece escribir el recuerdo, como los planes.

import { estado, PERFILES, nombreDe } from '../estado.js';
import { escapar, claseTema } from '../ui.js';
import { comoTitulo } from '../fechas.js';

export const IDEAS_DE_RECETAS = [
  'Pizza casera, cada uno la suya',
  'Salteñas',
  'Panqueques de domingo',
  'Sopa de maní',
  'Pique macho',
  'Brownies',
  'Pasta hecha a mano',
  'Pan casero',
];

function tarjeta(receta) {
  const perfil = PERFILES[receta.autor] || PERFILES.lentina;
  const propia = receta.autor === estado.sesion;

  return `<div class="receta ${receta.hecha ? 'hecha' : ''}">
    ${receta.foto
      ? `<button type="button" class="receta-foto" data-accion="ver-foto-receta" data-id="${receta.id}">
          <img src="${escapar(receta.foto)}" alt="" loading="lazy" />
        </button>`
      : ''}
    <div class="receta-cuerpo">
      <div class="receta-cabecera">
        <button class="plan-marca" data-accion="marcar-receta" data-id="${receta.id}"
                aria-label="${receta.hecha ? 'Desmarcar' : 'Marcar como cocinada'}">
          ${receta.hecha ? '✅' : '<span class="plan-vacia"></span>'}
        </button>
        <div class="receta-datos">
          <div class="receta-titulo">${escapar(receta.titulo)}</div>
          <div class="plan-pie">
            ${receta.aDistancia ? '<span class="plan-modo">📱 Se puede en videollamada</span>' : ''}
            <span class="plan-autor ${claseTema(perfil.tema)}">${perfil.emoji} ${escapar(nombreDe(receta.autor))}</span>
            ${receta.hecha && receta.hechaEn
              ? `<span class="plan-cuando">cocinada ${escapar(comoTitulo(new Date(receta.hechaEn).toISOString().slice(0, 10))).toLowerCase()}</span>`
              : ''}
          </div>
        </div>
        ${propia ? `<div class="item-actions">
          <button class="icon-btn" aria-label="Editar la receta" data-accion="editar-receta" data-id="${receta.id}">✏️</button>
          <button class="icon-btn danger" aria-label="Borrar la receta" data-accion="borrar-receta" data-id="${receta.id}">🗑️</button>
        </div>` : ''}
      </div>

      ${receta.ingredientes ? `<details class="receta-detalle">
        <summary>🧺 Ingredientes</summary>
        <div class="receta-texto">${escapar(receta.ingredientes)}</div>
      </details>` : ''}
      ${receta.pasos ? `<details class="receta-detalle">
        <summary>👩‍🍳 Cómo se hace</summary>
        <div class="receta-texto">${escapar(receta.pasos)}</div>
      </details>` : ''}
      ${receta.enlace
        ? `<a class="item-link" href="${escapar(receta.enlace)}" target="_blank" rel="noopener">Ver la receta ↗</a>`
        : ''}
    </div>
  </div>`;
}

export function dibujarRecetas() {
  const delFiltro = (r) => {
    if (estado.filtroReceta === 'distancia') return r.aDistancia;
    if (estado.filtroReceta === 'hechas') return r.hecha;
    return !r.hecha;
  };

  const porHacer = estado.recetas.filter((r) => !r.hecha).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const visibles = estado.recetas.filter(delFiltro).sort((a, b) => (
    estado.filtroReceta === 'hechas'
      ? (b.hechaEn || 0) - (a.hechaEn || 0)
      : (b.createdAt || 0) - (a.createdAt || 0)
  ));

  const cabecera = `<button class="btn btn-secondary volver-lista" data-accion="volver-inicio">‹ Volver a Inicio</button>
  <button class="escribir-grande" data-accion="nueva-receta">
    <span class="escribir-emoji">🍳</span>
    <span>Agregar una receta</span>
  </button>`;

  if (!estado.recetas.length) {
    return `<div class="recetas">
      ${cabecera}
      ${dibujarIdeas()}
      <div class="empty-state">
        <div class="empty-emoji">🍳</div>
        <div>Todavía no hay recetas.<br/>Anoten algo que quieran cocinar.</div>
      </div>
    </div>`;
  }

  const filtros = [
    { clave: 'pendientes', texto: `Por cocinar (${porHacer.length})` },
    { clave: 'distancia', texto: '📱 En videollamada' },
    { clave: 'hechas', texto: 'Ya cocinadas' },
  ].map((f) => `<button class="sort-chip ${estado.filtroReceta === f.clave ? 'active' : ''}"
      data-accion="filtro-receta" data-valor="${f.clave}">${f.texto}</button>`).join('');

  const lista = visibles.length
    ? visibles.map(tarjeta).join('')
    : `<div class="empty-state small"><div class="empty-emoji">🍽️</div>
       <div>${estado.filtroReceta === 'hechas'
         ? 'Todavía no cocinaron ninguna.'
         : 'Nada acá por ahora.'}</div></div>`;

  return `<div class="recetas">
    ${cabecera}
    <div class="sort-chips">${filtros}</div>
    ${estado.filtroReceta === 'pendientes' && !visibles.length ? dibujarIdeas() : ''}
    ${lista}
  </div>`;
}

function dibujarIdeas() {
  const sugerencias = IDEAS_DE_RECETAS
    .map((idea, i) => `<button class="idea" data-accion="usar-receta" data-indice="${i}">${escapar(idea)}</button>`)
    .join('');
  return `<div class="inicio-tarjeta">
    <div class="inicio-tarjeta-titulo">🍳 Para arrancar</div>
    <div class="ajuste-nota">Toca una y queda en la lista. Después le agregas los ingredientes.</div>
    <div class="ideas">${sugerencias}</div>
  </div>`;
}

export function dibujarHojaReceta() {
  const { modo, item, subiendo } = estado.hoja;

  return `<div class="sheet-overlay" data-accion="hoja-fondo"><div class="sheet">
    <div class="sheet-handle"></div>
    <div class="sheet-title">${modo === 'editar' ? 'Editar receta' : 'Una receta nueva'}</div>
    <form id="form-receta">
      <div class="field">
        <label>¿Qué queremos cocinar?</label>
        <input type="text" name="titulo" required maxlength="120"
               placeholder="Ej. Lasaña de la abuela" value="${escapar(item.titulo)}" />
      </div>

      <div class="field">
        <label>Ingredientes (opcional)</label>
        <textarea name="ingredientes" maxlength="2000"
                  placeholder="Uno por línea:&#10;2 tazas de harina&#10;3 huevos...">${escapar(item.ingredientes)}</textarea>
      </div>

      <div class="field">
        <label>Cómo se hace (opcional)</label>
        <textarea name="pasos" maxlength="4000"
                  placeholder="Los pasos, o lo que haya que acordarse...">${escapar(item.pasos)}</textarea>
      </div>

      <div class="field">
        <label>Link de la receta (opcional)</label>
        <input type="url" name="enlace" maxlength="500"
               placeholder="https://..." value="${escapar(item.enlace)}" />
      </div>

      <label class="receta-check">
        <input type="checkbox" name="aDistancia" ${item.aDistancia ? 'checked' : ''} />
        <span>📱 Se puede cocinar en videollamada, cada uno en su casa</span>
      </label>

      <div class="field">
        <label>Foto (opcional)</label>
        ${item.foto
          ? `<div class="image-preview">
              <img src="${escapar(item.foto)}" alt="" />
              <button type="button" class="image-remove" data-accion="quitar-foto-receta">🗑️ Quitar</button>
            </div>`
          : `<label class="upload-btn ${subiendo ? 'disabled' : ''}">
              ${subiendo ? 'Procesando…' : '📷 Agregar una foto'}
              <input type="file" accept="image/*" data-accion="archivo-receta" ${subiendo ? 'disabled' : ''} hidden />
            </label>`}
      </div>

      <div class="sheet-actions sheet-actions-fijas">
        <button type="button" class="btn btn-secondary" data-accion="hoja-cancelar">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
      ${modo === 'editar' ? `<div class="sheet-actions" style="margin-top:10px">
        <button type="button" class="btn btn-danger-text" data-accion="borrar-receta" data-id="${item.id}">Eliminar receta</button>
      </div>` : ''}
    </form>
  </div></div>`;
}
