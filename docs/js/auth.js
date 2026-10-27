// Acceso: contraseña de la cuenta (una vez por celular) y PIN de 4 dígitos
// como candado rápido de cada apertura.
//
// El PIN no viaja a ningún lado ni está en el código: se guarda hasheado con
// SHA-256 y una sal al azar, en el almacenamiento de ESTE celular. Protege
// contra alguien que agarre el teléfono desbloqueado, que es para lo que sirve.

import {
  auth, sesionLista, signInWithEmailAndPassword, signOut,
  updatePassword, reauthenticateWithCredential, EmailAuthProvider,
} from './firebase.js';
import { PERFILES, estado } from './estado.js';
import { escapar, claseTema } from './ui.js';

const ERRORES = {
  'auth/invalid-credential': 'La contraseña no coincide.',
  'auth/user-not-found': 'No existe esa cuenta.',
  'auth/wrong-password': 'La contraseña no coincide.',
  'auth/invalid-email': 'El correo de la cuenta está mal escrito.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
  'auth/network-request-failed': 'Sin conexión. Revisa tu internet.',
  'auth/operation-not-allowed': 'El acceso por contraseña está apagado en Firebase.',
  'auth/weak-password': 'La contraseña nueva necesita al menos 6 caracteres.',
};

export function mensajeDeError(error) {
  const codigo = error?.code || String(error?.message || error);
  return ERRORES[codigo] || `No se pudo (${codigo}).`;
}

export async function entrarConClave(perfilId, clave) {
  await sesionLista;
  const perfil = PERFILES[perfilId];
  await signInWithEmailAndPassword(auth, perfil.correo, clave);
}

export function salir() {
  return signOut(auth);
}

export async function cambiarClave(claveActual, claveNueva) {
  const usuario = auth.currentUser;
  const credencial = EmailAuthProvider.credential(usuario.email, claveActual);
  await reauthenticateWithCredential(usuario, credencial);
  await updatePassword(usuario, claveNueva);
}

// ---------- PIN ----------

const llavePin = (perfil) => `ositos.pin.${perfil}`;

function alAzar() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashear(pin, sal) {
  const datos = new TextEncoder().encode(`${sal}:${pin}`);
  const resumen = await crypto.subtle.digest('SHA-256', datos);
  return [...new Uint8Array(resumen)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function tienePin(perfil) {
  try {
    return Boolean(localStorage.getItem(llavePin(perfil)));
  } catch (e) {
    return false;
  }
}

export async function guardarPin(perfil, pin) {
  const sal = alAzar();
  const hash = await hashear(pin, sal);
  try {
    localStorage.setItem(llavePin(perfil), JSON.stringify({ sal, hash }));
  } catch (e) {
    // Modo privado de Safari puede no dejar guardar: se sigue sin candado.
  }
}

export async function verificarPin(perfil, pin) {
  try {
    const guardado = JSON.parse(localStorage.getItem(llavePin(perfil)) || 'null');
    if (!guardado) return false;
    return (await hashear(pin, guardado.sal)) === guardado.hash;
  } catch (e) {
    return false;
  }
}

export function borrarPin(perfil) {
  try {
    localStorage.removeItem(llavePin(perfil));
  } catch (e) {
    // sin nada que hacer
  }
}

// Si alguien dijo "ahora no", no hay que volver a insistirle en cada apertura.
const llaveSinPin = (perfil) => `ositos.sinPin.${perfil}`;

export function prefiereSinPin(perfil) {
  try {
    return localStorage.getItem(llaveSinPin(perfil)) === '1';
  } catch (e) {
    return false;
  }
}

export function recordarSinPin(perfil, sinPin) {
  try {
    if (sinPin) localStorage.setItem(llaveSinPin(perfil), '1');
    else localStorage.removeItem(llaveSinPin(perfil));
  } catch (e) {
    // sin nada que hacer
  }
}

// ---------- Pantallas ----------

export function dibujarPerfiles() {
  const tarjetas = Object.values(PERFILES).map((p) => `
    <button class="profile-card ${claseTema(p.tema)}" data-accion="elegir-perfil" data-id="${p.id}">
      <div class="profile-avatar">${p.emoji}</div>
      <div>
        <div class="profile-name">${escapar(p.nombre)}</div>
        <div class="profile-hint">Toca para entrar</div>
      </div>
    </button>`).join('');

  return `<div class="screen-login">
    <div class="login-title">Nuestro<br/><span class="accent">Ositos</span> 🐻‍❄️🐻</div>
    <div class="login-subtitle">¿Quién eres?</div>
    <div class="profile-cards">${tarjetas}</div>
  </div>`;
}

export function dibujarClave() {
  const p = PERFILES[estado.perfilElegido];
  return `<div class="screen-pin">
    <button class="pin-back" data-accion="volver-perfiles">‹ Volver</button>
    <div class="pin-avatar ${claseTema(p.tema)}">${p.emoji}</div>
    <div class="pin-greeting">Hola, ${escapar(p.nombre)}</div>
    <div class="pin-instruction">Escribe tu contraseña. Solo esta vez en este celular.</div>
    <form class="clave-form" id="form-clave">
      <input type="password" id="campo-clave" class="clave-input" autocomplete="current-password"
             autocapitalize="none" autocorrect="off" spellcheck="false"
             placeholder="Tu contraseña" ${estado.entrando ? 'disabled' : ''} />
      <button class="ver-clave" type="button" data-accion="ver-clave">👁 Ver la contraseña</button>
      <div class="error-text">${escapar(estado.errorAcceso)}</div>
      <button type="submit" class="btn btn-primary" ${estado.entrando ? 'disabled' : ''}>
        ${estado.entrando ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  </div>`;
}

export function dibujarPuntos() {
  return [0, 1, 2, 3].map((i) => {
    const lleno = i < estado.pinBuffer.length;
    const clase = estado.pinError ? 'error' : (lleno ? 'filled' : '');
    return `<div class="pin-dot ${clase}"></div>`;
  }).join('');
}

export function dibujarPin(modo) {
  const p = PERFILES[estado.sesion];
  const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'borrar'];
  const teclado = teclas.map((t) => {
    if (t === '') return '<div></div>';
    if (t === 'borrar') return '<button class="pin-key ghost" aria-label="Borrar el último número" data-accion="pin-borrar">⌫</button>';
    return `<button class="pin-key" data-accion="pin-digito" data-digito="${t}">${t}</button>`;
  }).join('');

  const creando = modo === 'crear';
  const confirmando = creando && estado.pinConfirmando;
  const titulo = creando
    ? (confirmando ? 'Repítelo para confirmar' : 'Elige un PIN de 4 dígitos')
    : 'Escribe tu PIN';
  const bajada = creando
    ? 'Te lo va a pedir cada vez que abras la app. Se guarda solo en este celular.'
    : `Hola de nuevo, ${escapar(p.nombre)}`;

  const pie = creando
    ? '<button class="pin-salida" data-accion="saltar-pin">Ahora no, entrar sin PIN</button>'
    : '<button class="pin-salida" data-accion="olvide-pin">Olvidé mi PIN · Salir</button>';

  return `<div class="screen-pin">
    <div class="pin-avatar ${claseTema(p.tema)}">${p.emoji}</div>
    <div class="pin-greeting">${titulo}</div>
    <div class="pin-instruction">${bajada}</div>
    <div class="pin-dots">${dibujarPuntos()}</div>
    <div class="error-text">${escapar(estado.errorAcceso)}</div>
    <div class="pin-keypad">${teclado}</div>
    ${pie}
  </div>`;
}
