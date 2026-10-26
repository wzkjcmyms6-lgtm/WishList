// Sección Ajustes: cuenta, contraseña y candado de PIN.
// En la Fase 1 se le suman la fecha de inicio, las fechas especiales, los
// apodos y el espacio usado.

import { estado, PERFILES } from '../estado.js';
import { escapar } from '../ui.js';
import { tienePin } from '../auth.js';

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
