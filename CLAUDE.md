# Ositos — reglas del proyecto

Diario compartido y privado de Lentina (🐻‍❄️) y Manuelito (🐻). Era una lista de
deseos; ahora los deseos son una sección más.

## Dónde vive

- **Rama publicada: `claude/couple-wishlist-mobile-kzdmxl`**, carpeta **`/docs`**.
  GitHub Pages sirve desde ahí → https://wzkjcmyms6-lgtm.github.io/WishList/
  Todo cambio tiene que terminar en esa rama. La rama por defecto (`Elita`) solo
  tiene un README y no se publica. No renombrar el repo: cambiaría el link.
- El repo es **público** (requisito de GitHub Pages gratis). La privacidad la dan
  Firebase Auth + las reglas de Firestore, nunca esconder el código. La `apiKey`
  web de Firebase no es un secreto; los UID tampoco.

## Stack

- HTML + CSS + JavaScript vanilla. **Sin build, sin frameworks, sin bundler.**
  Módulos ES nativos (`<script type="module">`), un archivo por sección en
  `docs/js/`.
- Firebase **12.18.0** importado desde `https://www.gstatic.com/firebasejs/...`.
- **Plan Spark (gratis, sin tarjeta).** Prohibido todo lo que exija Blaze:
  Cloud Storage, Cloud Functions. Las fotos van comprimidas en Firestore.
- Cache-busting: subir `?v=N` en `docs/index.html` en cada publicación.

## Datos

- Proyecto Firebase propio del diario (creado en la Fase 0). **El proyecto viejo
  `elita---ejercicios` y los datos de la app "Elita – Mis Ejercicios" no se tocan
  jamás.**
- Cero pérdida de datos: nada se borra sin pedir permiso.

## Estilo

- Español de Bolivia, **tuteo** ("pon", "revisa"), nunca "poné/revisá". Montos en Bs.
- Fechas y "hoy" en hora de Bolivia (`America/La_Paz`). **No usar `toISOString()`**
  para sacar el día: cambia de fecha a las 20:00 locales. Usar el helper de
  `docs/js/fechas.js`.
- Mobile-first (iPhone), ancho máximo 460 px.
- Paleta: crema `#FBF3E7`; Lentina rosa `#F4A6C6` / `#C24B7C`; Manuelito verde agua
  `#9FD8D0` / `#2F7A73`; tinta `#1F1B16`. Títulos en Poppins.
- Bordes muy redondeados, hojas inferiores que se arrastran, animaciones suaves
  que respetan `prefers-reduced-motion`.
- Accesibilidad: botones ≥ 44 px, inputs de 16 px (si no, el iPhone hace zoom),
  buen contraste.
- Escribir una entrada debe tomar menos de 30 segundos y solo el texto es
  obligatorio.

## Antes de publicar

Servir `docs/` localmente, revisar que no haya errores en consola y sacar capturas
a 390×844. Commits en español, claros.
