// Nuestras canciones: el link y por qué es nuestra.
//
// Si el link es de Spotify se muestra el reproductor; si no, queda como enlace.

import { estado, PERFILES, nombreDe } from '../estado.js';
import { escapar, claseTema } from '../ui.js';

// open.spotify.com/track/ID, /album/ID, /playlist/ID (con o sin /intl-es/)
function spotify(enlace) {
  const encontrado = String(enlace || '')
    .match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|album|playlist|episode)\/([A-Za-z0-9]+)/);
  if (!encontrado) return null;
  return `https://open.spotify.com/embed/${encontrado[1]}/${encontrado[2]}`;
}

function tarjeta(cancion) {
  const perfil = PERFILES[cancion.autor] || PERFILES.lentina;
  const propia = cancion.autor === estado.sesion;
  const reproductor = spotify(cancion.enlace);

  return `<div class="cancion">
    <div class="cancion-cabecera">
      <div class="cancion-datos">
        <div class="cancion-titulo">${escapar(cancion.titulo)}</div>
        ${cancion.artista ? `<div class="cancion-artista">${escapar(cancion.artista)}</div>` : ''}
      </div>
      ${propia ? `<button class="icon-btn danger" aria-label="Borrar la canción" data-accion="borrar-cancion" data-id="${cancion.id}">🗑️</button>` : ''}
    </div>
    ${reproductor
      ? `<iframe class="cancion-player" src="${escapar(reproductor)}" height="152" frameborder="0"
                 title="${escapar(cancion.titulo)} en Spotify" data-persistente="cancion-${cancion.id}"
                 loading="lazy" allow="encrypted-media; clipboard-write; fullscreen; picture-in-picture"></iframe>`
      : (cancion.enlace
          ? `<a class="item-link" href="${escapar(cancion.enlace)}" target="_blank" rel="noopener">Escucharla ↗</a>`
          : '')}
    ${cancion.historia ? `<div class="cancion-historia">${escapar(cancion.historia)}</div>` : ''}
    <div class="cancion-autor ${claseTema(perfil.tema)}">${perfil.emoji} La puso ${escapar(nombreDe(cancion.autor))}</div>
  </div>`;
}

export function dibujarCanciones() {
  const canciones = estado.canciones.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const nueva = `<button class="btn btn-secondary volver-lista" data-accion="volver-inicio">‹ Volver a Inicio</button>
  <button class="escribir-grande" data-accion="nueva-cancion">
    <span class="escribir-emoji">🎵</span>
    <span>Agregar una canción</span>
  </button>`;

  if (!canciones.length) {
    return `<div class="canciones">
      ${nueva}
      <div class="empty-state">
        <div class="empty-emoji">🎵</div>
        <div>Todavía no hay canciones.<br/>Pon la primera que se les venga a la cabeza.</div>
      </div>
    </div>`;
  }

  return `<div class="canciones">${nueva}${canciones.map(tarjeta).join('')}</div>`;
}

export function dibujarHojaCancion() {
  const { item } = estado.hoja;
  return `<div class="sheet-overlay" data-accion="hoja-fondo"><div class="sheet">
    <div class="sheet-handle"></div>
    <div class="sheet-title">Una canción nuestra</div>
    <form id="form-cancion">
      <div class="field">
        <label>¿Cuál es?</label>
        <input type="text" name="titulo" required maxlength="120"
               placeholder="Nombre de la canción" value="${escapar(item.titulo)}" />
      </div>
      <div class="field">
        <label>¿De quién? (opcional)</label>
        <input type="text" name="artista" maxlength="120" placeholder="Artista" value="${escapar(item.artista)}" />
      </div>
      <div class="field">
        <label>Link (opcional)</label>
        <input type="url" name="enlace" maxlength="500"
               placeholder="Pega el link de Spotify" value="${escapar(item.enlace)}" />
        <div class="ajuste-nota">Si es de Spotify, se va a poder escuchar acá mismo.</div>
      </div>
      <div class="field">
        <label>¿Por qué es nuestra?</label>
        <textarea name="historia" maxlength="1000"
                  placeholder="La historia de esta canción...">${escapar(item.historia)}</textarea>
      </div>
      <div class="sheet-actions sheet-actions-fijas">
        <button type="button" class="btn btn-secondary" data-accion="hoja-cancelar">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>
  </div></div>`;
}
