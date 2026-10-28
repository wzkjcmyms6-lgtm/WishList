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

## Fase 2 — Recuerdos ✅

| | Tarea |
|---|---|
| ✅ | Álbum en grilla y visor a pantalla completa con zoom de dos dedos y deslizar |
| ✅ | Celebraciones de los hitos (50, 100, 365, 1000…) con confeti discreto |
| ✅ | Cartas "ábrela cuando…", por fecha o por motivo, con acuse de lectura |
| ✅ | Frasco de recuerdos |
| ✅ | Mapa de nuestros lugares (Leaflet + OpenStreetMap, con atribución) |

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

## Recetas ✅

Lo que queremos cocinar, con ingredientes, pasos, link y foto. Cada receta
puede marcarse como "se puede cocinar en videollamada", porque pasan buena
parte del tiempo a distancia y esas son las que sirven igual estando lejos. Al
marcarla como cocinada ofrece escribir el recuerdo, igual que los planes.

## Fase 3 — Planes y juego ✅

| | Tarea |
|---|---|
| ✅ | Planes juntos; al tacharlos ofrece escribir el recuerdo |
| ✅ | Deseos integrados, con la reserva de verdad secreta |
| ✅ | Nuestras canciones, con reproductor de Spotify |
| ✅ | Resumen del año tipo "Wrapped" |


- Planes juntos; al marcar uno como hecho, ofrecer crear el recuerdo.
- **Deseos**: la wishlist actual (Regalos, Comida, Gustos) con el diseño nuevo y
  todas sus funciones.
  - *Resuelto:* las reservas se mudaron a la colección `reservations`, con un
    documento por deseo que solo lee quien reservó. El dueño de la lista ya no
    puede enterarse ni mirando los datos crudos.
- Nuestras canciones (links o embeds de Spotify con su historia).
- Resumen anual tipo "Wrapped".

---

## Fase 4 — Pulido 🟡

| | Tarea |
|---|---|
| ✅ | Funciona sin internet (service worker con versión y aviso de versión nueva) |
| ✅ | Botón "Descargar respaldo" (.zip con el diario, los datos y las fotos) |
| ✅ | Modo oscuro (claro, oscuro o el del celular; se elige en cada aparato) |
| ✅ | Planes marcados como "juntos" o "a distancia", con ideas para cuando están lejos |
| ✅ | Notas de voz de hasta 60 s, cada una en su propio documento |
| 🟡 | Notificaciones: explicadas las tres opciones gratis, esperando decisión de Juan |


- Funcionar sin internet: service worker con versión y aviso de "hay una versión
  nueva" (Safari cachea de forma agresiva).
- Botón "Descargar respaldo" (.zip con todo, fotos incluidas).
- Modo oscuro.
- Notas de voz cortas (máx. 60 s, cada una en su propio documento).
- Notificaciones: **no todavía.** Explicar las opciones gratis y esperar decisión.

---

## Revisión de uso (UX/UI) ✅

Auditoría medida en un navegador real a 390 y 320 px, no a ojo: áreas táctiles,
contraste calculado contra el fondo real, desbordes, tamaño de letra en los
campos y nombres para lectores de pantalla. Salieron **69 problemas**; quedaron
**0** (los 3 que faltan son texto sobre degradados, que no se puede medir con
una fórmula y se revisó en las capturas).

**Lo que se arregló**

| Qué pasaba | Qué se hizo |
|---|---|
| El texto gris (`--muted`) quedaba en 3.1–3.9 de contraste; el mínimo legible es 4.5 | `--muted` más oscuro en claro y más claro en oscuro; tokens nuevos `--rosa-texto`, `--verde-texto` y `--danger-texto` solo para letra chica (la paleta de marca sigue igual en los rellenos) |
| Fichas de filtro de 30 px, reacciones de 38, pestañas de 37, "Comentar" de 36 | Todo a 44 px o más |
| El buscador tenía letra de 14,5 px: el iPhone hacía zoom al tocarlo, y a 320 px se salía de la pantalla | Letra de 16 px, alto de 44 y `min-width: 0` |
| Al tocar un emoji o una etiqueta mientras escribías, se perdía el cursor | Se recuerda el campo y la posición del cursor en cada redibujado |
| El scroll saltaba al principio de la lista en cada cambio | Se guarda y se devuelve la posición (y al cambiar de sección sí empieza arriba) |
| La nota de voz se cortaba y el reproductor de Spotify se reiniciaba con cualquier cambio en pantalla | Esos nodos se mudan tal cual al redibujar (`data-persistente`) — probado con audio real: sigue en el mismo segundo |
| Mostrar y esconder el aviso ("¡Guardado!") redibujaba toda la app dos veces | El aviso vive fuera de `#app`, en su propio nodo |
| "Atrás" (o el gesto del iPhone) salía de la app aunque hubiera una hoja abierta | Una marca en el historial: atrás cierra la hoja, sale del álbum o vuelve a Inicio |
| Dos toques seguidos en "Guardar" creaban dos recuerdos iguales | Un candado en los formularios, con suelta de emergencia |
| Tocar fuera de la hoja tiraba lo escrito sin avisar | Pregunta "¿Cierras sin guardar lo que escribiste?" |
| Mientras llegaban los datos decía "todavía no hay nada", como si se hubiera borrado el diario | Tarjetas grises y "Trayendo lo nuestro…" |
| Dentro del panel nada avisaba que no había internet | Aviso: lo que escribas se guarda y se sube cuando vuelva |
| Al abrir la hoja había que tocar el campo para empezar | El teclado aparece solo (la regla de los 30 segundos) |
| Botones de solo ícono sin nombre para VoiceOver; sin foco visible para teclado | 18 `aria-label`, `aria-pressed` en reacciones y ánimos, y anillo de foco |
| El zoom del navegador estaba bloqueado en toda la app | Se permite agrandar; el pellizco solo se intercepta dentro del visor de fotos |
| El aviso de versión nueva tapaba el botón +; el toast no respetaba el área segura del iPhone | Aviso arriba y medidas con `env(safe-area-inset-*)` |

**Pruebas:** 11 suites en un navegador real (190 comprobaciones) más la
auditoría automática. La suite nueva `probar-ux.js` cubre el scroll, el foco,
el "atrás", el doble toque y el no perder lo escrito.

**Corregido después, con un video del iPhone de Manuelito:** la hoja de
escribir no se podía bajar ni cerrar arrastrándola, y el botón "Guardar"
quedaba fuera de la pantalla.

- "Cancelar" y "Guardar" ahora quedan pegados abajo de la hoja, siempre a la
  vista, sin tener que bajar nada.
- El gesto de arrastrar la hoja hacia abajo para cerrarla funciona desde
  cualquier parte de la hoja (antes solo desde el tirador de 40 px de arriba) y
  con un recorrido razonable (antes había que bajarla el 60 % de su alto, o sea
  casi media pantalla, así que parecía que no se podía).
- Solo se cierra si la hoja está arriba de todo y el dedo va claramente hacia
  abajo; si está a medio bajar, el gesto sigue siendo deslizar.
- **Se volvió a bloquear el zoom del navegador.** Haberlo liberado (por
  accesibilidad) hizo que en el iPhone la página terminara agrandada y corrida,
  con la hoja a medio salir de la pantalla. Primero que funcione.

Esto no se pudo reproducir acá: el entorno solo tiene Chromium, donde la hoja
siempre se deslizó bien. Hay que probarlo en el iPhone.

**Corregido después, con una captura de Manuelito:** de noche, lo que se
escribía en los campos era casi invisible.

Los campos (contraseña, fecha de inicio, nombre de una fecha especial, texto
del recuerdo, respuesta de la pregunta, comentario, subir foto) tenían el fondo
blanco escrito a mano mientras la letra usaba el color del tema. De día eso
funcionaba de casualidad; de noche quedaba letra clara sobre blanco: contraste
1.15, cuando el mínimo legible es 4.5. Ahora todos usan `var(--card)`, que es
blanco de día y gris oscuro de noche. También se declara `color-scheme`, así el
selector de fecha y el cursor del iPhone se pintan oscuros.

**Por qué no lo había agarrado la auditoría:** medía el contraste del texto de
cada elemento, y un campo no tiene texto — tiene valor. Ahora mide el valor (o
el marcador de posición) y revisa de noche también las pantallas donde se
escribe. Comprobado volviendo a meter el error a propósito: lo marca.

**Corregido después, con otra captura:** en Deseos se podía guardar el mismo
producto varias veces.

Al tocar "Guardar", la hoja se quedaba abierta hasta que el servidor
confirmaba. Firestore guarda primero en el celular y avisa a la pantalla al
instante (por eso el deseo ya aparecía en la lista), pero la promesa recién se
cumple cuando contesta el servidor. En ese rato: la pantalla se redibujaba, el
candado contra el doble toque se soltaba —porque se soltaba en cada
dibujado— y la hoja seguía ahí, así que un segundo toque creaba el deseo otra
vez. Con el internet lento eso son varios segundos.

- **Las hojas se cierran al toque de guardar**, sin esperar al servidor: el
  dato ya está en el celular. Si la confirmación falla de verdad, la hoja
  vuelve con todo lo escrito y lo dice.
- **El candado lo suelta la tarea que guarda**, no el dibujado. Así protege
  también a los formularios que no cierran ninguna hoja: comentarios, gracias,
  respuesta de la pregunta, apodos y "Agregar fecha".
- El Firebase simulado de las pruebas ahora **demora en confirmar**, como el de
  verdad. Con todo instantáneo, ninguna prueba podía ver ese rato, que es justo
  donde estaba el error.

Se reprodujo primero (tres toques = tres deseos idénticos, con foto, igual que
en la captura) y después se arregló.

**Queda anotado, no es una falla:** "Comida" (lo que les gusta comer) y
"Recetas" (lo que quieren cocinar) se parecen de nombre. Si alguna vez
confunden, conviene renombrar una de las dos.
