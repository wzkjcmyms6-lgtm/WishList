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
export function activarArrastreDeHoja(cerrarHoja) {
  const hoja = raiz.querySelector('.sheet');
  const tirador = raiz.querySelector('.sheet-handle');
  if (!hoja || !tirador) return;

  let inicioY = 0;
  let recorrido = 0;
  let arrastrando = false;

  const empezar = (y) => { arrastrando = true; inicioY = y; hoja.style.transition = 'none'; };
  const mover = (y) => {
    if (!arrastrando) return;
    recorrido = Math.max(0, y - inicioY);
    hoja.style.transform = `translateY(${recorrido}px)`;
  };
  const terminar = () => {
    if (!arrastrando) return;
    arrastrando = false;
    hoja.style.transition = 'transform 0.2s ease';
    if (recorrido > hoja.offsetHeight * 0.6) {
      hoja.style.transform = 'translateY(100%)';
      setTimeout(cerrarHoja, 180);
    } else {
      hoja.style.transform = 'translateY(0)';
    }
  };

  tirador.addEventListener('touchstart', (e) => empezar(e.touches[0].clientY), { passive: true });
  tirador.addEventListener('touchmove', (e) => mover(e.touches[0].clientY), { passive: true });
  tirador.addEventListener('touchend', terminar);
  tirador.addEventListener('mousedown', (e) => {
    empezar(e.clientY);
    const alMover = (ev) => mover(ev.clientY);
    const alSoltar = () => {
      terminar();
      document.removeEventListener('mousemove', alMover);
      document.removeEventListener('mouseup', alSoltar);
    };
    document.addEventListener('mousemove', alMover);
    document.addEventListener('mouseup', alSoltar);
  });
}
