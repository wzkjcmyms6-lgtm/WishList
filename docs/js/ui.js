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

let temporizadorAviso = null;
export function avisar(mensaje, volverARenderizar) {
  estado.aviso = mensaje;
  volverARenderizar();
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => {
    estado.aviso = null;
    volverARenderizar();
  }, 2200);
}

// Achica la foto en el celular antes de guardarla: Firestore acepta 1 MiB por
// documento y una foto de iPhone pesa mucho más.
export function comprimirFoto(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onerror = () => rechazar(new Error('No se pudo leer la imagen'));
    lector.onload = () => {
      const imagen = new Image();
      imagen.onerror = () => rechazar(new Error('Formato de imagen no soportado'));
      imagen.onload = () => {
        const maximo = 800;
        let ancho = imagen.width;
        let alto = imagen.height;
        if (ancho > alto && ancho > maximo) { alto = Math.round(alto * (maximo / ancho)); ancho = maximo; }
        else if (alto > maximo) { ancho = Math.round(ancho * (maximo / alto)); alto = maximo; }
        const lienzo = document.createElement('canvas');
        lienzo.width = ancho;
        lienzo.height = alto;
        lienzo.getContext('2d').drawImage(imagen, 0, 0, ancho, alto);
        resolver(lienzo.toDataURL('image/jpeg', 0.62));
      };
      imagen.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });
}

export function dibujarAviso() {
  return estado.aviso ? `<div class="toast">${escapar(estado.aviso)}</div>` : '';
}

export function dibujarConfirmacion() {
  if (!estado.confirmacion) return '';
  return `<div class="confirm-overlay" data-accion="confirmar-fondo"><div class="confirm-box">
    <div class="confirm-message">${escapar(estado.confirmacion.mensaje)}</div>
    <div class="sheet-actions">
      <button type="button" class="btn btn-secondary" data-accion="confirmar-no">Cancelar</button>
      <button type="button" class="btn btn-danger-solid" data-accion="confirmar-si">Eliminar</button>
    </div>
  </div></div>`;
}

export function dibujarFotoAmpliada() {
  if (!estado.fotoAmpliada) return '';
  return `<div class="lightbox-overlay" data-accion="foto-fondo">
    <button type="button" class="lightbox-close" data-accion="foto-cerrar">✕</button>
    <img class="lightbox-img" src="${escapar(estado.fotoAmpliada)}" alt="" />
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
