const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const DB_PATH = path.join(__dirname, 'data', 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
const PORT = process.env.PORT || 3000;

const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = ALLOWED_IMAGE_TYPES[file.mimetype];
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
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

function readDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function publicProfile(profile) {
  return { id: profile.id, name: profile.name, emoji: profile.emoji, theme: profile.theme };
}

function isValidProfileId(db, id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(db.profiles, id);
}

// List profiles (no PINs exposed)
app.get('/api/profiles', (req, res) => {
  const db = readDb();
  res.json(Object.values(db.profiles).map(publicProfile));
});

// Login with PIN
app.post('/api/login', (req, res) => {
  const { profileId, pin } = req.body || {};
  const db = readDb();
  if (!isValidProfileId(db, profileId)) {
    return res.status(404).json({ error: 'Perfil no encontrado' });
  }
  const profile = db.profiles[profileId];
  if (typeof pin !== 'string' || pin !== profile.pin) {
    return res.status(401).json({ error: 'Clave incorrecta' });
  }
  res.json({ ok: true, profile: publicProfile(profile) });
});

// Upload an image from the device (camera roll) and get back a URL to use as an item's image
app.post('/api/upload', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'La imagen es muy pesada (máx. 5MB)' : err.message;
      return res.status(400).json({ error: message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ninguna imagen' });
    }
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

// Get items for an owner. If viewer === owner, hide reservation info (keeps surprises secret).
app.get('/api/items', (req, res) => {
  const db = readDb();
  const { owner, viewer } = req.query;
  if (!isValidProfileId(db, owner)) {
    return res.status(400).json({ error: 'Perfil de owner inválido' });
  }
  const items = db.items
    .filter((item) => item.owner === owner)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((item) => {
      if (viewer === owner) {
        const { reserved, reservedBy, ...rest } = item;
        return rest;
      }
      return item;
    });
  res.json(items);
});

// Add a new item (only the requester who owns the list may add to it)
app.post('/api/items', (req, res) => {
  const db = readDb();
  const { owner, requester, title, description, url, price, image } = req.body || {};
  if (!isValidProfileId(db, owner) || !isValidProfileId(db, requester) || requester !== owner) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'El título es obligatorio' });
  }
  const item = {
    id: crypto.randomUUID(),
    owner,
    title: title.trim().slice(0, 200),
    description: typeof description === 'string' ? description.trim().slice(0, 1000) : '',
    url: typeof url === 'string' ? url.trim().slice(0, 500) : '',
    price: typeof price === 'string' ? price.trim().slice(0, 50) : '',
    image: typeof image === 'string' ? image.trim().slice(0, 1000) : '',
    reserved: false,
    reservedBy: null,
    createdAt: Date.now(),
  };
  db.items.push(item);
  writeDb(db);
  const { reserved, reservedBy, ...ownerView } = item;
  res.status(201).json(ownerView);
});

// Edit an item (only owner)
app.put('/api/items/:id', (req, res) => {
  const db = readDb();
  const { requester, title, description, url, price, image } = req.body || {};
  const item = db.items.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'No encontrado' });
  if (requester !== item.owner) return res.status(403).json({ error: 'No autorizado' });

  if (typeof title === 'string' && title.trim()) item.title = title.trim().slice(0, 200);
  if (typeof description === 'string') item.description = description.trim().slice(0, 1000);
  if (typeof url === 'string') item.url = url.trim().slice(0, 500);
  if (typeof price === 'string') item.price = price.trim().slice(0, 50);
  if (typeof image === 'string') item.image = image.trim().slice(0, 1000);

  writeDb(db);
  const { reserved, reservedBy, ...ownerView } = item;
  res.json(ownerView);
});

// Delete an item (only owner)
app.delete('/api/items/:id', (req, res) => {
  const db = readDb();
  const { requester } = req.body || {};
  const idx = db.items.findIndex((i) => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'No encontrado' });
  if (requester !== db.items[idx].owner) return res.status(403).json({ error: 'No autorizado' });
  db.items.splice(idx, 1);
  writeDb(db);
  res.status(204).end();
});

// Toggle reservation (only the partner, never the owner, may reserve/unreserve)
app.post('/api/items/:id/reserve', (req, res) => {
  const db = readDb();
  const { requester, reserved } = req.body || {};
  const item = db.items.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'No encontrado' });
  if (!isValidProfileId(db, requester) || requester === item.owner) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  if (reserved) {
    item.reserved = true;
    item.reservedBy = requester;
  } else {
    item.reserved = false;
    item.reservedBy = null;
  }
  writeDb(db);
  res.json(item);
});

app.listen(PORT, () => {
  console.log(`Wishlist corriendo en http://localhost:${PORT}`);
});
