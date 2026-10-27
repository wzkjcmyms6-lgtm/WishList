// Service worker de Ositos.
//
// Guarda los archivos de la app para que abra sin internet. Los datos (lo que
// escriben) los guarda Firestore por su cuenta con su propia caché.
//
// Al cambiar VERSION, la app avisa que hay una versión nueva en vez de
// actualizarse a escondidas: Safari guarda caché con ganas y si no se avisa
// alguien puede quedarse semanas con la versión vieja sin enterarse.

const VERSION = 'ositos-v26';

const ARCHIVOS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './favicon.jpg',
  './iconos/icono-180.png',
  './iconos/icono-192.png',
  './js/app.js',
  './js/estado.js',
  './js/ui.js',
  './js/auth.js',
  './js/datos.js',
  './js/fechas.js',
  './js/firebase.js',
  './js/tema.js',
  './js/visor.js',
  './js/grabador.js',
  './js/datos/preguntas.js',
  './js/secciones/inicio.js',
  './js/secciones/diario.js',
  './js/secciones/album.js',
  './js/secciones/pregunta.js',
  './js/secciones/cartas.js',
  './js/secciones/mapa.js',
  './js/secciones/planes.js',
  './js/secciones/canciones.js',
  './js/secciones/recetas.js',
  './js/secciones/resumen.js',
  './js/secciones/deseos.js',
  './js/secciones/comida.js',
  './js/secciones/gustos.js',
  './js/secciones/ajustes.js',
  './js/secciones/respaldo.js',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(ARCHIVOS))
      // Que falte uno (una sección nueva, por ejemplo) no debe dejar la app sin
      // service worker: se guarda lo que se pueda.
      .catch(() => undefined),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(
        nombres.filter((n) => n !== VERSION).map((n) => caches.delete(n)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (evento) => {
  if (evento.data === 'actualizar') self.skipWaiting();
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;

  const url = new URL(peticion.url);
  // Solo lo nuestro: Firebase, los mapas y Spotify se arreglan solos.
  if (url.origin !== self.location.origin) return;

  // Primero la red, y si no hay, lo guardado. Así nunca se ve una versión
  // vieja teniendo internet, y sin internet igual abre.
  evento.respondWith(
    fetch(peticion)
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(VERSION).then((cache) => cache.put(peticion, copia)).catch(() => undefined);
        return respuesta;
      })
      .catch(() => caches.match(peticion).then((guardada) => guardada
        || caches.match('./index.html'))),
  );
});
