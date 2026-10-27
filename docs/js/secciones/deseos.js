// Sección Deseos: la wishlist de siempre. Cada quien ve la suya para editarla
// y la de la pareja para reservar en secreto.

import { estado, PERFILES, pareja, nombreDe, misDeseos, deseosDeLaPareja } from '../estado.js';
import { escapar, formatearPrecio, claseTema } from '../ui.js';

function valorPrecio(deseo) {
  const numero = parseFloat(String(deseo.price || '').replace(/[^\d.,]/g, '').replace(',', '.'));
  return Number.isFinite(numero) ? numero : null;
}

export function filtrarYOrdenar(lista, hundirReservados) {
  const busqueda = estado.busqueda.trim().toLowerCase();
  const resultado = busqueda
    ? lista.filter((d) => String(d.title || '').toLowerCase().includes(busqueda))
    : lista.slice();

  if (estado.orden === 'precio-asc' || estado.orden === 'precio-desc') {
    const direccion = estado.orden === 'precio-asc' ? 1 : -1;
    resultado.sort((a, b) => {
      const pa = valorPrecio(a);
      const pb = valorPrecio(b);
      if (pa === null && pb === null) return 0;
      if (pa === null) return 1;
      if (pb === null) return -1;
      return (pa - pb) * direccion;
    });
  } else {
    resultado.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  // Lo que ya vas a regalar se va al final, sin alterar el orden de lo demás.
  if (hundirReservados) {
    const reservado = (d) => (estado.misReservas.includes(d.id) ? 1 : 0);
    resultado.sort((a, b) => reservado(a) - reservado(b));
  }
  return resultado;
}

function miniatura(deseo) {
  if (deseo.image) {
    return `<button type="button" class="item-thumb" data-accion="ver-foto" data-id="${deseo.id}">
      <img src="${escapar(deseo.image)}" alt="" onerror="this.parentElement.innerHTML='🎁'"/>
    </button>`;
  }
  return '<div class="item-thumb">🎁</div>';
}

function tarjetaDeseo(deseo, modo, indice) {
  const datos = `<div class="item-meta">
    ${deseo.price ? `<span class="item-price">${escapar(formatearPrecio(deseo.price))}</span>` : ''}
    ${deseo.url ? `<a class="item-link" href="${escapar(deseo.url)}" target="_blank" rel="noopener">Ver enlace ↗</a>` : ''}
  </div>`;

  let extra = '';
  let acciones = '';

  if (modo === 'mia') {
    acciones = `<div class="item-actions">
      <button class="icon-btn" data-accion="editar-deseo" data-id="${deseo.id}">✏️</button>
      <button class="icon-btn danger" data-accion="borrar-deseo" data-id="${deseo.id}">🗑️</button>
    </div>`;
  } else if (estado.misReservas.includes(deseo.id)) {
    extra = `<div class="reserve-btn reserved" data-accion="soltar-reserva" data-id="${deseo.id}">✅ Lo vas a regalar tú</div>`;
  } else {
    extra = `<button class="reserve-btn" data-accion="reservar" data-id="${deseo.id}">🎁 Yo lo regalo</button>`;
  }

  const retraso = Math.min(indice || 0, 8) * 0.05;
  const tema = claseTema(PERFILES[modo === 'mia' ? estado.sesion : pareja()].tema);

  return `<div class="item-card card-enter ${tema}" style="animation-delay:${retraso}s">
    ${miniatura(deseo)}
    <div class="item-body">
      <div class="item-title">${escapar(deseo.title)}</div>
      ${deseo.description ? `<div class="item-desc">${escapar(deseo.description)}</div>` : ''}
      ${datos}${extra}
    </div>${acciones}
  </div>`;
}

function controles(cuantos) {
  if (cuantos === 0) return '';
  const ordenes = [
    { id: 'recientes', etiqueta: 'Recientes' },
    { id: 'precio-asc', etiqueta: 'Precio ↑' },
    { id: 'precio-desc', etiqueta: 'Precio ↓' },
  ];
  const fichas = ordenes.map((o) =>
    `<button class="sort-chip ${estado.orden === o.id ? 'active' : ''}" data-accion="ordenar" data-orden="${o.id}">${o.etiqueta}</button>`
  ).join('');

  return `<div class="list-controls">
    <div class="search-box">
      <span class="search-icon">🔍</span>
      <input type="text" id="campo-busqueda" class="search-input" data-accion="buscar"
             placeholder="Buscar en la lista..." value="${escapar(estado.busqueda)}" />
    </div>
    <div class="sort-chips">${fichas}</div>
  </div>`;
}

export function dibujarDeseos() {
  const modo = estado.pestana;
  const lista = modo === 'mia' ? misDeseos() : deseosDeLaPareja();
  const nombrePareja = nombreDe(pareja());

  if (lista.length === 0) {
    return `<div class="empty-state">
      <div class="empty-emoji">${modo === 'mia' ? '📝' : '🎁'}</div>
      <div>${modo === 'mia'
        ? 'Aún no agregaste nada.<br/>Toca + para empezar.'
        : `${escapar(nombrePareja)} no tiene deseos todavía.`}</div>
    </div>`;
  }

  const filtrados = filtrarYOrdenar(lista, modo === 'pareja');
  const tarjetas = filtrados.length
    ? filtrados.map((d, i) => tarjetaDeseo(d, modo, i)).join('')
    : `<div class="empty-state small"><div class="empty-emoji">🔎</div>
       <div>Nada coincide con "${escapar(estado.busqueda)}"</div></div>`;

  return controles(lista.length) + `<div class="items-list">${tarjetas}</div>`;
}

function campoFoto(deseo, subiendo) {
  if (deseo.image) {
    return `<div class="field"><label>Foto</label>
      <div class="image-preview">
        <img src="${escapar(deseo.image)}" alt="" />
        <button type="button" class="image-remove" data-accion="quitar-foto">🗑️ Quitar</button>
      </div>
    </div>`;
  }
  return `<div class="field"><label>Foto (opcional)</label>
    <label class="upload-btn ${subiendo ? 'disabled' : ''}">
      ${subiendo ? 'Procesando...' : '📷 Subir foto desde tu celular'}
      <input type="file" accept="image/*" data-accion="archivo-foto" ${subiendo ? 'disabled' : ''} hidden />
    </label>
    <input type="url" name="image" placeholder="o pega un link de imagen" maxlength="1000" />
  </div>`;
}

export function dibujarHojaDeseo() {
  const { modo, item, subiendo } = estado.hoja;
  return `<div class="sheet-overlay" data-accion="hoja-fondo"><div class="sheet">
    <div class="sheet-handle"></div>
    <div class="sheet-title">${modo === 'nuevo' ? 'Nuevo deseo' : 'Editar deseo'}</div>
    <form id="form-deseo">
      <div class="field"><label>¿Qué deseas?</label>
        <input type="text" name="title" placeholder="Ej. Zapatillas rosas"
               value="${escapar(item.title)}" required maxlength="200" /></div>
      <div class="field"><label>Descripción (opcional)</label>
        <textarea name="description" placeholder="Talla, color, detalles..." maxlength="1000">${escapar(item.description)}</textarea></div>
      <div class="field-row"><div class="field"><label>Precio aprox. (Bs)</label>
        <input type="text" name="price" placeholder="Bs 350" value="${escapar(item.price)}" maxlength="50" /></div></div>
      <div class="field"><label>Link de la tienda (opcional)</label>
        <input type="url" name="url" placeholder="https://..." value="${escapar(item.url)}" maxlength="500" /></div>
      ${campoFoto(item, subiendo)}
      <div class="sheet-actions">
        <button type="button" class="btn btn-secondary" data-accion="hoja-cancelar">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
      ${modo === 'editar' ? `<div class="sheet-actions" style="margin-top:10px">
        <button type="button" class="btn btn-danger-text" data-accion="hoja-borrar" data-id="${item.id}">Eliminar deseo</button>
      </div>` : ''}
    </form>
  </div></div>`;
}
