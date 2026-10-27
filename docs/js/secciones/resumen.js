// Resumen del año: cuántos recuerdos, fotos y lugares, el mes más lleno, quién
// escribió más y las palabras que más repetimos.

import { estado, PERFILES, nombreDe } from '../estado.js';
import { escapar, claseTema } from '../ui.js';
import { nombreDelMes } from '../fechas.js';

// Palabras que no dicen nada del año y solo ensucian el conteo.
const VACIAS = new Set([
  'que', 'los', 'las', 'del', 'por', 'con', 'una', 'uno', 'para', 'como', 'más', 'mas',
  'pero', 'sus', 'este', 'esta', 'esto', 'eso', 'ese', 'esa', 'son', 'fue', 'era', 'hay',
  'muy', 'nos', 'les', 'ya', 'ha', 'he', 'me', 'te', 'se', 'le', 'lo', 'la', 'el', 'un',
  'de', 'en', 'al', 'y', 'o', 'a', 'es', 'mi', 'tu', 'su', 'no', 'si', 'sí', 'ni', 'yo',
  'día', 'dia', 'hoy', 'todo', 'toda', 'todos', 'cuando', 'porque', 'también', 'tambien',
  'estaba', 'había', 'habia', 'hacer', 'hizo', 'fuimos', 'estuvo', 'nuestra', 'nuestro',
  'bien', 'así', 'asi', 'sin', 'sobre', 'entre', 'desde', 'hasta', 'otra', 'otro',
]);

export function calcularResumen(entradas, anio) {
  const porMes = {};
  const porAutor = { lentina: 0, manolo: 0 };
  const palabras = {};
  let fotos = 0;
  const dias = new Set();

  entradas.forEach((entrada) => {
    const mes = String(entrada.fecha || '').slice(0, 7);
    porMes[mes] = (porMes[mes] || 0) + 1;
    if (porAutor[entrada.autor] !== undefined) porAutor[entrada.autor] += 1;
    fotos += (entrada.fotos || []).length;
    dias.add(entrada.fecha);

    String(entrada.texto || '')
      .toLowerCase()
      .replace(/[^\wáéíóúñü\s]/gi, ' ')
      .split(/\s+/)
      .forEach((palabra) => {
        if (palabra.length < 3 || VACIAS.has(palabra)) return;
        palabras[palabra] = (palabras[palabra] || 0) + 1;
      });
  });

  const mesTop = Object.entries(porMes).sort((a, b) => b[1] - a[1])[0] || null;
  const topPalabras = Object.entries(palabras)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return {
    anio,
    recuerdos: entradas.length,
    fotos,
    dias: dias.size,
    lugares: estado.lugares.length,
    mesTop: mesTop ? { mes: mesTop[0], cuantos: mesTop[1] } : null,
    porAutor,
    palabras: topPalabras,
  };
}

function dato(numero, etiqueta) {
  return `<div class="resumen-dato">
    <div class="resumen-numero">${numero.toLocaleString('es-BO')}</div>
    <div class="resumen-etiqueta">${etiqueta}</div>
  </div>`;
}

export function dibujarResumen() {
  const r = estado.resumen;

  const cabecera = `<button class="btn btn-secondary volver-lista" data-accion="volver-inicio">‹ Volver a Inicio</button>`;

  if (!r) {
    return `<div class="resumen">${cabecera}
      <div class="empty-state"><div class="empty-emoji">✨</div><div>Juntando los números…</div></div>
    </div>`;
  }

  if (!r.recuerdos) {
    return `<div class="resumen">${cabecera}
      <div class="resumen-portada">
        <div class="resumen-anio">${r.anio}</div>
        <div class="resumen-bajada">Todavía no hay recuerdos de este año.</div>
      </div>
      <div class="ajuste-botones">
        <button class="btn btn-secondary" data-accion="resumen-anio" data-valor="${r.anio - 1}">Ver ${r.anio - 1}</button>
      </div>
    </div>`;
  }

  const nubes = r.palabras.length
    ? `<div class="resumen-tarjeta">
        <div class="inicio-tarjeta-titulo">Lo que más dijimos</div>
        <div class="nube">${r.palabras.map(([palabra, veces], i) =>
          `<span class="nube-palabra n${Math.min(i, 3)}">${escapar(palabra)}<span class="nube-veces">${veces}</span></span>`).join('')}</div>
      </div>`
    : '';

  const quienes = `<div class="resumen-tarjeta">
    <div class="inicio-tarjeta-titulo">Quién escribió más</div>
    ${['lentina', 'manolo'].map((quien) => {
      const perfil = PERFILES[quien];
      const cuantos = r.porAutor[quien] || 0;
      const ancho = r.recuerdos ? Math.round((cuantos / r.recuerdos) * 100) : 0;
      return `<div class="resumen-fila">
        <span class="resumen-autor ${claseTema(perfil.tema)}">${perfil.emoji} ${escapar(nombreDe(quien))}</span>
        <div class="barra"><div class="barra-llena" style="width:${ancho}%"></div></div>
        <span class="resumen-cuenta">${cuantos}</span>
      </div>`;
    }).join('')}
  </div>`;

  return `<div class="resumen">
    ${cabecera}
    <div class="resumen-portada">
      <div class="resumen-anio">${r.anio}</div>
      <div class="resumen-bajada">Nuestro año, en números</div>
    </div>
    <div class="resumen-datos">
      ${dato(r.recuerdos, r.recuerdos === 1 ? 'recuerdo' : 'recuerdos')}
      ${dato(r.fotos, r.fotos === 1 ? 'foto' : 'fotos')}
      ${dato(r.dias, r.dias === 1 ? 'día anotado' : 'días anotados')}
      ${dato(r.lugares, r.lugares === 1 ? 'lugar' : 'lugares')}
    </div>
    ${r.mesTop ? `<div class="resumen-tarjeta">
      <div class="inicio-tarjeta-titulo">El mes más lleno</div>
      <div class="resumen-mes">${escapar(nombreDelMes(`${r.mesTop.mes}-01`))}</div>
      <div class="ajuste-detalle">${r.mesTop.cuantos} ${r.mesTop.cuantos === 1 ? 'recuerdo' : 'recuerdos'}</div>
    </div>` : ''}
    ${quienes}
    ${nubes}
    <div class="ajuste-botones">
      <button class="btn btn-secondary" data-accion="resumen-anio" data-valor="${r.anio - 1}">Ver ${r.anio - 1}</button>
      <button class="btn btn-secondary" data-accion="resumen-anio" data-valor="${r.anio + 1}">Ver ${r.anio + 1}</button>
    </div>
  </div>`;
}
