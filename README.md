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

## Cómo correrlo

```bash
npm install
npm start
```

Luego abrí `http://localhost:3000` desde el celular (o desde el navegador
en modo responsive) en la misma red.

Los datos se guardan en `data/db.json`.
