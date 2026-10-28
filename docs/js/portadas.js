// Las portadas de las canciones, sin cuentas, claves ni servidor propio.
//
// Spotify publica la portada de cualquier canción en su oEmbed, y para lo que
// no es de Spotify la búsqueda de iTunes devuelve la carátula del disco. Las
// dos son públicas y gratis. Si alguna no contesta, la canción se queda sin
// portada y ya: nada se rompe por esto.
//
// Lo único que sale del celular es el nombre de la canción (o el link de
// Spotify, que es público). Nada del diario.

const ESPERA = 6000;

async function traerJson(url) {
  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), ESPERA);
  try {
    const respuesta = await fetch(url, { signal: corte.signal });
    if (!respuesta.ok) return null;
    return await respuesta.json();
  } catch (e) {
    return null;   // sin internet, bloqueado, lo que sea
  } finally {
    clearTimeout(reloj);
  }
}

export function esDeSpotify(enlace) {
  return /open\.spotify\.com\//.test(String(enlace || ''));
}

async function deSpotify(enlace) {
  const datos = await traerJson(`https://open.spotify.com/oembed?url=${encodeURIComponent(enlace)}`);
  return (datos && datos.thumbnail_url) || '';
}

async function deITunes(titulo, artista) {
  const busqueda = `${artista || ''} ${titulo || ''}`.trim();
  if (!busqueda) return '';
  const datos = await traerJson(
    `https://itunes.apple.com/search?media=music&entity=song&limit=1&term=${encodeURIComponent(busqueda)}`);
  const primero = datos && datos.results && datos.results[0];
  const arte = primero && primero.artworkUrl100;
  if (!arte) return '';
  // Viene de 100 px; pedirla más grande es cambiarle el nombre al archivo.
  return String(arte).replace('100x100bb', '500x500bb');
}

// Guardar la imagen (y no el enlace) hace que la portada se siga viendo sin
// internet y que no desaparezca si algún día cambia la dirección. Si el
// servidor de la imagen no deja leerla desde otro sitio, queda el enlace: se
// ve igual, pero solo con internet.
const LADO = 240;

async function comoMiniatura(url) {
  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), ESPERA);
  try {
    const respuesta = await fetch(url, { signal: corte.signal });
    if (!respuesta.ok) return url;
    const blob = await respuesta.blob();
    const direccion = URL.createObjectURL(blob);
    try {
      const imagen = await new Promise((listo, falla) => {
        const i = new Image();
        i.onload = () => listo(i);
        i.onerror = () => falla(new Error('no se pudo abrir la portada'));
        i.src = direccion;
      });
      const lienzo = document.createElement('canvas');
      lienzo.width = LADO;
      lienzo.height = LADO;
      lienzo.getContext('2d').drawImage(imagen, 0, 0, LADO, LADO);
      return lienzo.toDataURL('image/jpeg', 0.72);
    } finally {
      URL.revokeObjectURL(direccion);
    }
  } catch (e) {
    return url;
  } finally {
    clearTimeout(reloj);
  }
}

export async function buscarPortada(cancion) {
  let url = '';
  if (esDeSpotify(cancion.enlace)) url = await deSpotify(cancion.enlace);
  if (!url) url = await deITunes(cancion.titulo, cancion.artista);
  // Solo https: cualquier otra cosa no es una portada.
  if (!/^https:\/\//i.test(url)) return '';
  return comoMiniatura(url);
}
