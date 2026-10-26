# Plan de Ositos

Estado de cada fase, para que cualquier sesión siga el hilo.
Leer también `CLAUDE.md` (reglas fijas del proyecto).

Leyenda: ⬜ pendiente · 🟡 en curso · ✅ hecho

---

## Fase 0 — Privacidad y base 🟡

Objetivo: que el diario sea de verdad privado antes de que haya fotos y textos
íntimos adentro.

| | Tarea | Quién |
|---|---|---|
| ✅ | `CLAUDE.md`, `PLAN.md`, `firestore.rules` | Claude |
| ✅ | Limpiar archivos de la versión vieja (Supabase/Render) | Claude |
| ✅ | Crear proyecto Firebase `ositos-e6e10` (Spark), Firestore (southamerica-east1) y Authentication por correo | Juan |
| ✅ | Crear las 2 cuentas: `lentina@ositos.local` y `manuelito@ositos.local` | Juan |
| ✅ | Reglas probadas con el emulador (41 pruebas en verde) | Claude |
| 🟡 | Pegar las reglas en la consola | Juan |
| 🟡 | Arreglar el acceso de Manuelito con `docs/cuenta.html` | Juan |
| ❌ | ~~Migrar los datos viejos~~ — **cancelada por decisión de Juan.** El diario arranca vacío. Los datos siguen intactos en `elita---ejercicios` por si algún día se quieren recuperar | — |
| ⬜ | Reorganizar el código en `docs/js/` | Claude |
| ⬜ | Login real con Firebase Auth, recordado en cada celular; PIN local como candado rápido (hasheado, nunca en el código) | Claude |
| ⬜ | Botón "Cambiar contraseña" en Ajustes (evita tener que recrear la cuenta) | Claude |
| ⬜ | README nuevo sin PIN, con qué es y cómo instalarlo en el iPhone | Claude |
| ⬜ | Borrar `docs/cuenta.html` cuando el acceso funcione | Claude |

**Por qué un proyecto nuevo:** en Firestore las reglas se combinan con OR, así que
la regla abierta que necesita la app "Elita – Mis Ejercicios" dejaría abierto
también el diario si compartieran proyecto.

**Por qué la identidad es el correo y no el UID:** el UID cambia cada vez que se
vuelve a crear una cuenta, y la consola de Firebase no permite cambiar una
contraseña a mano cuando el correo es inventado (el "restablecer" manda un mail
que no llega a ningún lado). Durante la Fase 0 eso obligó a recrear la cuenta de
Manuelito tres veces, y cada vez había que reescribir y volver a pegar las
reglas. Con el correo como identidad eso ya no pasa, y además las entradas
viejas no quedan huérfanas: los documentos guardan `autor` con el perfil
(`'lentina'` / `'manolo'`), nunca el UID.

---

## Fase 1 — El diario ⬜

- **Inicio "Nosotros"**: "Llevamos X días juntos", cuenta regresiva a la próxima
  fecha especial, "Un día como hoy…", la pregunta del día, lo último que escribió
  cada uno y un botón grande para escribir.
- **Diario**: línea de tiempo por fecha. Autor (con su color), fecha editable,
  texto, hasta 6 fotos, ánimo opcional, etiquetas, lugar opcional. El otro
  reacciona con emojis y comenta. Borradores privados. Búsqueda y filtros por
  autor, etiqueta y mes. Vista calendario con puntitos. Carga por páginas.
  **No es un chat.**
- **Pregunta del día**: banco de 150+ preguntas en español (estilo "mapas del
  amor" de Gottman y las 36 preguntas de Aron). Cada uno responde por separado y
  la respuesta del otro aparece recién cuando los dos respondieron — esto lo
  imponen las reglas de Firestore, no solo la pantalla. Historial.
- **Gracias del día**: una línea opcional "Hoy te agradezco…".
- **Ajustes**: fecha de inicio, fechas especiales, apodos, emoji y color de cada
  perfil, espacio usado del 1 GiB.
- **Instalable en el iPhone**: manifest, íconos 180/192/512, theme-color, safe
  areas y una pantalla que explique "Compartir → Agregar a inicio".
- **Fotos sin Cloud Storage**: comprimidas en el celular (miniatura ~400 px y foto
  ~1280 px), cada una en su propio documento (máx. 1 MiB), cargadas solo cuando se
  necesitan, nunca dentro del documento de la entrada. Contemplar HEIC del iPhone
  y la orientación EXIF.

---

## Fase 2 — Recuerdos ⬜

- Álbum en grilla y visor a pantalla completa con zoom de dos dedos (hoy el zoom
  está bloqueado en todo el sitio: habrá que habilitarlo solo ahí) y deslizar.
- Fechas especiales con cuenta regresiva y celebraciones (100, 365, 500, 1000
  días) con confeti discreto.
- Cartas "Ábrela cuando…", por fecha o por motivo; el autor ve cuándo se abrió.
- Frasco de recuerdos: un recuerdo al azar.
- Mapa de nuestros lugares (Leaflet + OpenStreetMap con atribución).

---

## Fase 3 — Planes y juego ⬜

- Planes juntos; al marcar uno como hecho, ofrecer crear el recuerdo.
- **Deseos**: la wishlist actual (Regalos, Comida, Gustos) con el diseño nuevo y
  todas sus funciones.
  - *Pendiente de diseño:* hoy `reserved`/`reservedBy` viven dentro del deseo, así
    que el dueño podría ver la reserva si mira los datos crudos. Mover las
    reservas a una colección aparte que solo lea quien reserva.
- Nuestras canciones (links o embeds de Spotify con su historia).
- Resumen anual tipo "Wrapped".

---

## Fase 4 — Pulido ⬜

- Funcionar sin internet: service worker con versión y aviso de "hay una versión
  nueva" (Safari cachea de forma agresiva).
- Botón "Descargar respaldo" (.zip con todo, fotos incluidas).
- Modo oscuro.
- Notas de voz cortas (máx. 60 s, cada una en su propio documento).
- Notificaciones: **no todavía.** Explicar las opciones gratis y esperar decisión.
