# Nuestra Wishlist 💫

Sitio web mobile-first para que dos personas (Lentina y Manuelito) lleven cada
una su propia lista de deseos y puedan reservar en secreto los regalos que
le van a hacer a la otra persona.

## Perfiles

| Perfil    | Clave |
|-----------|-------|
| Lentina   | 3103  |
| Manuelito | 0701  |

## Cómo funciona

- Cada quien entra con su perfil y su clave de 4 dígitos.
- **Mi lista**: agregás, editás y borrás tus propios deseos (título,
  descripción, precio, link de la tienda e imagen).
- **La lista de tu pareja**: la ves completa y podés tocar "Yo lo regalo"
  para reservar un ítem. Esa reserva queda oculta para el dueño de la
  lista, así la sorpresa se mantiene.

## Configurar la base de datos (Supabase, gratis)

Los deseos y las fotos se guardan en [Supabase](https://supabase.com) (base de
datos + almacenamiento de imágenes) en vez de en un archivo local, para que
nada se borre cuando la app se reinicia o "duerme" en el hosting gratis.

1. Creá una cuenta gratis en [supabase.com](https://supabase.com) (no pide
   tarjeta) y un proyecto nuevo.
2. Andá a **SQL Editor** → *New query*, pegá el contenido de
   [`supabase/schema.sql`](supabase/schema.sql) y ejecutalo. Esto crea la
   tabla de deseos y el bucket público `wishlist-images` para las fotos.
3. Andá a **Project Settings → API** y copiá:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** (no la `anon` key) → `SUPABASE_SERVICE_KEY`
4. Copiá `.env.example` a `.env` y pegá esos dos valores:
   ```bash
   cp .env.example .env
   ```

La `service_role key` da acceso total a tu proyecto: nunca la subas al
repositorio ni la muestres en el frontend (por eso está en `.env`, que
`.gitignore` ya excluye).

## Cómo correrlo

```bash
npm install
npm start
```

Luego abrí `http://localhost:3000` desde el celular (o desde el navegador
en modo responsive) en la misma red.

## Cómo publicarla gratis (Render)

1. Subí este repo a GitHub (si no lo está ya) y conectalo en
   [render.com](https://render.com) como un **Web Service** nuevo, plan
   **Free**.
2. Build command: `npm install` — Start command: `npm start`.
3. En **Environment**, agregá las variables `SUPABASE_URL` y
   `SUPABASE_SERVICE_KEY` con los mismos valores de tu `.env`.
4. Deploy. Te da una URL gratis tipo `https://tu-app.onrender.com` (sin
   pagar dominio). El plan free "duerme" tras 15 min sin uso y tarda unos
   segundos en despertar la próxima vez que alguien entra, pero como los
   datos ahora viven en Supabase, nunca se pierden.
