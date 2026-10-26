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
| ✅ | Pegar las reglas en la consola | Juan |
| ✅ | Arreglar el acceso de Manuelito con `docs/cuenta.html` | Juan |
| ❌ | ~~Migrar los datos viejos~~ — **cancelada por decisión de Juan.** El diario arranca vacío. Los datos siguen intactos en `elita---ejercicios` por si algún día se quieren recuperar | — |
| ✅ | Reorganizar el código en `docs/js/` (`firebase`, `estado`, `ui`, `auth`, `datos` y una sección por pantalla) | Claude |
| ✅ | Login real con Firebase Auth, recordado en cada celular; PIN local como candado rápido (SHA-256 con sal, solo en ese celular) | Claude |
| ✅ | Botón "Cambiar contraseña" en Ajustes (evita tener que recrear la cuenta) | Claude |
| ✅ | README nuevo sin PIN, con qué es y cómo instalarlo en el iPhone | Claude |
| 🟡 | Probar en el iPhone | Juan |
| ⬜ | Borrar `docs/cuenta.html` cuando Juan confirme que la app entra bien | Claude |

**Pruebas automáticas de la Fase 0:** 41 casos de las reglas contra el emulador
de Firestore, y 29 casos de la app entera en un navegador real a 390×844
(entrar, PIN, crear deseos, reservar, comida, ajustes, recargar y cambiar de
persona) con un Firebase simulado, porque el entorno de Claude tiene bloqueado
`gstatic.com` y no puede hablar con el Firebase real.

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

## Fase 1 — El diario ✅

**Primera entrega (hecha):** línea de tiempo agrupada por fecha con autor,
ánimo, etiquetas, lugar y hasta 6 fotos; fecha editable para cargar recuerdos
viejos; borradores que solo ve su autor (en su propia colección `drafts`, porque
mezclados en `entries` harían que Firestore rechazara la consulta entera);
reacciones con emoji; búsqueda y filtros por autor y etiqueta; carga por
páginas de 15; pantalla de Inicio con los días juntos, la próxima fecha
especial, "Un día como hoy…" y lo último que escribió cada uno; fecha de inicio
y fechas especiales en Ajustes; navegación nueva (Inicio · Diario · Deseos ·
Ajustes). Fotos comprimidas en el celular en dos tamaños (miniatura de 400 px
dentro de `photos`, grande de 1280 px aparte en `photo_files`), y la miniatura
se pide recién cuando la tarjeta está en pantalla.

**Segunda entrega (hecha):** pregunta del día con un banco de 155 preguntas
(la del día sale de la fecha, así los dos ven la misma y no se repite hasta
terminar la vuelta); cada uno responde por su lado y la del otro se destraba
recién cuando respondes la tuya, impuesto por las reglas del servidor y no por
la pantalla; historial de respuestas; gracias del día; comentarios en cada
recuerdo; vista calendario con puntitos en los días con recuerdos; apodos y
espacio usado en Ajustes; manifest, íconos de 180/192/512 y las instrucciones
para agregarla a la pantalla de inicio del iPhone.

**Detalle técnico del destrabe:** las respuestas van en un documento por
persona y día (`answers/AAAA-MM-DD_perfil`) y la del otro se pide de a una con
`getDoc`, aceptando el "no" cuando todavía no corresponde. Una consulta de
todas fallaría entera, porque Firestore evalúa las reglas contra cada
documento que devolvería.



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

## Fase 2 — Recuerdos 🟡

| | Tarea |
|---|---|
| ✅ | Álbum en grilla y visor a pantalla completa con zoom de dos dedos y deslizar |
| ✅ | Celebraciones de los hitos (50, 100, 365, 1000…) con confeti discreto |
| ✅ | Cartas "ábrela cuando…", por fecha o por motivo, con acuse de lectura |
| ✅ | Frasco de recuerdos |
| ⬜ | Mapa de nuestros lugares (Leaflet + OpenStreetMap) |

**Cómo se guarda el secreto de las cartas:** el sobre (autor, título y cuándo
se abre) va en `letters` y se ve siempre; el texto va aparte en `letter_bodies`
y la regla lo compara con `request.time`, así que antes de la fecha el servidor
lo niega. No es la pantalla la que lo esconde.

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
