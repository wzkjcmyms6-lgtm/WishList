// Pregunta del día y gracias del día.
//
// Cada uno responde por su lado. La respuesta del otro aparece recién cuando ya
// respondiste la tuya, y eso lo impone el servidor (las reglas de Firestore),
// no esta pantalla.

import { estado, PERFILES, pareja, nombreDe } from '../estado.js';
import { escapar, claseTema } from '../ui.js';
import { hoy, diasEntre, comoTitulo } from '../fechas.js';
import { preguntaDelDia } from '../datos/preguntas.js';

// Desde esta fecha se cuentan los días para elegir la pregunta, así los dos
// ven siempre la misma y no se repite hasta terminar la lista.
const PRIMER_DIA = '2026-01-01';

export function preguntaDeHoy() {
  return preguntaDelDia(diasEntre(PRIMER_DIA, hoy()));
}

function miRespuestaDe(fecha) {
  return estado.misRespuestas.find((r) => r.date === fecha) || null;
}

function burbuja(quien, texto) {
  const perfil = PERFILES[quien];
  return `<div class="respuesta">
    <div class="respuesta-autor ${claseTema(perfil.tema)}">${perfil.emoji} ${escapar(nombreDe(quien))}</div>
    <div class="respuesta-texto">${escapar(texto)}</div>
  </div>`;
}

function bloquePregunta() {
  const pregunta = preguntaDeHoy();
  const mia = miRespuestaDe(hoy());
  const suya = estado.respuestasDelOtro[hoy()];
  const nombrePareja = nombreDe(pareja());

  if (!mia || estado.editandoRespuesta) {
    return `<div class="pregunta-tarjeta">
      <div class="pregunta-etiqueta">La pregunta de hoy</div>
      <div class="pregunta-texto">${escapar(pregunta.texto)}</div>
      <form id="form-respuesta">
        <textarea name="texto" class="texto-grande" required maxlength="2000"
                  placeholder="Tu respuesta…">${escapar(mia ? mia.texto : '')}</textarea>
        <button type="submit" class="btn btn-primary">${mia ? 'Guardar' : 'Responder'}</button>
      </form>
      <div class="ajuste-nota">
        La respuesta de ${escapar(nombrePareja)} se destraba recién cuando mandes la tuya.
        Así ninguno se copia del otro.
      </div>
    </div>`;
  }

  let delOtro;
  if (suya === 'oculta' || suya === undefined) {
    delOtro = `<div class="respuesta esperando">⏳ ${escapar(nombrePareja)} todavía no respondió hoy.</div>`;
  } else if (suya === null) {
    delOtro = `<div class="respuesta esperando">⏳ ${escapar(nombrePareja)} todavía no respondió hoy.</div>`;
  } else {
    delOtro = burbuja(pareja(), suya);
  }

  return `<div class="pregunta-tarjeta">
    <div class="pregunta-etiqueta">La pregunta de hoy</div>
    <div class="pregunta-texto">${escapar(pregunta.texto)}</div>
    ${burbuja(estado.sesion, mia.texto)}
    ${delOtro}
    <button class="btn btn-secondary" data-accion="editar-respuesta">Cambiar mi respuesta</button>
  </div>`;
}

function bloqueGracias() {
  const nombrePareja = nombreDe(pareja());
  const mia = estado.graciasHoy.mia;
  const suya = estado.graciasHoy.suya;

  const campo = (mia && !estado.editandoGracias)
    ? `<div class="gracias-mia">“${escapar(mia)}”
        <button class="ver-clave" data-accion="editar-gracias">Cambiarlo</button>
      </div>`
    : `<form id="form-gracias">
        <input type="text" name="texto" maxlength="200" required
               value="${escapar(mia || '')}" placeholder="Hoy te agradezco…" />
        <button type="submit" class="btn btn-secondary">Guardar</button>
      </form>`;

  const suyo = suya
    ? `<div class="gracias-suya">
        <div class="respuesta-autor ${claseTema(PERFILES[pareja()].tema)}">
          ${PERFILES[pareja()].emoji} ${escapar(nombrePareja)}
        </div>
        <div class="respuesta-texto">“${escapar(suya)}”</div>
      </div>`
    : `<div class="ajuste-nota">${escapar(nombrePareja)} todavía no escribió el suyo hoy.</div>`;

  return `<div class="pregunta-tarjeta">
    <div class="pregunta-etiqueta">Gracias del día</div>
    ${campo}
    ${suyo}
  </div>`;
}

function bloqueHistorial() {
  const anteriores = estado.misRespuestas
    .filter((r) => r.date !== hoy())
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 15);

  if (!anteriores.length) return '';

  const filas = anteriores.map((respuesta) => {
    const suya = estado.respuestasDelOtro[respuesta.date];
    const delOtro = (suya && suya !== 'oculta')
      ? burbuja(pareja(), suya)
      : '';
    return `<div class="historial-dia">
      <div class="historial-fecha">${escapar(comoTitulo(respuesta.date))}</div>
      <div class="historial-pregunta">${escapar(respuesta.pregunta || '')}</div>
      ${burbuja(estado.sesion, respuesta.texto)}
      ${delOtro}
    </div>`;
  }).join('');

  return `<div class="pregunta-tarjeta">
    <div class="pregunta-etiqueta">Lo que ya nos contamos</div>
    ${filas}
  </div>`;
}

export function dibujarPregunta() {
  return `<div class="preguntas">
    ${bloquePregunta()}
    ${bloqueGracias()}
    ${bloqueHistorial()}
  </div>`;
}
