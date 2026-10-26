// Álbum: todas las fotos juntas, y el visor a pantalla completa con zoom de dos
// dedos y deslizar entre una y otra.

import { estado } from '../estado.js';
import { escapar } from '../ui.js';

export function dibujarAlbum() {
  if (!estado.fotosAlbum.length) {
    return `<div class="empty-state">
      <div class="empty-emoji">📷</div>
      <div>${estado.albumCargando
        ? 'Buscando las fotos…'
        : 'Todavía no hay fotos.<br/>Agrega una a un recuerdo del diario.'}</div>
    </div>`;
  }

  const celdas = estado.fotosAlbum.map((foto, i) =>
    `<button type="button" class="album-foto" data-accion="abrir-visor" data-indice="${i}">
      <img src="${foto.mini}" alt="" loading="lazy" />
    </button>`).join('');

  const mas = estado.hayMasFotos
    ? '<button class="btn btn-secondary cargar-mas" data-accion="mas-fotos">Ver fotos más viejas</button>'
    : '';

  return `<div class="album">
    <button class="btn btn-secondary volver-lista" data-accion="ver-lista">‹ Volver a los recuerdos</button>
    <div class="album-grilla">${celdas}</div>
    ${mas}
  </div>`;
}

// ---------- Visor ----------

export function dibujarVisor() {
  const visor = estado.visor;
  if (!visor) return '';

  const total = estado.fotosAlbum.length;
  const contador = total > 1 ? `<div class="visor-contador">${visor.indice + 1} / ${total}</div>` : '';

  const contenido = visor.grande
    ? `<img class="visor-img" id="visor-img" src="${escapar(visor.grande)}" alt=""
         style="transform: translate(${visor.x}px, ${visor.y}px) scale(${visor.escala})" />`
    : '<div class="boot-spinner"></div>';

  return `<div class="visor" data-accion="visor-fondo">
    <button type="button" class="lightbox-close" data-accion="cerrar-visor">✕</button>
    ${contador}
    <div class="visor-lienzo" id="visor-lienzo">${contenido}</div>
    <div class="visor-ayuda">${visor.escala > 1 ? 'Arrastra para moverte · doble toque para alejar' : 'Pellizca para acercar · desliza para cambiar'}</div>
  </div>`;
}
