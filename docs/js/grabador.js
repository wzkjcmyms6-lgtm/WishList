// Grabar notas de voz cortas desde el celular.
//
// Se corta sola al minuto: son lo más pesado que guardamos y Firestore no
// acepta documentos de más de 1 MiB.

export const MAXIMO_SEGUNDOS = 60;
const TOPE_BYTES = 900 * 1024;

// Safari del iPhone graba en mp4; Chrome y Firefox, en webm con opus.
function formatoSoportado() {
  const opciones = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  if (typeof MediaRecorder === 'undefined') return null;
  return opciones.find((tipo) => MediaRecorder.isTypeSupported(tipo)) || '';
}

export function sePuedeGrabar() {
  return Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia
    && typeof MediaRecorder !== 'undefined');
}

function aDataUrl(blob) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onerror = () => rechazar(new Error('No se pudo leer el audio'));
    lector.onload = () => resolver(lector.result);
    lector.readAsDataURL(blob);
  });
}

export async function empezarAGrabar({ alContar, alCortarse }) {
  const flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
  const formato = formatoSoportado();
  const grabadora = new MediaRecorder(flujo, formato ? { mimeType: formato } : undefined);
  const pedazos = [];
  const desde = Date.now();

  grabadora.addEventListener('dataavailable', (evento) => {
    if (evento.data && evento.data.size) pedazos.push(evento.data);
  });

  const terminada = new Promise((resolver) => {
    grabadora.addEventListener('stop', async () => {
      flujo.getTracks().forEach((pista) => pista.stop());
      const blob = new Blob(pedazos, { type: grabadora.mimeType || 'audio/webm' });
      const segundos = Math.max(1, Math.round((Date.now() - desde) / 1000));
      if (blob.size > TOPE_BYTES) {
        resolver({ error: 'La nota salió muy pesada. Prueba una más corta.' });
        return;
      }
      resolver({ audio: await aDataUrl(blob), segundos, bytes: blob.size });
    });
  });

  grabadora.start();

  const reloj = setInterval(() => {
    const van = Math.round((Date.now() - desde) / 1000);
    alContar(van);
    if (van >= MAXIMO_SEGUNDOS) {
      clearInterval(reloj);
      if (grabadora.state !== 'inactive') grabadora.stop();
      alCortarse();
    }
  }, 250);

  return {
    detener() {
      clearInterval(reloj);
      if (grabadora.state !== 'inactive') grabadora.stop();
      return terminada;
    },
    cancelar() {
      clearInterval(reloj);
      if (grabadora.state !== 'inactive') grabadora.stop();
      flujo.getTracks().forEach((pista) => pista.stop());
    },
  };
}

export function enMinutos(segundos) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
