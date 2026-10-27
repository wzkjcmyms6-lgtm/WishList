// Descargar un respaldo con todo: los recuerdos, las fotos, las cartas, los
// planes, las canciones, los lugares y los deseos.
//
// El plan gratis de Firebase no hace copias automáticas, así que esto es la
// red de seguridad. Se arma en el propio celular y se baja como .zip.

import { estado, PERFILES } from '../estado.js';
import { escapar } from '../ui.js';
import { hoy } from '../fechas.js';
import { traerMiniatura, traerFotoGrande, traerAnio } from '../datos.js';

const JSZIP = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';

let cargandoZip = null;
function cargarJSZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  if (cargandoZip) return cargandoZip;
  cargandoZip = new Promise((resolver, rechazar) => {
    const guion = document.createElement('script');
    guion.src = JSZIP;
    guion.onload = () => resolver(window.JSZip);
    guion.onerror = () => { cargandoZip = null; rechazar(new Error('sin jszip')); };
    document.head.appendChild(guion);
  });
  return cargandoZip;
}

function comoTexto(entradas) {
  return entradas
    .slice()
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
    .map((entrada) => {
      const quien = (PERFILES[entrada.autor] || {}).nombre || entrada.autor;
      const partes = [`${entrada.fecha} — ${quien}${entrada.animo ? ` ${entrada.animo}` : ''}`];
      if (entrada.lugar) partes.push(`Lugar: ${entrada.lugar}`);
      if ((entrada.etiquetas || []).length) partes.push(`Etiquetas: ${entrada.etiquetas.join(', ')}`);
      partes.push('');
      partes.push(entrada.texto || '');
      if ((entrada.fotos || []).length) partes.push(`\n[${entrada.fotos.length} foto(s) en la carpeta fotos/]`);
      return partes.join('\n');
    })
    .join(`\n\n${'─'.repeat(50)}\n\n`);
}

function aBinario(dataUrl) {
  const base64 = String(dataUrl).split(',')[1] || '';
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

export async function armarRespaldo(avisarPaso) {
  const JSZipClase = await cargarJSZip();
  const zip = new JSZipClase();

  avisarPaso('Juntando los recuerdos…');
  const anioActual = Number(hoy().slice(0, 4));
  const anios = [];
  for (let anio = anioActual; anio >= anioActual - 10; anio -= 1) anios.push(anio);

  let entradas = [];
  for (const anio of anios) {
    try {
      const delAnio = await traerAnio(anio);
      entradas = entradas.concat(delAnio);
      // Si un año no tiene nada y el anterior tampoco, no seguir hacia atrás.
      if (!delAnio.length && anio < anioActual - 1) break;
    } catch (e) {
      break;
    }
  }

  zip.file('diario.txt', comoTexto(entradas));
  zip.file('diario.json', JSON.stringify(entradas, null, 2));
  zip.file('cartas.json', JSON.stringify(estado.cartas, null, 2));
  zip.file('planes.json', JSON.stringify(estado.planes, null, 2));
  zip.file('canciones.json', JSON.stringify(estado.canciones, null, 2));
  zip.file('lugares.json', JSON.stringify(estado.lugares, null, 2));
  zip.file('deseos.json', JSON.stringify(estado.deseos, null, 2));
  zip.file('comidas.json', JSON.stringify(estado.comidas, null, 2));
  zip.file('ajustes.json', JSON.stringify(estado.ajustes, null, 2));
  zip.file('respuestas.json', JSON.stringify(estado.misRespuestas, null, 2));

  const todasLasFotos = entradas.flatMap((e) => (e.fotos || []).map((id) => ({ id, fecha: e.fecha })));
  const carpeta = zip.folder('fotos');
  let hechas = 0;
  for (const foto of todasLasFotos) {
    hechas += 1;
    avisarPaso(`Guardando fotos… ${hechas} de ${todasLasFotos.length}`);
    try {
      const grande = await traerFotoGrande(foto.id) || await traerMiniatura(foto.id);
      if (grande) carpeta.file(`${foto.fecha}_${foto.id}.jpg`, aBinario(grande));
    } catch (e) {
      // Una foto que no se pueda bajar no debe arruinar todo el respaldo.
    }
  }

  avisarPaso('Comprimiendo…');
  return zip.generateAsync({ type: 'blob' });
}

export function dibujarBloqueRespaldo() {
  const estadoRespaldo = estado.respaldo;
  const ocupado = estadoRespaldo && estadoRespaldo.enCurso;

  return `<div class="ajuste-bloque">
    <div class="ajuste-titulo">Descargar un respaldo</div>
    <div class="ajuste-detalle">
      Todo lo escrito y todas las fotos, en un archivo .zip que se guarda en tu celular.
    </div>
    <button class="btn btn-secondary" data-accion="descargar-respaldo" ${ocupado ? 'disabled' : ''}>
      ${ocupado ? escapar(estadoRespaldo.paso || 'Armando…') : '💾 Armar el respaldo'}
    </button>
    <div class="ajuste-nota">
      El plan gratis de Firebase no hace copias automáticas, así que conviene bajarlo
      de vez en cuando. Puede tardar si hay muchas fotos.
    </div>
  </div>`;
}
