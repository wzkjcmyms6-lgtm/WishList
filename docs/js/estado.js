// Perfiles, estado de la app y datos que no cambian.

export const PERFILES = {
  lentina: {
    id: 'lentina',
    nombre: 'Lentina',
    emoji: '🐻‍❄️',
    tema: 'pink',
    correo: 'lentina@ositos.local',
  },
  manolo: {
    id: 'manolo',
    nombre: 'Manuelito',
    emoji: '🐻',
    tema: 'blue',
    correo: 'manuelito@ositos.local',
  },
};

export const CATEGORIAS_GUSTOS = [
  { clave: 'flowers', etiqueta: '🌸 Flores favoritas', ejemplo: 'Ej. Rosas rosadas, girasoles...' },
  { clave: 'colors', etiqueta: '🎨 Colores favoritos', ejemplo: 'Ej. Rosa, celeste...' },
  { clave: 'perfume', etiqueta: '💐 Perfume / Fragancia', ejemplo: 'Marca o aroma preferido' },
  { clave: 'sweets', etiqueta: '🍫 Dulces / Postre favorito', ejemplo: 'Ej. Chocolate amargo, tiramisú...' },
  { clave: 'clothing', etiqueta: '👗 Talla de ropa', ejemplo: 'Ej. Talla M, pantalón 28...' },
  { clave: 'accessories', etiqueta: '💍 Accesorios', ejemplo: 'Aretes, pulseras, anillos...' },
  { clave: 'notes', etiqueta: '✨ Otros gustos', ejemplo: 'Cualquier otra cosa que le guste' },
];

export const ETIQUETAS = [
  { clave: 'cita', texto: '💕 Cita' },
  { clave: 'viaje', texto: '✈️ Viaje' },
  { clave: 'comida', texto: '🍽️ Comida' },
  { clave: 'aniversario', texto: '🎉 Aniversario' },
  { clave: 'logro', texto: '🏆 Logro' },
  { clave: 'cotidiano', texto: '🏠 Cotidiano' },
  { clave: 'familia', texto: '👨‍👩‍👧 Familia' },
  { clave: 'primera-vez', texto: '✨ Primera vez' },
];

export const ANIMOS = ['😊', '🥹', '😍', '😂', '🤗', '😌', '🥰', '😮', '😴', '😢'];

export const REACCIONES = ['❤️', '🥹', '😂', '🔥', '🤗', '😍'];

export const estado = {
  pantalla: 'cargando', // cargando | perfiles | clave | pin-crear | pin-abrir | panel | error
  errorConexion: false,

  perfilElegido: null,   // en la pantalla de clave
  entrando: false,
  errorAcceso: '',

  sesion: null,          // 'lentina' | 'manolo' cuando ya entró del todo
  pinBuffer: '',
  pinError: false,
  pinConfirmando: null,  // al crear el PIN, guarda el primer intento

  seccion: 'inicio',     // inicio | diario | deseos | comida | gustos | ajustes
  pestana: 'mia',        // mia | pareja
  busqueda: '',
  orden: 'recientes',

  entradas: [],
  borradores: [],
  cuantasEntradas: 15,
  hayMasEntradas: false,
  ajustes: {},
  filtroAutor: 'todos',  // todos | lentina | manolo
  filtroEtiqueta: '',
  busquedaDiario: '',

  deseos: [],
  comidas: [],
  gustos: {},

  hoja: null,
  confirmacion: null,
  aviso: null,
  fotoAmpliada: null,
};

export function pareja() {
  return estado.sesion === 'lentina' ? 'manolo' : 'lentina';
}

export function perfilDeCorreo(correo) {
  const limpio = String(correo || '').toLowerCase();
  const encontrado = Object.values(PERFILES).find((p) => p.correo === limpio);
  return encontrado ? encontrado.id : null;
}

export function misDeseos() { return estado.deseos.filter((d) => d.owner === estado.sesion); }
export function deseosDeLaPareja() { const otro = pareja(); return estado.deseos.filter((d) => d.owner === otro); }
export function misComidas() { return estado.comidas.filter((c) => c.owner === estado.sesion); }
export function comidasDeLaPareja() { const otro = pareja(); return estado.comidas.filter((c) => c.owner === otro); }
