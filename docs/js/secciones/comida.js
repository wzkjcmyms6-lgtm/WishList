// Sección Comida: las comidas favoritas de cada uno, con restaurante opcional.

import { estado, PERFILES, pareja, nombreDe, misComidas, comidasDeLaPareja } from '../estado.js';
import { escapar, claseTema } from '../ui.js';

function tarjetaComida(comida, modo) {
  const acciones = modo === 'mia' ? `<div class="item-actions">
    <button class="icon-btn" data-accion="editar-comida" data-id="${comida.id}">✏️</button>
    <button class="icon-btn danger" data-accion="borrar-comida" data-id="${comida.id}">🗑️</button>
  </div>` : '';

  const tema = claseTema(PERFILES[modo === 'mia' ? estado.sesion : pareja()].tema);

  return `<div class="item-card card-enter ${tema}">
    <div class="item-thumb">🍽️</div>
    <div class="item-body">
      <div class="item-title">${escapar(comida.name)}</div>
      ${comida.restaurant ? `<div class="item-desc">📍 ${escapar(comida.restaurant)}</div>` : ''}
      ${comida.note ? `<div class="item-desc">${escapar(comida.note)}</div>` : ''}
    </div>${acciones}
  </div>`;
}

export function dibujarComidas() {
  const modo = estado.pestana;
  const lista = modo === 'mia' ? misComidas() : comidasDeLaPareja();
  const nombrePareja = nombreDe(pareja());

  if (lista.length === 0) {
    return `<div class="empty-state">
      <div class="empty-emoji">🍽️</div>
      <div>${modo === 'mia'
        ? 'Aún no agregaste comidas.<br/>Toca + para empezar.'
        : `${escapar(nombrePareja)} no agregó comidas todavía.`}</div>
    </div>`;
  }

  const tarjetas = lista
    .slice()
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .map((c) => tarjetaComida(c, modo))
    .join('');

  return `<div class="items-list">${tarjetas}</div>`;
}

export function dibujarHojaComida() {
  const { modo, item } = estado.hoja;
  return `<div class="sheet-overlay" data-accion="hoja-fondo"><div class="sheet">
    <div class="sheet-handle"></div>
    <div class="sheet-title">${modo === 'nuevo' ? 'Nueva comida' : 'Editar comida'}</div>
    <form id="form-comida">
      <div class="field"><label>¿Qué comida te gusta?</label>
        <input type="text" name="name" placeholder="Ej. Milanesa con papas"
               value="${escapar(item.name)}" required maxlength="120" /></div>
      <div class="field"><label>Restaurante (opcional)</label>
        <input type="text" name="restaurant" placeholder="Ej. La Casona"
               value="${escapar(item.restaurant)}" maxlength="150" /></div>
      <div class="field"><label>Notas (opcional)</label>
        <textarea name="note" placeholder="Sin cebolla, bien picante..." maxlength="300">${escapar(item.note)}</textarea></div>
      <div class="sheet-actions">
        <button type="button" class="btn btn-secondary" data-accion="hoja-cancelar">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
      ${modo === 'editar' ? `<div class="sheet-actions" style="margin-top:10px">
        <button type="button" class="btn btn-danger-text" data-accion="hoja-borrar" data-id="${item.id}">Eliminar comida</button>
      </div>` : ''}
    </form>
  </div></div>`;
}
