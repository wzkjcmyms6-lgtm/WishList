// Fechas en hora de Bolivia (America/La_Paz, siempre UTC-4).
//
// Nunca usar toISOString() para sacar el día: devuelve UTC, así que a partir de
// las 20:00 de Bolivia ya estaría contando el día siguiente.

const ZONA = 'America/La_Paz';

const FORMATO_ISO = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit',
});

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// 'AAAA-MM-DD' del día de hoy en Bolivia.
export function hoy() {
  return FORMATO_ISO.format(new Date());
}

function partes(iso) {
  const [anio, mes, dia] = String(iso).split('-').map(Number);
  return { anio, mes, dia };
}

// Mediodía UTC para comparar días sin que el horario mueva nada.
function comoNumero(iso) {
  const { anio, mes, dia } = partes(iso);
  return Date.UTC(anio, mes - 1, dia);
}

export function diasEntre(desde, hasta) {
  return Math.round((comoNumero(hasta) - comoNumero(desde)) / 86400000);
}

export function sumarDias(iso, cuantos) {
  const fecha = new Date(comoNumero(iso) + cuantos * 86400000);
  return FORMATO_ISO.format(new Date(Date.UTC(
    fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate(), 12,
  )));
}

export function diaDeLaSemana(iso) {
  const { anio, mes, dia } = partes(iso);
  return DIAS[new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay()];
}

export function nombreDelMes(iso) {
  return MESES[partes(iso).mes - 1];
}

// "lunes 26 de octubre" y, si es de otro año, "lunes 26 de octubre de 2025".
export function enPalabras(iso, { conAnio = 'auto' } = {}) {
  const { anio, dia } = partes(iso);
  const mostrarAnio = conAnio === true || (conAnio === 'auto' && anio !== partes(hoy()).anio);
  return `${diaDeLaSemana(iso)} ${dia} de ${nombreDelMes(iso)}${mostrarAnio ? ` de ${anio}` : ''}`;
}

export function enPalabrasCorto(iso) {
  const { dia } = partes(iso);
  return `${dia} de ${nombreDelMes(iso)}`;
}

// "Hoy", "Ayer" o la fecha escrita.
export function comoTitulo(iso) {
  const diferencia = diasEntre(iso, hoy());
  if (diferencia === 0) return 'Hoy';
  if (diferencia === 1) return 'Ayer';
  return enPalabras(iso);
}

// Para "Un día como hoy": mismo día y mes, cualquier año anterior.
export function mismoDiaYMes(iso, otroIso) {
  const a = partes(iso);
  const b = partes(otroIso);
  return a.dia === b.dia && a.mes === b.mes;
}

// Cuántos años/meses/días faltan hasta la próxima vez que caiga ese día y mes.
export function proximaVez(isoFecha, desdeIso = hoy()) {
  const objetivo = partes(isoFecha);
  const desde = partes(desdeIso);
  let anio = desde.anio;
  const esteAnio = Date.UTC(anio, objetivo.mes - 1, objetivo.dia);
  if (esteAnio < comoNumero(desdeIso)) anio += 1;
  const proximo = `${anio}-${String(objetivo.mes).padStart(2, '0')}-${String(objetivo.dia).padStart(2, '0')}`;
  return { fecha: proximo, faltan: diasEntre(desdeIso, proximo) };
}

export function esFechaValida(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return false;
  const { anio, mes, dia } = partes(iso);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return false;
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}

// "1 día" / "23 días" / "1 año y 2 meses", para los contadores.
export function enDias(cantidad) {
  return `${cantidad} ${cantidad === 1 ? 'día' : 'días'}`;
}
