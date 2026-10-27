// Planes juntos: la lista de cosas nuevas por hacer. Al tachar una, ofrece
// convertirla en recuerdo del diario.

import { estado, PERFILES, nombreDe } from '../estado.js';
import { escapar, claseTema } from '../ui.js';
import { comoTitulo } from '../fechas.js';

export const MODOS = {
  juntos: { emoji: '💞', texto: 'Juntos' },
  distancia: { emoji: '📱', texto: 'A distancia' },
};

// Para arrancar, cuando no se les ocurre nada y están lejos.
export const IDEAS_A_DISTANCIA = [
  'Ver la misma película a la vez, cada uno en su casa',
  'Cocinar la misma receta en videollamada',
  'Jugar algo en línea los dos',
  'Mandarnos una carta de papel, de verdad',
  'Hacer una playlist juntos, una canción cada uno',
  'Leer el mismo libro y contarnos por dónde vamos',
  'Dormirnos en videollamada',
  'Hacer el mismo paseo cada uno por su ciudad y mandarnos fotos',
  'Armar la lista de todo lo que haremos cuando nos veamos',
  'Tomarnos un café a la misma hora',
];

function fila(plan) {
  const perfil = PERFILES[plan.autor] || PERFILES.lentina;
  const propio = plan.autor === estado.sesion;
  const modo = MODOS[plan.modo] || MODOS.juntos;

  return `<div class="plan ${plan.hecho ? 'hecho' : ''}">
    <button class="plan-marca" data-accion="marcar-plan" data-id="${plan.id}"
            aria-label="${plan.hecho ? 'Desmarcar' : 'Marcar como hecho'}">
      ${plan.hecho ? '✅' : '<span class="plan-vacia"></span>'}
    </button>
    <div class="plan-cuerpo">
      <div class="plan-titulo">${escapar(plan.titulo)}</div>
      ${plan.nota ? `<div class="plan-nota">${escapar(plan.nota)}</div>` : ''}
      <div class="plan-pie">
        <span class="plan-modo">${modo.emoji} ${modo.texto}</span>
        <span class="plan-autor ${claseTema(perfil.tema)}">${perfil.emoji} ${escapar(nombreDe(plan.autor))}</span>
        ${plan.hecho && plan.hechoEn
          ? `<span class="plan-cuando">hecho ${escapar(comoTitulo(new Date(plan.hechoEn).toISOString().slice(0, 10))).toLowerCase()}</span>`
          : ''}
      </div>
    </div>
    ${propio ? `<button class="icon-btn danger" aria-label="Borrar el plan" data-accion="borrar-plan" data-id="${plan.id}">🗑️</button>` : ''}
  </div>`;
}

export function dibujarPlanes() {
  const delFiltro = (p) => estado.filtroPlan === 'todos' || (p.modo || 'juntos') === estado.filtroPlan;
  const pendientes = estado.planes.filter((p) => !p.hecho && delFiltro(p))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const hechos = estado.planes.filter((p) => p.hecho && delFiltro(p))
    .sort((a, b) => (b.hechoEn || 0) - (a.hechoEn || 0));

  const filtros = `<div class="sort-chips">
    <button class="sort-chip ${estado.filtroPlan === 'todos' ? 'active' : ''}"
            data-accion="filtro-plan" data-valor="todos">Todos</button>
    ${Object.entries(MODOS).map(([clave, m]) =>
      `<button class="sort-chip ${estado.filtroPlan === clave ? 'active' : ''}"
               data-accion="filtro-plan" data-valor="${clave}">${m.emoji} ${m.texto}</button>`).join('')}
  </div>`;

  const nuevo = `<button class="btn btn-secondary volver-lista" data-accion="volver-inicio">‹ Volver a Inicio</button>
  <button class="escribir-grande" data-accion="nuevo-plan">
    <span class="escribir-emoji">✨</span>
    <span>Agregar un plan</span>
  </button>`;

  if (!estado.planes.length) {
    return `<div class="planes">
      ${nuevo}
      ${dibujarIdeas()}
      <div class="empty-state">
        <div class="empty-emoji">✨</div>
        <div>Todavía no hay planes.<br/>Anoten algo que nunca hicieron.</div>
      </div>
    </div>`;
  }

  return `<div class="planes">
    ${nuevo}
    ${filtros}
    ${estado.filtroPlan === 'distancia' && !pendientes.length ? dibujarIdeas() : ''}
    ${pendientes.length ? `<div class="planes-grupo">
      <div class="diario-fecha">Por hacer</div>
      ${pendientes.map(fila).join('')}
    </div>` : ''}
    ${hechos.length ? `<div class="planes-grupo">
      <div class="diario-fecha">Ya los hicimos (${hechos.length})</div>
      ${hechos.map(fila).join('')}
    </div>` : ''}
  </div>`;
}

function dibujarIdeas() {
  const sugerencias = IDEAS_A_DISTANCIA
    .map((idea, i) => `<button class="idea" data-accion="usar-idea" data-indice="${i}">${escapar(idea)}</button>`)
    .join('');
  return `<div class="inicio-tarjeta">
    <div class="inicio-tarjeta-titulo">📱 Ideas para cuando estamos lejos</div>
    <div class="ajuste-nota">Toca una y queda agregada a la lista.</div>
    <div class="ideas">${sugerencias}</div>
  </div>`;
}

export function dibujarHojaPlan() {
  const { item } = estado.hoja;
  return `<div class="sheet-overlay" data-accion="hoja-fondo"><div class="sheet">
    <div class="sheet-handle"></div>
    <div class="sheet-title">Un plan nuestro</div>
    <form id="form-plan">
      <div class="field">
        <label>¿Qué queremos hacer?</label>
        <input type="text" name="titulo" required maxlength="120"
               placeholder="Ej. Acampar y ver las estrellas" value="${escapar(item.titulo)}" />
      </div>
      <div class="field">
        <label>¿Es para cuando estemos juntos o se puede a distancia?</label>
        <div class="tabs chico">
          ${Object.entries(MODOS).map(([clave, m]) =>
            `<button type="button" class="tab-btn ${(item.modo || 'juntos') === clave ? 'active' : ''}"
                     data-accion="modo-plan" data-valor="${clave}">${m.emoji} ${m.texto}</button>`).join('')}
        </div>
      </div>
      <div class="field">
        <label>Detalles (opcional)</label>
        <textarea name="nota" maxlength="500" placeholder="Dónde, cuándo, con qué...">${escapar(item.nota)}</textarea>
      </div>
      <div class="sheet-actions sheet-actions-fijas">
        <button type="button" class="btn btn-secondary" data-accion="hoja-cancelar">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar el plan</button>
      </div>
    </form>
  </div></div>`;
}
