// Mapa de nuestros lugares, con Leaflet y los mapas de OpenStreetMap.
//
// Leaflet se carga recién cuando se abre esta pantalla, para no hacer esperar
// al resto de la app. Si no carga (sin internet), se avisa y la lista de
// lugares igual se ve.

import { estado, PERFILES, nombreDe } from '../estado.js';
import { escapar } from '../ui.js';

const CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

// Cochabamba, por poner algo mientras no haya lugares guardados.
const CENTRO = [-17.3895, -66.1568];

const COLORES = { lentina: '#C24B7C', manolo: '#2F7A73' };

let cargando = null;
let mapa = null;
let nodoMontado = null;
let capaDeMarcas = null;
let firmaDeLugares = null;

function cargarLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (cargando) return cargando;
  cargando = new Promise((resolver, rechazar) => {
    const hoja = document.createElement('link');
    hoja.rel = 'stylesheet';
    hoja.href = CSS;
    document.head.appendChild(hoja);

    const guion = document.createElement('script');
    guion.src = JS;
    guion.onload = () => resolver(window.L);
    guion.onerror = () => { cargando = null; rechazar(new Error('sin mapa')); };
    document.head.appendChild(guion);
  });
  return cargando;
}

export function dibujarMapa() {
  const lugares = estado.lugares.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const lista = lugares.length
    ? lugares.map((lugar) => {
        const perfil = PERFILES[lugar.autor] || PERFILES.lentina;
        const propio = lugar.autor === estado.sesion;
        return `<div class="lugar-fila">
          <button class="lugar-nombre" data-accion="centrar-lugar" data-id="${lugar.id}">
            <span class="lugar-punto" style="background:${COLORES[lugar.autor] || COLORES.lentina}"></span>
            <span>${escapar(lugar.nombre)}</span>
          </button>
          <span class="lugar-autor">${perfil.emoji}</span>
          ${propio ? `<button class="icon-btn danger" aria-label="Borrar el lugar" data-accion="borrar-lugar" data-id="${lugar.id}">🗑️</button>` : ''}
        </div>`;
      }).join('')
    : '<div class="ajuste-nota">Todavía no hay lugares. Toca el botón y después el punto del mapa.</div>';

  const aviso = estado.mapaRoto
    ? '<div class="panel-nota">No se pudo cargar el mapa. Revisa tu internet y vuelve a entrar.</div>'
    : '';

  return `<div class="mapa">
    <button class="btn btn-secondary volver-lista" data-accion="volver-inicio">‹ Volver a Inicio</button>
    ${aviso}
    <button class="btn ${estado.agregandoLugar ? 'btn-danger-text' : 'btn-primary'} ancho"
            data-accion="alternar-agregar-lugar">
      ${estado.agregandoLugar ? '✕ Cancelar' : '📍 Agregar un lugar'}
    </button>
    ${estado.agregandoLugar ? '<div class="ajuste-nota">Toca en el mapa el punto exacto.</div>' : ''}
    <div class="mapa-lienzo" id="mapa-lienzo"></div>
    <div class="lugares">${lista}</div>
  </div>`;
}

export async function montarMapa(raiz, { alTocarMapa }) {
  const hueco = raiz.querySelector('#mapa-lienzo');
  if (!hueco) return;

  let L;
  try {
    L = await cargarLeaflet();
  } catch (e) {
    estado.mapaRoto = true;
    return;
  }
  if (!raiz.contains(hueco)) return;

  // Cada redibujado reemplaza el HTML entero, así que el mapa vive en un nodo
  // propio que se guarda aparte y se vuelve a meter en su hueco. Si se
  // recreara cada vez, se perderían el zoom, la posición y el globo abierto.
  if (!nodoMontado) {
    nodoMontado = document.createElement('div');
    nodoMontado.className = 'mapa-interno';
  }
  if (nodoMontado.parentElement !== hueco) hueco.appendChild(nodoMontado);

  if (!mapa) {
    mapa = L.map(nodoMontado, { zoomControl: true, attributionControl: true }).setView(CENTRO, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapa);
    mapa.on('click', (evento) => alTocarMapa(evento.latlng.lat, evento.latlng.lng));
  }

  // Rearmar las marcas en cada redibujado cerraría el globo que la persona
  // acaba de abrir, así que solo se rehacen si de verdad cambió algo.
  const firma = JSON.stringify(estado.lugares.map((l) => [l.id, l.nombre, l.lat, l.lng]));
  if (capaDeMarcas && firma === firmaDeLugares) {
    setTimeout(() => { if (mapa) mapa.invalidateSize(); }, 60);
    return;
  }
  firmaDeLugares = firma;

  if (capaDeMarcas) capaDeMarcas.remove();
  capaDeMarcas = L.layerGroup().addTo(mapa);

  const puntos = [];
  estado.lugares.forEach((lugar) => {
    if (typeof lugar.lat !== 'number' || typeof lugar.lng !== 'number') return;
    const color = COLORES[lugar.autor] || COLORES.lentina;
    const marca = L.circleMarker([lugar.lat, lugar.lng], {
      radius: 9, color: '#FBF3E7', weight: 3, fillColor: color, fillOpacity: 1,
    });
    marca.bindPopup(`<b>${escapar(lugar.nombre)}</b><br/>${escapar(nombreDe(lugar.autor))}`);
    marca.addTo(capaDeMarcas);
    puntos.push([lugar.lat, lugar.lng]);
  });

  if (puntos.length === 1) mapa.setView(puntos[0], 15);
  else if (puntos.length > 1) mapa.fitBounds(puntos, { padding: [30, 30] });

  // El contenedor cambia de tamaño al dibujarse; sin esto quedan franjas grises.
  setTimeout(() => { if (mapa) mapa.invalidateSize(); }, 60);
}

export function centrarEn(lugar) {
  if (mapa && lugar) mapa.setView([lugar.lat, lugar.lng], 16);
}

export function dibujarHojaLugar() {
  const { item } = estado.hoja;
  return `<div class="sheet-overlay" data-accion="hoja-fondo"><div class="sheet">
    <div class="sheet-handle"></div>
    <div class="sheet-title">Un lugar nuestro</div>
    <form id="form-lugar">
      <div class="field">
        <label>¿Cómo se llama?</label>
        <input type="text" name="nombre" required maxlength="80"
               placeholder="Ej. El café de la esquina" value="${escapar(item.nombre)}" />
      </div>
      <div class="ajuste-nota">Queda guardado en el punto que tocaste.</div>
      <div class="sheet-actions sheet-actions-fijas">
        <button type="button" class="btn btn-secondary" data-accion="hoja-cancelar">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar el lugar</button>
      </div>
    </form>
  </div></div>`;
}
