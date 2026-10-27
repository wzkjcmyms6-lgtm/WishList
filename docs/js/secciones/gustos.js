// Sección Gustos: la chuleta de regalos de Manuelito. Las reglas de Firestore
// solo lo dejan leer y escribir a él, así que Lentina nunca ve esta pantalla.

import { estado, CATEGORIAS_GUSTOS } from '../estado.js';
import { escapar } from '../ui.js';

export function dibujarGustos() {
  const guardado = estado.gustos || {};
  const campos = CATEGORIAS_GUSTOS.map((categoria) => `
    <div class="field">
      <label>${categoria.etiqueta}</label>
      <textarea name="${categoria.clave}" placeholder="${escapar(categoria.ejemplo)}"
                maxlength="300">${escapar(guardado[categoria.clave])}</textarea>
    </div>`).join('');

  return `<div class="tastes-panel">
    <div class="panel-nota">Solo tú ves esto. Lentina no puede abrirlo ni aunque quiera.</div>
    <form id="form-gustos">
      ${campos}
      <div class="sheet-actions sheet-actions-fijas">
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>
  </div>`;
}
