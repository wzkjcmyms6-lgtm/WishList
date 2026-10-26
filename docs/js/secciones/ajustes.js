// Sección Ajustes: cuenta, contraseña y candado de PIN.
// En la Fase 1 se le suman la fecha de inicio, las fechas especiales, los
// apodos y el espacio usado.

import { estado, PERFILES, pareja, nombreDe } from '../estado.js';
import { escapar } from '../ui.js';
import { tienePin } from '../auth.js';

// 1 GiB es lo que da el plan gratis de Firestore.
const LIMITE = 1024 * 1024 * 1024;

// Si ya la abrieron desde el ícono de inicio, no hace falta explicar nada.
function yaEstaInstalada() {
  return window.navigator.standalone === true
    || window.matchMedia('(display-mode: standalone)').matches;
}

function bloqueInstalar() {
  if (yaEstaInstalada()) return '';
  return `<div class="ajuste-bloque">
    <div class="ajuste-titulo">Tenerla como app</div>
    <div class="ajuste-detalle">
      Para que se abra a pantalla completa, con su ícono y sin la barra del navegador:
    </div>
    <ol class="pasos">
      <li>Abre este sitio en <b>Safari</b> (desde Chrome no se puede).</li>
      <li>Toca el botón <b>Compartir</b> ⬆️ de abajo.</li>
      <li>Desliza y elige <b>"Agregar a inicio"</b>.</li>
    </ol>
  </div>`;
}

function bloqueEspacio() {
  const guardado = estado.ajustes.almacenamiento || { fotos: 0, bytes: 0 };
  const usado = Math.max(0, guardado.bytes || 0);
  const porcentaje = Math.min(100, (usado / LIMITE) * 100);
  const enMegas = (usado / (1024 * 1024)).toFixed(1);
  const quedan = Math.max(0, Math.round((LIMITE - usado) / (600 * 1024)));

  return `<div class="ajuste-bloque">
    <div class="ajuste-titulo">Espacio de las fotos</div>
    <div class="barra"><div class="barra-llena" style="width:${porcentaje.toFixed(2)}%"></div></div>
    <div class="ajuste-detalle">
      ${enMegas} MB de 1 GB · ${guardado.fotos || 0} ${(guardado.fotos || 0) === 1 ? 'foto' : 'fotos'}
    </div>
    <div class="ajuste-nota">
      ${porcentaje > 80
        ? '⚠️ Se está llenando. Avísale a Claude para buscarle la vuelta.'
        : `Al ritmo de ahora entran unas ${quedan.toLocaleString('es-BO')} fotos más.`}
      Es un cálculo aproximado.
    </div>
  </div>`;
}

export function dibujarAjustes() {
  const perfil = PERFILES[estado.sesion];
  const conPin = tienePin(estado.sesion);
  const fechas = Array.isArray(estado.ajustes.fechas) ? estado.ajustes.fechas : [];

  const listaFechas = fechas.length
    ? fechas.map((f, i) => `<div class="fecha-fila">
        <div>
          <div class="ajuste-nombre">${escapar(f.nombre)}</div>
          <div class="ajuste-detalle">${escapar(f.fecha)}</div>
        </div>
        <button class="icon-btn danger" data-accion="borrar-fecha" data-indice="${i}">🗑️</button>
      </div>`).join('')
    : '<div class="ajuste-detalle">Todavía no agregaron ninguna.</div>';

  return `<div class="ajustes">

    <div class="ajuste-bloque">
      <div class="ajuste-titulo">Lo nuestro</div>
      <form id="form-inicio">
        <div class="field">
          <label>¿Cuándo empezaron?</label>
          <input type="date" name="inicio" value="${escapar(estado.ajustes.inicio || '')}" required />
        </div>
        <button type="submit" class="btn btn-primary">Guardar la fecha</button>
      </form>
      <div class="ajuste-nota">Con esto la pantalla de Inicio cuenta los días juntos.</div>
    </div>

    <div class="ajuste-bloque">
      <div class="ajuste-titulo">Fechas especiales</div>
      ${listaFechas}
      <form id="form-fecha-nueva" class="fecha-nueva">
        <div class="field">
          <label>Nombre</label>
          <input type="text" name="nombre" placeholder="Ej. Cumpleaños de Lentina" required maxlength="60" />
        </div>
        <div class="field">
          <label>Día</label>
          <input type="date" name="fecha" required />
        </div>
        <button type="submit" class="btn btn-secondary">Agregar fecha</button>
      </form>
      <div class="ajuste-nota">Inicio muestra una cuenta regresiva de la más cercana.</div>
    </div>

    <div class="ajuste-bloque">
      <div class="ajuste-titulo">Cómo nos llamamos</div>
      <form id="form-apodos">
        <div class="field">
          <label>${PERFILES.lentina.emoji} Lentina</label>
          <input type="text" name="lentina" maxlength="30" placeholder="Lentina"
                 value="${escapar((estado.ajustes.apodos || {}).lentina || '')}" />
        </div>
        <div class="field">
          <label>${PERFILES.manolo.emoji} Manuelito</label>
          <input type="text" name="manolo" maxlength="30" placeholder="Manuelito"
                 value="${escapar((estado.ajustes.apodos || {}).manolo || '')}" />
        </div>
        <button type="submit" class="btn btn-primary">Guardar los apodos</button>
      </form>
      <div class="ajuste-nota">Se usan en toda la app. Déjalos vacíos para volver a los nombres.</div>
    </div>

    ${bloqueInstalar()}

    ${bloqueEspacio()}

    <div class="ajuste-bloque">
      <div class="ajuste-titulo">Tu cuenta</div>
      <div class="ajuste-fila">
        <div class="ajuste-avatar">${perfil.emoji}</div>
        <div>
          <div class="ajuste-nombre">${escapar(nombreDe(estado.sesion))}</div>
          <div class="ajuste-detalle">${escapar(perfil.correo)}</div>
        </div>
      </div>
      <button class="btn btn-secondary" data-accion="salir">Salir de la sesión</button>
      <div class="ajuste-nota">Al salir te va a pedir la contraseña la próxima vez.</div>
    </div>

    <div class="ajuste-bloque">
      <div class="ajuste-titulo">Candado de PIN</div>
      <div class="ajuste-detalle">
        ${conPin
          ? 'Activado en este celular. Te lo pide cada vez que abres la app.'
          : 'Apagado en este celular. La app abre directo.'}
      </div>
      <div class="ajuste-botones">
        <button class="btn btn-secondary" data-accion="configurar-pin">
          ${conPin ? 'Cambiar PIN' : 'Activar PIN'}
        </button>
        ${conPin ? '<button class="btn btn-danger-text" data-accion="quitar-pin">Quitar</button>' : ''}
      </div>
      <div class="ajuste-nota">
        El PIN se guarda cifrado solo en este celular, nunca en internet. Si usas
        otro teléfono, tendrás que elegirlo de nuevo ahí.
      </div>
    </div>

    <div class="ajuste-bloque">
      <div class="ajuste-titulo">Cambiar la contraseña</div>
      <form id="form-clave-nueva">
        <div class="field">
          <label>Contraseña actual</label>
          <input type="password" name="actual" autocomplete="current-password"
                 autocapitalize="none" autocorrect="off" required />
        </div>
        <div class="field">
          <label>Contraseña nueva (mínimo 6)</label>
          <input type="password" name="nueva" autocomplete="new-password"
                 autocapitalize="none" autocorrect="off" minlength="6" required />
        </div>
        <div class="field">
          <label>Repite la nueva</label>
          <input type="password" name="repetir" autocomplete="new-password"
                 autocapitalize="none" autocorrect="off" minlength="6" required />
        </div>
        <button type="submit" class="btn btn-primary">Cambiar contraseña</button>
      </form>
      <div class="ajuste-nota">
        Hazlo desde acá y no borrando la cuenta en Firebase: así no se pierde
        nada de lo que escribiste.
      </div>
    </div>

  </div>`;
}
