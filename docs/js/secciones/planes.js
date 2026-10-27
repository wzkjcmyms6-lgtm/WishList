// Planes juntos: la lista de cosas nuevas por hacer. Al tachar una, ofrece
// convertirla en recuerdo del diario.

import { estado, PERFILES, nombreDe } from '../estado.js';
import { escapar, claseTema } from '../ui.js';
import { comoTitulo } from '../fechas.js';

function fila(plan) {
  const perfil = PERFILES[plan.autor] || PERFILES.lentina;
  const propio = plan.autor === estado.sesion;

  return `<div class="plan ${plan.hecho ? 'hecho' : ''}">
    <button class="plan-marca" data-accion="marcar-plan" data-id="${plan.id}"
            aria-label="${plan.hecho ? 'Desmarcar' : 'Marcar como hecho'}">
      ${plan.hecho ? '✅' : '<span class="plan-vacia"></span>'}
    </button>
    <div class="plan-cuerpo">
      <div class="plan-titulo">${escapar(plan.titulo)}</div>
      ${plan.nota ? `<div class="plan-nota">${escapar(plan.nota)}</div>` : ''}
      <div class="plan-pie">
        <span class="plan-autor ${claseTema(perfil.tema)}">${perfil.emoji} ${escapar(nombreDe(plan.autor))}</span>
        ${plan.hecho && plan.hechoEn
          ? `<span class="plan-cuando">hecho ${escapar(comoTitulo(new Date(plan.hechoEn).toISOString().slice(0, 10))).toLowerCase()}</span>`
          : ''}
      </div>
    </div>
    ${propio ? `<button class="icon-btn danger" data-accion="borrar-plan" data-id="${plan.id}">🗑️</button>` : ''}
  </div>`;
}

export function dibujarPlanes() {
  const pendientes = estado.planes.filter((p) => !p.hecho)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const hechos = estado.planes.filter((p) => p.hecho)
    .sort((a, b) => (b.hechoEn || 0) - (a.hechoEn || 0));

  const nuevo = `<button class="btn btn-secondary volver-lista" data-accion="volver-inicio">‹ Volver a Inicio</button>
  <button class="escribir-grande" data-accion="nuevo-plan">
    <span class="escribir-emoji">✨</span>
    <span>Agregar un plan</span>
  </button>`;

  if (!estado.planes.length) {
    return `<div class="planes">
      ${nuevo}
      <div class="empty-state">
        <div class="empty-emoji">✨</div>
        <div>Todavía no hay planes.<br/>Anoten algo que nunca hicieron.</div>
      </div>
    </div>`;
  }

  return `<div class="planes">
    ${nuevo}
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
        <label>Detalles (opcional)</label>
        <textarea name="nota" maxlength="500" placeholder="Dónde, cuándo, con qué...">${escapar(item.nota)}</textarea>
      </div>
      <div class="sheet-actions">
        <button type="button" class="btn btn-secondary" data-accion="hoja-cancelar">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar el plan</button>
      </div>
    </form>
  </div></div>`;
}
