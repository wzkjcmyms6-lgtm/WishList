// Claro, oscuro o el que use el celular. Se guarda en este aparato, no en la
// nube: cada quien lo elige en el suyo.

const LLAVE = 'ositos.tema';

export function temaGuardado() {
  try {
    return localStorage.getItem(LLAVE) || 'auto';
  } catch (e) {
    return 'auto';
  }
}

export function aplicarTema(tema) {
  const elegido = tema || temaGuardado();
  if (elegido === 'auto') document.documentElement.removeAttribute('data-tema');
  else document.documentElement.setAttribute('data-tema', elegido);

  // La barra de estado del iPhone acompaña al fondo.
  const esOscuro = elegido === 'oscuro'
    || (elegido === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const etiqueta = document.querySelector('meta[name="theme-color"]');
  if (etiqueta) etiqueta.setAttribute('content', esOscuro ? '#100E0C' : '#FBF3E7');
}

export function guardarTema(tema) {
  try {
    if (tema === 'auto') localStorage.removeItem(LLAVE);
    else localStorage.setItem(LLAVE, tema);
  } catch (e) {
    // En modo privado no se puede guardar; igual se aplica mientras dure.
  }
  aplicarTema(tema);
}
