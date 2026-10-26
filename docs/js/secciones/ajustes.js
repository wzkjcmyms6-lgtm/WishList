// Sección Ajustes: cuenta, contraseña y candado de PIN.
// En la Fase 1 se le suman la fecha de inicio, las fechas especiales, los
// apodos y el espacio usado.

import { estado, PERFILES } from '../estado.js';
import { escapar } from '../ui.js';
import { tienePin } from '../auth.js';

export function dibujarAjustes() {
  const perfil = PERFILES[estado.sesion];
  const conPin = tienePin(estado.sesion);

  return `<div class="ajustes">

    <div class="ajuste-bloque">
      <div class="ajuste-titulo">Tu cuenta</div>
      <div class="ajuste-fila">
        <div class="ajuste-avatar">${perfil.emoji}</div>
        <div>
          <div class="ajuste-nombre">${escapar(perfil.nombre)}</div>
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
