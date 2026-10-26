# Ositos 🐻‍❄️🐻

Diario compartido y privado de Lentina y Manuelito. Empezó como una lista de
deseos; ahora los deseos son una sección más.

**Sitio:** https://wzkjcmyms6-lgtm.github.io/WishList/

## Qué tiene

- **Deseos** — cada quien arma su lista (título, descripción, precio en Bs, link
  de la tienda y foto). En la lista de la otra persona se puede tocar
  "Yo lo regalo" para reservar un regalo; lo reservado baja al final.
- **Comida** — las comidas favoritas de cada uno, con restaurante y notas.
- **Gustos** — la chuleta de regalos de Manuelito sobre Lentina. Las reglas del
  servidor hacen que ella no pueda abrirla ni queriendo.
- **Ajustes** — cambiar la contraseña, poner o quitar el candado de PIN y salir.

El diario, las fotos, la pregunta del día y lo demás llegan en las fases
siguientes: ver [`PLAN.md`](PLAN.md).

## Cómo se entra

1. Eliges tu osito.
2. Escribes tu contraseña **una sola vez por celular**. Después queda recordada.
3. Cada vez que abres la app te pide un **PIN de 4 dígitos** que eliges tú. El
   PIN se guarda cifrado en ese celular, nunca viaja a internet ni está escrito
   en el código.

¿Olvidaste la contraseña? Cámbiala desde **Ajustes → Cambiar la contraseña**
estando con la sesión abierta. No hay que borrar la cuenta ni tocar la consola.

## Instalarlo en el iPhone

Para que se vea como una app de verdad, sin la barra de Safari:

1. Abre el sitio en **Safari** (no sirve desde Chrome en iPhone).
2. Toca el botón **Compartir** (el cuadrito con la flecha hacia arriba).
3. Desliza y elige **"Agregar a inicio"**.
4. Confirma. Te queda el ícono en la pantalla de inicio.

## Privacidad

El repositorio es público porque GitHub Pages gratis lo exige, pero los datos no
lo son: para leer o escribir cualquier cosa hay que iniciar sesión con una de
las dos cuentas, y las reglas de [`firestore.rules`](firestore.rules) definen
exactamente quién puede ver y tocar qué.

La configuración de Firebase que está en el código (`apiKey` y compañía) **no es
un secreto**: va dentro de toda app web de Firebase y sirve nada más para saber
a qué proyecto conectarse. Lo que protege los datos son las reglas.

En este repositorio no hay ninguna contraseña ni ningún PIN.

## Para quien toque el código

- Sitio estático en [`docs/`](docs/): HTML, CSS y JavaScript vanilla con módulos
  ES nativos. **Sin build, sin frameworks, sin dependencias que instalar.**
- Firebase 12.18.0 desde `gstatic`, plan Spark (gratis).
- Las reglas de Firestore se prueban con el emulador:

  ```bash
  npm install firebase-tools firebase @firebase/rules-unit-testing
  npx firebase emulators:exec --only firestore --project demo-ositos "node test-reglas.mjs"
  ```

- Las reglas fijas del proyecto están en [`CLAUDE.md`](CLAUDE.md) y el estado de
  cada fase en [`PLAN.md`](PLAN.md).
