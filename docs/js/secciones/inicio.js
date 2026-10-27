// Pantalla de Inicio: lo nuestro de un vistazo.

import { estado, PERFILES, pareja, nombreDe } from '../estado.js';
import { escapar, claseTema } from '../ui.js';
import {
  hoy, diasEntre, enDias, comoTitulo, enPalabras, mismoDiaYMes, proximaVez, esFechaValida,
} from '../fechas.js';

function bloqueDiasJuntos() {
  const inicio = estado.ajustes.inicio;
  if (!esFechaValida(inicio)) {
    return `<div class="inicio-destacado sin-fecha">
      <div class="inicio-numero">💞</div>
      <div class="inicio-texto">Pon la fecha en que empezaron y acá va a salir cuántos días llevan juntos.</div>
      <button class="btn btn-primary" data-accion="ir-ajustes">Poner la fecha</button>
    </div>`;
  }
  const dias = diasEntre(inicio, hoy());
  return `<div class="inicio-destacado">
    <div class="inicio-etiqueta">Llevamos juntos</div>
    <div class="inicio-numero">${dias.toLocaleString('es-BO')}</div>
    <div class="inicio-texto">${dias === 1 ? 'día' : 'días'} · desde el ${escapar(enPalabras(inicio, { conAnio: true }))}</div>
  </div>`;
}

function bloqueProximaFecha() {
  const fechas = Array.isArray(estado.ajustes.fechas) ? estado.ajustes.fechas : [];
  const candidatas = [];

  if (esFechaValida(estado.ajustes.inicio)) {
    const siguiente = proximaVez(estado.ajustes.inicio);
    candidatas.push({ nombre: 'Nuestro aniversario', ...siguiente });
  }
  fechas.forEach((f) => {
    if (esFechaValida(f.fecha)) candidatas.push({ nombre: f.nombre, ...proximaVez(f.fecha) });
  });

  if (!candidatas.length) return '';
  candidatas.sort((a, b) => a.faltan - b.faltan);
  const proxima = candidatas[0];

  const cuando = proxima.faltan === 0
    ? '¡Es hoy! 🎉'
    : proxima.faltan === 1 ? 'Mañana' : `En ${enDias(proxima.faltan)}`;

  return `<div class="inicio-tarjeta">
    <div class="inicio-tarjeta-titulo">Lo que viene</div>
    <div class="inicio-fila">
      <div class="inicio-fila-nombre">${escapar(proxima.nombre)}</div>
      <div class="inicio-fila-valor">${cuando}</div>
    </div>
  </div>`;
}

function bloqueUnDiaComoHoy() {
  const deHoy = hoy();
  const recuerdos = estado.entradas.filter((entrada) =>
    entrada.fecha !== deHoy && mismoDiaYMes(entrada.fecha, deHoy));
  if (!recuerdos.length) return '';

  const lista = recuerdos.slice(0, 3).map((entrada) => {
    const perfil = PERFILES[entrada.autor] || PERFILES.lentina;
    const anios = Math.max(1, Math.round(diasEntre(entrada.fecha, deHoy) / 365));
    return `<button class="recuerdo" data-accion="ir-diario">
      <div class="recuerdo-cuando">Hace ${anios} ${anios === 1 ? 'año' : 'años'}</div>
      <div class="recuerdo-texto">${escapar(String(entrada.texto || '').slice(0, 120))}</div>
      <div class="recuerdo-autor ${claseTema(perfil.tema)}">${perfil.emoji} ${escapar(nombreDe(entrada.autor))}</div>
    </button>`;
  }).join('');

  return `<div class="inicio-tarjeta">
    <div class="inicio-tarjeta-titulo">Un día como hoy…</div>
    ${lista}
  </div>`;
}

function bloqueUltimas() {
  if (!estado.entradas.length) return '';
  const ultimaDe = (quien) => estado.entradas.find((e) => e.autor === quien);
  const filas = [estado.sesion, pareja()].map((quien) => {
    const perfil = PERFILES[quien];
    const entrada = ultimaDe(quien);
    const texto = entrada
      ? `${escapar(String(entrada.texto || '').slice(0, 90))}${String(entrada.texto || '').length > 90 ? '…' : ''}`
      : '<span class="inicio-vacio">Todavía no escribió nada</span>';
    return `<button class="ultima" data-accion="ir-diario">
      <div class="ultima-autor ${claseTema(perfil.tema)}">${perfil.emoji} ${escapar(nombreDe(quien))}</div>
      <div class="ultima-texto">${texto}</div>
      ${entrada ? `<div class="ultima-cuando">${escapar(comoTitulo(entrada.fecha))}</div>` : ''}
    </button>`;
  }).join('');

  return `<div class="inicio-tarjeta">
    <div class="inicio-tarjeta-titulo">Lo último que escribimos</div>
    ${filas}
  </div>`;
}

// Los días que vale la pena festejar.
const HITOS = [50, 100, 200, 300, 365, 500, 730, 1000, 1095, 1500, 1825, 2000, 2555, 3000, 3650];

export function hitoDeHoy() {
  if (!esFechaValida(estado.ajustes.inicio)) return null;
  const dias = diasEntre(estado.ajustes.inicio, hoy());
  return HITOS.includes(dias) ? dias : null;
}

function bloqueCelebracion() {
  const hito = hitoDeHoy();
  if (!hito) return '';
  const texto = hito === 365 ? '¡Un año juntos!'
    : hito === 730 ? '¡Dos años juntos!'
    : hito === 1095 ? '¡Tres años juntos!'
    : hito === 1825 ? '¡Cinco años juntos!'
    : `¡${hito.toLocaleString('es-BO')} días juntos!`;

  const papelitos = Array.from({ length: 14 }, (_, i) =>
    `<span class="papelito p${i % 7}" style="left:${(i * 7 + 3) % 96}%; animation-delay:${(i % 5) * 0.4}s"></span>`).join('');

  return `<div class="celebracion">
    <div class="papelitos">${papelitos}</div>
    <div class="celebracion-emoji">🎉</div>
    <div class="celebracion-texto">${texto}</div>
    <div class="celebracion-bajada">Hoy es de esos días para anotar.</div>
  </div>`;
}

function bloqueFrasco() {
  const recuerdo = estado.recuerdoDelFrasco;
  if (!recuerdo) {
    return `<button class="frasco" data-accion="sacar-recuerdo">
      <span class="frasco-emoji">🫙</span>
      <span>Sacar un recuerdo al azar</span>
    </button>`;
  }
  if (recuerdo === 'vacio') {
    return `<div class="inicio-tarjeta">
      <div class="inicio-tarjeta-titulo">El frasco</div>
      <div class="ajuste-nota">Todavía no hay recuerdos para sacar. Escribe el primero 💛</div>
      <button class="btn btn-secondary" data-accion="guardar-frasco">Cerrar</button>
    </div>`;
  }
  const perfil = PERFILES[recuerdo.autor] || PERFILES.lentina;
  return `<div class="inicio-tarjeta frasco-abierto">
    <div class="inicio-tarjeta-titulo">🫙 Del frasco</div>
    <div class="recuerdo-cuando">${escapar(enPalabras(recuerdo.fecha, { conAnio: true }))}</div>
    <div class="recuerdo-texto">${escapar(String(recuerdo.texto || '').slice(0, 400))}</div>
    <div class="recuerdo-autor ${claseTema(perfil.tema)}">${perfil.emoji} ${escapar(nombreDe(recuerdo.autor))}</div>
    <div class="ajuste-botones">
      <button class="btn btn-secondary" data-accion="sacar-recuerdo">Otro</button>
      <button class="btn btn-secondary" data-accion="guardar-frasco">Cerrar</button>
    </div>
  </div>`;
}

function bloqueCartas() {
  const paraMi = estado.cartas.filter((c) => c.autor !== estado.sesion);
  const disponibles = paraMi.filter((c) =>
    (c.tipo === 'motivo' || Date.now() >= (c.abreEnMs || 0)) && !c.abiertaEn);

  const aviso = disponibles.length
    ? `<span class="cartas-insignia">${disponibles.length}</span>`
    : '';

  return `<button class="frasco cartas-boton" data-accion="ir-cartas">
    <span class="frasco-emoji">💌</span>
    <span>Cartas para abrir después</span>
    ${aviso}
  </button>`;
}

export function dibujarInicio() {
  return `<div class="inicio">
    ${bloqueCelebracion()}
    ${bloqueDiasJuntos()}
    <button class="escribir-grande" data-accion="nueva-entrada">
      <span class="escribir-emoji">✍️</span>
      <span>Escribir un recuerdo</span>
    </button>
    ${bloqueFrasco()}
    ${bloqueCartas()}
    <div class="atajos">
      <button class="atajo" data-accion="ir-planes"><span>✨</span>Planes</button>
      <button class="atajo" data-accion="ir-mapa"><span>🗺️</span>Lugares</button>
      <button class="atajo" data-accion="ir-recetas"><span>🍳</span>Recetas</button>
      <button class="atajo" data-accion="ir-canciones"><span>🎵</span>Canciones</button>
      <button class="atajo ancho" data-accion="ir-resumen"><span>📊</span>Nuestro año</button>
    </div>
    ${bloqueProximaFecha()}
    ${bloqueUnDiaComoHoy()}
    ${bloqueUltimas()}
  </div>`;
}
