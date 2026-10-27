// Utilidades de pantalla: escapar texto, avisos, precios, fotos y el arrastre
// de las hojas inferiores.

import { estado } from './estado.js';

export const raiz = document.getElementById('app');

export function escapar(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function formatearPrecio(precio) {
  const limpio = String(precio || '').trim();
  if (!limpio) return '';
  return /^bs\.?\s*/i.test(limpio) ? limpio : `Bs ${limpio}`;
}

export function claseTema(tema) {
  return tema === 'blue' ? 'theme-blue' : 'theme-pink';
}

// El aviso vive en su propio nodo, fuera de #app. Antes era parte de la
// pantalla, así que mostrarlo —y esconderlo 2 segundos después— volvía a
// dibujar todo dos veces: el scroll saltaba al tope y la nota de voz que
// estaba sonando se cortaba.
const nodoAvisos = document.getElementById('avisos');
let temporizadorAviso = null;

export function avisar(mensaje) {
  if (!nodoAvisos) return;
  nodoAvisos.innerHTML = `<div class="toast">${escapar(mensaje)}</div>`;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { nodoAvisos.innerHTML = ''; }, 2600);
}

// Achica la foto en el celular antes de guardarla: Firestore acepta 1 MiB por
// documento y una foto de iPhone pesa mucho más.
//
// El navegador decodifica el HEIC del iPhone y respeta la orientación de la
// cámara, así que al dibujarla en el lienzo ya sale derecha y como JPEG.
function cargarImagen(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onerror = () => rechazar(new Error('No se pudo leer la imagen'));
    lector.onload = () => {
      const imagen = new Image();
      imagen.onerror = () => rechazar(new Error('Ese formato de imagen no se puede abrir'));
      imagen.onload = () => resolver(imagen);
      imagen.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });
}

function aMedida(imagen, ladoMaximo, calidad) {
  let ancho = imagen.width;
  let alto = imagen.height;
  if (ancho > alto && ancho > ladoMaximo) { alto = Math.round(alto * (ladoMaximo / ancho)); ancho = ladoMaximo; }
  else if (alto > ladoMaximo) { ancho = Math.round(ancho * (ladoMaximo / alto)); alto = ladoMaximo; }
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  lienzo.getContext('2d').drawImage(imagen, 0, 0, ancho, alto);
  return { datos: lienzo.toDataURL('image/jpeg', calidad), ancho, alto };
}

export async function comprimirFoto(archivo) {
  const imagen = await cargarImagen(archivo);
  const grande = aMedida(imagen, 1280, 0.72);
  const mini = aMedida(imagen, 400, 0.6);
  return {
    grande: grande.datos,
    mini: mini.datos,
    ancho: grande.ancho,
    alto: grande.alto,
  };
}

// Para los deseos, que guardan una sola imagen dentro del propio documento.
export async function comprimirFotoSimple(archivo) {
  const imagen = await cargarImagen(archivo);
  return aMedida(imagen, 800, 0.62).datos;
}

export function dibujarConfirmacion() {
  if (!estado.confirmacion) return '';
  const { mensaje, si, no, suave } = estado.confirmacion;
  return `<div class="confirm-overlay" data-accion="confirmar-fondo"><div class="confirm-box">
    <div class="confirm-message">${escapar(mensaje)}</div>
    <div class="sheet-actions">
      <button type="button" class="btn btn-secondary" data-accion="confirmar-no">${escapar(no || 'Cancelar')}</button>
      <button type="button" class="btn ${suave ? 'btn-primary' : 'btn-danger-solid'}"
              data-accion="confirmar-si">${escapar(si || 'Eliminar')}</button>
    </div>
  </div></div>`;
}

export function dibujarFotoAmpliada() {
  if (!estado.fotoAmpliada) return '';
  const cuerpo = estado.fotoAmpliada === 'cargando'
    ? '<div class="boot-spinner"></div>'
    : `<img class="lightbox-img" src="${escapar(estado.fotoAmpliada)}" alt="" />`;
  return `<div class="lightbox-overlay" data-accion="foto-fondo">
    <button type="button" class="lightbox-close" aria-label="Cerrar la foto" data-accion="foto-cerrar">✕</button>
    ${cuerpo}
  </div>`;
}

// La hoja inferior se baja arrastrando el tirador. Solo se cierra si se la
// arrastra más del 60% de su alto, para no perder lo escrito por un roce.
// Arrastrar la hoja hacia abajo para cerrarla.
//
// Antes solo servía el tirador de arriba (40 px de ancho) y había que bajarlo
// el 60 % del alto de la hoja, así que en el iPhone parecía que no se podía:
// la hoja se estiraba un poco y volvía sola. Ahora el gesto empieza en
// cualquier parte de la hoja, siempre que esté arriba de todo y el movimiento
// sea claramente hacia abajo (si no, lo que corresponde es deslizarla).
export function activarArrastreDeHoja(cerrarHoja) {
  const hoja = raiz.querySelector('.sheet');
  if (!hoja) return;

  let inicioY = 0;
  let inicioX = 0;
  let recorrido = 0;
  let mirando = false;      // se tocó la hoja, todavía no se sabe qué gesto es
  let arrastrando = false;

  const esCampo = (destino) => Boolean(
    destino && destino.closest && destino.closest('input, textarea, select, .sort-chips'));

  const empezar = (x, y, destino) => {
    if (esCampo(destino)) return;
    mirando = hoja.scrollTop <= 0;   // si está bajada, primero se sube
    arrastrando = false;
    recorrido = 0;
    inicioY = y;
    inicioX = x;
  };

  const mover = (x, y) => {
    if (!mirando) return false;
    const bajo = y - inicioY;
    const lado = Math.abs(x - inicioX);
    if (!arrastrando) {
      if (bajo > 10 && bajo > lado) { arrastrando = true; hoja.style.transition = 'none'; }
      else if (bajo < -6 || lado > 10) { mirando = false; return false; }
      else return false;
    }
    recorrido = Math.max(0, bajo);
    hoja.style.transform = `translateY(${recorrido}px)`;
    return true;
  };

  const terminar = () => {
    mirando = false;
    if (!arrastrando) return;
    arrastrando = false;
    hoja.style.transition = 'transform 0.2s ease';
    // Un cuarto de la hoja, o 150 px: lo que se alcance primero.
    if (recorrido > Math.min(150, hoja.offsetHeight * 0.25)) {
      hoja.style.transform = 'translateY(100%)';
      setTimeout(cerrarHoja, 180);
    } else {
      hoja.style.transform = 'translateY(0)';
    }
  };

  hoja.addEventListener('touchstart', (e) => {
    empezar(e.touches[0].clientX, e.touches[0].clientY, e.target);
  }, { passive: true });

  hoja.addEventListener('touchmove', (e) => {
    // Mientras se arrastra hay que quedarse con el gesto, si no el navegador
    // lo toma como rebote y la hoja tiembla.
    if (mover(e.touches[0].clientX, e.touches[0].clientY) && e.cancelable) e.preventDefault();
  }, { passive: false });

  hoja.addEventListener('touchend', terminar);
  hoja.addEventListener('touchcancel', terminar);

  const tirador = raiz.querySelector('.sheet-handle');
  if (tirador) {
    tirador.addEventListener('mousedown', (e) => {
      empezar(e.clientX, e.clientY, e.target);
      mirando = true;
      const alMover = (ev) => mover(ev.clientX, ev.clientY);
      const alSoltar = () => {
        terminar();
        document.removeEventListener('mousemove', alMover);
        document.removeEventListener('mouseup', alSoltar);
      };
      document.addEventListener('mousemove', alMover);
      document.addEventListener('mouseup', alSoltar);
    });
  }
}
