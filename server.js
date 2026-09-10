const express = require('express');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error(
    'Faltan las variables de entorno SUPABASE_URL y/o SUPABASE_SERVICE_KEY. ' +
      'Revisá el README para configurarlas (localmente en un archivo .env, o en el panel de tu hosting).'
  );
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const IMAGES_BUCKET = 'wishlist-images';

const PROFILES = {
  lentina: { id: 'lentina', name: 'Lentina', pin: '3103', emoji: '🐻‍❄️', theme: 'pink' },
  manolo: { id: 'manolo', name: 'Manuelito', pin: '0701', emoji: '🐻', theme: 'blue' },
};

const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES[file.mimetype]) {
      return cb(new Error('Formato de imagen no soportado'));
    }
    cb(null, true);
  },
});

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function publicProfile(profile) {
  return { id: profile.id, name: profile.name, emoji: profile.emoji, theme: profile.theme };
}

function isValidProfileId(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(PROFILES, id);
}

function toItemView(row, hideReservation) {
  const item = {
    id: row.id,
    owner: row.owner,
    title: row.title,
    description: row.description || '',
    url: row.url || '',
    price: row.price || '',
    image: row.image || '',
    createdAt: new Date(row.created_at).getTime(),
  };
  if (!hideReservation) {
    item.reserved = row.reserved;
    item.reservedBy = row.reserved_by;
  }
  return item;
}

// List profiles (no PINs exposed)
app.get('/api/profiles', (req, res) => {
  res.json(Object.values(PROFILES).map(publicProfile));
});

// Login with PIN
app.post('/api/login', (req, res) => {
  const { profileId, pin } = req.body || {};
  if (!isValidProfileId(profileId)) {
    return res.status(404).json({ error: 'Perfil no encontrado' });
  }
  const profile = PROFILES[profileId];
  if (typeof pin !== 'string' || pin !== profile.pin) {
    return res.status(401).json({ error: 'Clave incorrecta' });
  }
  res.json({ ok: true, profile: publicProfile(profile) });
});

// Upload an image from the device (camera roll) and get back a URL to use as an item's image
app.post('/api/upload', (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'La imagen es muy pesada (máx. 5MB)' : err.message;
      return res.status(400).json({ error: message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ninguna imagen' });
    }
    const ext = ALLOWED_IMAGE_TYPES[req.file.mimetype];
    const filename = `${crypto.randomUUID()}${ext}`;
    const { error } = await supabase.storage
      .from(IMAGES_BUCKET)
      .upload(filename, req.file.buffer, { contentType: req.file.mimetype });
    if (error) {
      return res.status(500).json({ error: 'No se pudo subir la imagen' });
    }
    const { data } = supabase.storage.from(IMAGES_BUCKET).getPublicUrl(filename);
    res.status(201).json({ url: data.publicUrl });
  });
});

// Get items for an owner. If viewer === owner, hide reservation info (keeps surprises secret).
app.get('/api/items', async (req, res) => {
  const { owner, viewer } = req.query;
  if (!isValidProfileId(owner)) {
    return res.status(400).json({ error: 'Perfil de owner inválido' });
  }
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('owner', owner)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Error al leer los deseos' });
  res.json(data.map((row) => toItemView(row, viewer === owner)));
});

// Add a new item (only the requester who owns the list may add to it)
app.post('/api/items', async (req, res) => {
  const { owner, requester, title, description, url, price, image } = req.body || {};
  if (!isValidProfileId(owner) || !isValidProfileId(requester) || requester !== owner) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'El título es obligatorio' });
  }
  const { data, error } = await supabase
    .from('items')
    .insert({
      owner,
      title: title.trim().slice(0, 200),
      description: typeof description === 'string' ? description.trim().slice(0, 1000) : '',
      url: typeof url === 'string' ? url.trim().slice(0, 500) : '',
      price: typeof price === 'string' ? price.trim().slice(0, 50) : '',
      image: typeof image === 'string' ? image.trim().slice(0, 1000) : '',
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'No se pudo guardar el deseo' });
  res.status(201).json(toItemView(data, true));
});

// Edit an item (only owner)
app.put('/api/items/:id', async (req, res) => {
  const { requester, title, description, url, price, image } = req.body || {};
  const { data: existing, error: findError } = await supabase
    .from('items')
    .select('owner')
    .eq('id', req.params.id)
    .maybeSingle();
  if (findError) return res.status(500).json({ error: 'Error al buscar el deseo' });
  if (!existing) return res.status(404).json({ error: 'No encontrado' });
  if (requester !== existing.owner) return res.status(403).json({ error: 'No autorizado' });

  const updates = {};
  if (typeof title === 'string' && title.trim()) updates.title = title.trim().slice(0, 200);
  if (typeof description === 'string') updates.description = description.trim().slice(0, 1000);
  if (typeof url === 'string') updates.url = url.trim().slice(0, 500);
  if (typeof price === 'string') updates.price = price.trim().slice(0, 50);
  if (typeof image === 'string') updates.image = image.trim().slice(0, 1000);

  const { data, error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'No se pudo actualizar el deseo' });
  res.json(toItemView(data, true));
});

// Delete an item (only owner)
app.delete('/api/items/:id', async (req, res) => {
  const { requester } = req.body || {};
  const { data: existing, error: findError } = await supabase
    .from('items')
    .select('owner')
    .eq('id', req.params.id)
    .maybeSingle();
  if (findError) return res.status(500).json({ error: 'Error al buscar el deseo' });
  if (!existing) return res.status(404).json({ error: 'No encontrado' });
  if (requester !== existing.owner) return res.status(403).json({ error: 'No autorizado' });

  const { error } = await supabase.from('items').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: 'No se pudo eliminar el deseo' });
  res.status(204).end();
});

// Toggle reservation (only the partner, never the owner, may reserve/unreserve)
app.post('/api/items/:id/reserve', async (req, res) => {
  const { requester, reserved } = req.body || {};
  const { data: existing, error: findError } = await supabase
    .from('items')
    .select('owner')
    .eq('id', req.params.id)
    .maybeSingle();
  if (findError) return res.status(500).json({ error: 'Error al buscar el deseo' });
  if (!existing) return res.status(404).json({ error: 'No encontrado' });
  if (!isValidProfileId(requester) || requester === existing.owner) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  const { data, error } = await supabase
    .from('items')
    .update({ reserved: !!reserved, reserved_by: reserved ? requester : null })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: 'No se pudo actualizar la reserva' });
  res.json(toItemView(data, false));
});

app.listen(PORT, () => {
  console.log(`Wishlist corriendo en http://localhost:${PORT}`);
});
