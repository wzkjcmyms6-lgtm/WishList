// Gestos del visor de fotos: pellizcar para acercar, arrastrar para moverse,
// deslizar para cambiar de foto y doble toque para acercar o alejar.
//
// El zoom lo hacemos a mano en vez de dejar el del navegador: así solo se
// acerca la foto y no toda la página, y al salir todo queda como estaba.

import { estado } from './estado.js';

const MAXIMO = 4;
const UMBRAL_DESLIZAR = 60;

function distancia(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export function activarVisor(raiz, { cambiar, refrescarAyuda }) {
  const lienzo = raiz.querySelector('#visor-lienzo');
  const imagen = raiz.querySelector('#visor-img');
  if (!lienzo || !imagen) return;

  const visor = estado.visor;
  let modo = null;
  let distanciaInicial = 0;
  let escalaInicial = 1;
  let partidaX = 0;
  let partidaY = 0;
  let desdeX = 0;
  let desdeY = 0;
  let ultimoToque = 0;
  let ultimoZoomPorToque = 0;

  const pintar = () => {
    imagen.style.transform = `translate(${visor.x}px, ${visor.y}px) scale(${visor.escala})`;
  };

  const acomodar = () => {
    if (visor.escala <= 1.02) {
      visor.escala = 1;
      visor.x = 0;
      visor.y = 0;
    } else {
      // No dejar que la foto se escape de la pantalla.
      const limiteX = (lienzo.clientWidth * (visor.escala - 1)) / 2;
      const limiteY = (lienzo.clientHeight * (visor.escala - 1)) / 2;
      visor.x = Math.max(-limiteX, Math.min(limiteX, visor.x));
      visor.y = Math.max(-limiteY, Math.min(limiteY, visor.y));
    }
    pintar();
    refrescarAyuda();
  };

  lienzo.addEventListener('touchstart', (evento) => {
    if (evento.touches.length === 2) {
      modo = 'pellizco';
      distanciaInicial = distancia(evento.touches[0], evento.touches[1]);
      escalaInicial = visor.escala;
      return;
    }
    if (evento.touches.length === 1) {
      const ahora = Date.now();
      if (ahora - ultimoToque < 350) {
        visor.escala = visor.escala > 1.2 ? 1 : 2.5;
        visor.x = 0;
        visor.y = 0;
        imagen.style.transition = 'transform 0.2s ease';
        acomodar();
        setTimeout(() => { imagen.style.transition = ''; }, 220);
        ultimoToque = 0;
        ultimoZoomPorToque = ahora;
        return;
      }
      ultimoToque = ahora;
      modo = visor.escala > 1 ? 'mover' : 'deslizar';
      partidaX = evento.touches[0].clientX;
      partidaY = evento.touches[0].clientY;
      desdeX = visor.x;
      desdeY = visor.y;
    }
  }, { passive: true });

  lienzo.addEventListener('touchmove', (evento) => {
    evento.preventDefault();
    if (modo === 'pellizco' && evento.touches.length === 2) {
      const ahora = distancia(evento.touches[0], evento.touches[1]);
      visor.escala = Math.max(1, Math.min(MAXIMO, escalaInicial * (ahora / distanciaInicial)));
      pintar();
      return;
    }
    if (evento.touches.length !== 1) return;
    const dx = evento.touches[0].clientX - partidaX;
    const dy = evento.touches[0].clientY - partidaY;
    if (modo === 'mover') {
      visor.x = desdeX + dx;
      visor.y = desdeY + dy;
      pintar();
    } else if (modo === 'deslizar') {
      imagen.style.transform = `translate(${dx}px, 0) scale(1)`;
    }
  }, { passive: false });

  const terminar = (evento) => {
    if (modo === 'deslizar') {
      const dx = (evento.changedTouches[0] || {}).clientX - partidaX;
      imagen.style.transition = 'transform 0.2s ease';
      setTimeout(() => { imagen.style.transition = ''; }, 220);
      if (Math.abs(dx) > UMBRAL_DESLIZAR) {
        cambiar(dx < 0 ? 1 : -1);
        modo = null;
        return;
      }
      pintar();
    } else if (modo === 'pellizco' || modo === 'mover') {
      acomodar();
    }
    modo = null;
  };

  lienzo.addEventListener('touchend', terminar);
  lienzo.addEventListener('touchcancel', terminar);

  // Con mouse, para probarlo en la computadora. El navegador también inventa un
  // dblclick después de un doble toque con el dedo, y ese hay que ignorarlo:
  // si no, deshace el acercamiento que acaba de hacer el toque.
  lienzo.addEventListener('dblclick', () => {
    if (Date.now() - ultimoZoomPorToque < 1000) return;
    visor.escala = visor.escala > 1.2 ? 1 : 2.5;
    visor.x = 0;
    visor.y = 0;
    acomodar();
  });
}
