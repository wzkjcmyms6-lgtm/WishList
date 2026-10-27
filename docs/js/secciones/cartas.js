// Cartas "ábrela cuando…": se escriben hoy y se leen después, el día que toca
// o el día que haga falta.
//
// El texto vive en otro documento y las reglas de Firestore no lo entregan
// hasta que llega la fecha. No es la pantalla la que lo esconde: aunque alguien
// mirara los datos crudos, el servidor le diría que no.

import { estado, PERFILES, pareja, nombreDe } from '../estado.js';
import { escapar, claseTema } from '../ui.js';
import { hoy, enPalabras, diasEntre, enDias } from '../fechas.js';

export const MOTIVOS = [
  { clave: 'extranes', texto: 'cuando me extrañes' },
  { clave: 'triste', texto: 'cuando estés triste' },
  { clave: 'orgullo', texto: 'cuando estés orgulloso/a de ti' },
  { clave: 'peleamos', texto: 'cuando hayamos peleado' },
  { clave: 'miedo', texto: 'cuando tengas miedo' },
  { clave: 'celebrar', texto: 'cuando tengas algo que celebrar' },
  { clave: 'cualquiera', texto: 'cuando quieras' },
];

function textoDelMotivo(clave) {
  const encontrado = MOTIVOS.find((m) => m.clave === clave);
  return encontrado ? encontrado.texto : 'cuando quieras';
}

function estaDisponible(carta) {
  if (carta.tipo === 'motivo') return true;
  return Date.now() >= (carta.abreEnMs || 0);
}

function sobre(carta) {
  const esMia = carta.autor === estado.sesion;
  const perfil = PERFILES[carta.autor] || PERFILES.lentina;
  const disponible = estaDisponible(carta);
  const abierta = Boolean(carta.abiertaEn);

  const cuando = carta.tipo === 'motivo'
    ? `Ábrela ${escapar(textoDelMotivo(carta.motivo))}`
    : disponible
      ? `Se abrió el ${escapar(enPalabras(carta.abreEn, { conAnio: true }))}`
      : `Se abre el ${escapar(enPalabras(carta.abreEn, { conAnio: true }))} · faltan ${enDias(diasEntre(hoy(), carta.abreEn))}`;

  let accion = '';
  if (esMia) {
    accion = abierta
      ? `<div class="carta-estado">✅ La abrió el ${escapar(new Date(carta.abiertaEn).toLocaleDateString('es-BO'))}</div>`
      : '<div class="carta-estado">⏳ Todavía no la abre</div>';
  } else if (!disponible) {
    accion = '<div class="carta-estado">🔒 Todavía no es el día</div>';
  } else {
    accion = `<button class="btn btn-primary" data-accion="abrir-carta" data-id="${carta.id}">
      ${abierta ? 'Volver a leerla' : 'Abrir la carta'}
    </button>`;
  }

  return `<div class="carta ${disponible ? '' : 'cerrada'}">
    <div class="carta-cabecera">
      <div class="carta-sello">${disponible ? '💌' : '🔒'}</div>
      <div>
        <div class="carta-titulo">${escapar(carta.titulo)}</div>
        <div class="carta-de ${claseTema(perfil.tema)}">
          ${esMia ? 'Tuya para ' + escapar(nombreDe(pareja())) : 'De ' + escapar(nombreDe(carta.autor))}
        </div>
      </div>
      ${esMia ? `<button class="icon-btn danger" aria-label="Borrar la carta" data-accion="borrar-carta" data-id="${carta.id}">🗑️</button>` : ''}
    </div>
    <div class="carta-cuando">${cuando}</div>
    ${accion}
  </div>`;
}

export function dibujarCartas() {
  const cartas = estado.cartas.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const paraMi = cartas.filter((c) => c.autor !== estado.sesion);
  const mias = cartas.filter((c) => c.autor === estado.sesion);

  const nuevo = `<button class="btn btn-secondary volver-lista" data-accion="volver-inicio">‹ Volver a Inicio</button>
  <button class="escribir-grande" data-accion="nueva-carta">
    <span class="escribir-emoji">💌</span>
    <span>Escribir una carta</span>
  </button>`;

  if (!cartas.length) {
    return `<div class="cartas">
      ${nuevo}
      <div class="empty-state">
        <div class="empty-emoji">💌</div>
        <div>Todavía no hay cartas.<br/>Escribe una para que la abra<br/>el día que haga falta.</div>
      </div>
    </div>`;
  }

  return `<div class="cartas">
    ${nuevo}
    ${paraMi.length ? `<div class="cartas-grupo">
      <div class="diario-fecha">Para ti</div>
      ${paraMi.map(sobre).join('')}
    </div>` : ''}
    ${mias.length ? `<div class="cartas-grupo">
      <div class="diario-fecha">Las que escribiste</div>
      ${mias.map(sobre).join('')}
    </div>` : ''}
  </div>`;
}

export function dibujarCartaAbierta() {
  const abierta = estado.cartaAbierta;
  if (!abierta) return '';
  const carta = estado.cartas.find((c) => c.id === abierta.id);
  if (!carta) return '';
  const perfil = PERFILES[carta.autor] || PERFILES.lentina;

  const cuerpo = abierta.texto === null
    ? '<div class="boot-spinner"></div>'
    : abierta.texto === 'cerrada'
      ? '<div class="carta-estado">🔒 Esta carta todavía no se puede abrir.</div>'
      : `<div class="carta-texto">${escapar(abierta.texto)}</div>`;

  return `<div class="sheet-overlay" data-accion="carta-fondo"><div class="sheet carta-hoja">
    <div class="sheet-handle"></div>
    <div class="carta-de ${claseTema(perfil.tema)}">${perfil.emoji} De ${escapar(nombreDe(carta.autor))}</div>
    <div class="sheet-title">${escapar(carta.titulo)}</div>
    ${cuerpo}
    <div class="sheet-actions">
      <button type="button" class="btn btn-secondary" data-accion="cerrar-carta">Cerrar</button>
    </div>
  </div></div>`;
}

export function dibujarHojaCarta() {
  const { item } = estado.hoja;
  const motivos = MOTIVOS.map((m) =>
    `<button type="button" class="sort-chip ${item.motivo === m.clave ? 'active' : ''}"
             data-accion="elegir-motivo" data-valor="${m.clave}">${m.texto}</button>`).join('');

  return `<div class="sheet-overlay" data-accion="hoja-fondo"><div class="sheet">
    <div class="sheet-handle"></div>
    <div class="sheet-title">Una carta para ${escapar(nombreDe(pareja()))}</div>
    <form id="form-carta">
      <div class="field">
        <label>¿Cómo se llama?</label>
        <input type="text" name="titulo" required maxlength="80"
               placeholder="Ej. Para un día gris" value="${escapar(item.titulo)}" />
      </div>
      <div class="field">
        <textarea name="texto" class="texto-grande" required maxlength="5000"
                  placeholder="Escríbele…">${escapar(item.texto)}</textarea>
      </div>
      <div class="field">
        <label>¿Cuándo se abre?</label>
        <div class="tabs chico">
          <button type="button" class="tab-btn ${item.tipo === 'motivo' ? 'active' : ''}"
                  data-accion="tipo-carta" data-valor="motivo">Por un motivo</button>
          <button type="button" class="tab-btn ${item.tipo === 'fecha' ? 'active' : ''}"
                  data-accion="tipo-carta" data-valor="fecha">En una fecha</button>
        </div>
      </div>
      ${item.tipo === 'fecha'
        ? `<div class="field">
            <label>El día</label>
            <input type="date" name="abreEn" required min="${hoy()}" value="${escapar(item.abreEn)}" />
            <div class="ajuste-nota">Hasta ese día, el servidor no le entrega el texto a nadie. Ni a ti.</div>
          </div>`
        : `<div class="field">
            <label>Ábrela…</label>
            <div class="sort-chips envuelto">${motivos}</div>
          </div>`}
      <div class="sheet-actions">
        <button type="button" class="btn btn-secondary" data-accion="hoja-cancelar">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar la carta</button>
      </div>
    </form>
  </div></div>`;
}
