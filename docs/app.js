// --- Datos en la nube (Firebase Firestore) ---
// Reutiliza el mismo proyecto de Firebase de "Elita" (Mis Ejercicios), en una
// colección nueva ("wishlist_items") que no toca los datos de esa otra app.
// La carga de Firebase es asíncrona y no bloquea el resto de la página: si
// falla (sin internet, CDN caído), igual se puede ver el login/PIN.

// El meta viewport (user-scalable=no) no alcanza en iOS Safari: desde hace
// años ignora esa directiva por accesibilidad, así que hay que bloquear el
// pellizco (dos dedos) a mano. El doble-toque para zoom ya lo bloquea
// "touch-action: manipulation" en el CSS, sin necesitar JS: un bloqueo por
// temporizador aquí terminaba confundiendo toques rápidos y seguidos
// (como tipear un PIN) con dobles-toques, y cancelaba esos toques.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

const root = document.getElementById('app');

const PROFILES = {
  lentina: { id: 'lentina', name: 'Lentina', pin: '3103', emoji: '🐻‍❄️', theme: 'pink' },
  manolo: { id: 'manolo', name: 'Manuelito', pin: '0701', emoji: '🐻', theme: 'blue' },
};

const TASTE_CATEGORIES = [
  { key: 'flowers', label: '🌸 Flores favoritas', placeholder: 'Ej. Rosas rosadas, girasoles...' },
  { key: 'colors', label: '🎨 Colores favoritos', placeholder: 'Ej. Rosa, celeste...' },
  { key: 'perfume', label: '💐 Perfume / Fragancia', placeholder: 'Marca o aroma preferido' },
  { key: 'sweets', label: '🍫 Dulces / Postre favorito', placeholder: 'Ej. Chocolate amargo, tiramisú...' },
  { key: 'clothing', label: '👗 Talla de ropa', placeholder: 'Ej. Talla M, pantalón 28...' },
  { key: 'accessories', label: '💍 Accesorios', placeholder: 'Aretes, pulseras, anillos...' },
  { key: 'notes', label: '✨ Otros gustos', placeholder: 'Cualquier otra cosa que le guste' },
];

const state = {
  booting: true,
  firestoreError: false,
  items: [],
  foodItems: [],
  tastes: {},
  session: null,
  pinTarget: null,
  pinBuffer: '',
  pinError: false,
  activeSection: 'gifts',
  activeTab: 'mine',
  search: '',
  sortBy: 'recent',
  sheet: null,
  confirm: null,
  toast: null,
  lightboxImage: null,
};

let itemsCol = null;
let foodCol = null;
let tastesDocRef = null;
let fsAddDoc = null, fsUpdateDoc = null, fsDeleteDoc = null, fsDoc = null, fsSetDoc = null;

(async () => {
  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js');
    const {
      initializeFirestore, persistentLocalCache, collection,
      doc, addDoc, updateDoc, deleteDoc, setDoc, onSnapshot,
    } = await import('https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js');

    const firebaseConfig = {
      apiKey: 'AIzaSyCoUrHkRDCE_eJ_dcPMJ74esGgTUzpXn38',
      authDomain: 'elita---ejercicios.firebaseapp.com',
      projectId: 'elita---ejercicios',
      storageBucket: 'elita---ejercicios.firebasestorage.app',
      messagingSenderId: '513889275392',
      appId: '1:513889275392:web:a6b732dbf8edfcced6d2e5',
    };

    const firebaseApp = initializeApp(firebaseConfig);
    const db = initializeFirestore(firebaseApp, { localCache: persistentLocalCache() });
    itemsCol = collection(db, 'wishlist_items');
    foodCol = collection(db, 'food_items');
    tastesDocRef = doc(db, 'preferences', 'lentina');
    fsAddDoc = addDoc; fsUpdateDoc = updateDoc; fsDeleteDoc = deleteDoc; fsDoc = doc; fsSetDoc = setDoc;

    onSnapshot(
      itemsCol,
      (snap) => {
        state.items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        state.booting = false;
        render();
      },
      () => {
        state.firestoreError = true;
        state.booting = false;
        render();
      }
    );

    onSnapshot(
      foodCol,
      (snap) => {
        state.foodItems = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        render();
      },
      () => {
        state.firestoreError = true;
        render();
      }
    );

    onSnapshot(
      tastesDocRef,
      (snap) => {
        state.tastes = snap.exists() ? snap.data() : {};
        render();
      },
      () => {
        state.firestoreError = true;
        render();
      }
    );
  } catch (e) {
    state.firestoreError = true;
    state.booting = false;
    render();
  }
})();

function showToast(msg) {
  state.toast = msg;
  render();
  setTimeout(() => { state.toast = null; render(); }, 2200);
}

function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen no soportado'));
      img.onload = () => {
        const maxDim = 800;
        let w = img.width, h = img.height;
        if (w > h && w > maxDim) { h = Math.round(h * (maxDim / w)); w = maxDim; }
        else if (h > maxDim) { w = Math.round(w * (maxDim / h)); h = maxDim; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.62));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function formatPrice(price) {
  const trimmed = String(price || '').trim();
  if (!trimmed) return '';
  return /^bs\.?\s*/i.test(trimmed) ? trimmed : `Bs ${trimmed}`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function myItems() { return state.items.filter((it) => it.owner === state.session); }
function partnerId() { return state.session === 'lentina' ? 'manolo' : 'lentina'; }
function partnerItems() { const pid = partnerId(); return state.items.filter((it) => it.owner === pid); }
function myFoodItems() { return state.foodItems.filter((it) => it.owner === state.session); }
function partnerFoodItems() { const pid = partnerId(); return state.foodItems.filter((it) => it.owner === pid); }

function filterAndSort(items) {
  const q = state.search.trim().toLowerCase();
  let result = q ? items.filter((it) => it.title.toLowerCase().includes(q)) : items.slice();
  function priceValue(it) {
    const n = parseFloat(String(it.price || '').replace(/[^\d.,]/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  if (state.sortBy === 'price-asc' || state.sortBy === 'price-desc') {
    const dir = state.sortBy === 'price-asc' ? 1 : -1;
    result.sort((a, b) => {
      const pa = priceValue(a), pb = priceValue(b);
      if (pa === null && pb === null) return 0;
      if (pa === null) return 1;
      if (pb === null) return -1;
      return (pa - pb) * dir;
    });
  } else {
    result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }
  return result;
}

// ---------- Actions ----------
function openPin(profile) { state.pinTarget = profile; state.pinBuffer = ''; state.pinError = false; render(); }
function backToProfiles() { state.pinTarget = null; state.pinBuffer = ''; state.pinError = false; render(); }
function deleteDigit() {
  if (!state.pinBuffer.length) return;
  state.pinBuffer = state.pinBuffer.slice(0, -1);
  state.pinError = false;
  updatePinDots();
}

function pressDigit(d) {
  if (state.pinBuffer.length >= 4) return;
  state.pinBuffer += d;
  updatePinDots();
  if (state.pinBuffer.length === 4) {
    const profile = state.pinTarget;
    if (state.pinBuffer === profile.pin) {
      state.session = profile.id;
      state.pinTarget = null;
      state.pinBuffer = '';
      state.activeTab = 'mine';
      render();
    } else {
      state.pinError = true;
      updatePinDots();
      setTimeout(() => { state.pinBuffer = ''; state.pinError = false; updatePinDots(); }, 450);
    }
  }
}

function logout() {
  state.session = null;
  state.activeTab = 'mine';
  state.search = '';
  state.sortBy = 'recent';
  render();
}

function switchTab(tab) { state.activeTab = tab; state.search = ''; state.sortBy = 'recent'; render(); }
function switchSection(section) { state.activeSection = section; state.search = ''; state.sortBy = 'recent'; render(); }

function openAddSheet() {
  state.sheet = { kind: 'gift', mode: 'add', item: { title: '', description: '', price: '', url: '', image: '' }, uploading: false };
  render();
}
function openEditSheet(item) {
  state.sheet = { kind: 'gift', mode: 'edit', item: Object.assign({}, item), uploading: false };
  render();
}
function openAddFoodSheet() {
  state.sheet = { kind: 'food', mode: 'add', item: { name: '', restaurant: '', note: '' } };
  render();
}
function openEditFoodSheet(item) {
  state.sheet = { kind: 'food', mode: 'edit', item: Object.assign({}, item) };
  render();
}
function closeSheet() { state.sheet = null; render(); }

function syncFormFieldsToSheetItem() {
  const form = root.querySelector('#item-form');
  if (!form || !state.sheet) return;
  const fd = new FormData(form);
  state.sheet.item.title = fd.get('title') || state.sheet.item.title;
  state.sheet.item.description = fd.get('description') ?? state.sheet.item.description;
  state.sheet.item.price = fd.get('price') ?? state.sheet.item.price;
  state.sheet.item.url = fd.get('url') ?? state.sheet.item.url;
}

async function handleImageFile(file) {
  if (!file) return;
  syncFormFieldsToSheetItem();
  state.sheet.uploading = true;
  render();
  try {
    state.sheet.item.image = await compressImageFile(file);
  } catch (e) {
    showToast(e.message || 'No se pudo procesar la imagen');
  } finally {
    state.sheet.uploading = false;
    render();
  }
}
function removeSheetImage() { syncFormFieldsToSheetItem(); state.sheet.item.image = ''; render(); }

async function saveSheet(formData) {
  const title = (formData.title || '').trim();
  if (!title) { showToast('Poné un título para el deseo'); return; }
  if (!itemsCol) { showToast('Sin conexión a la base de datos'); return; }
  const payload = {
    title: title.slice(0, 200),
    description: (formData.description || '').trim().slice(0, 1000),
    url: (formData.url || '').trim().slice(0, 500),
    price: (formData.price || '').trim().slice(0, 50),
    image: formData.image || '',
  };
  try {
    if (state.sheet.mode === 'add') {
      await fsAddDoc(itemsCol, {
        ...payload,
        owner: state.session,
        reserved: false,
        reservedBy: null,
        createdAt: Date.now(),
      });
      showToast('¡Agregado a tu lista! 🎉');
    } else {
      await fsUpdateDoc(fsDoc(itemsCol, state.sheet.item.id), payload);
      showToast('Cambios guardados');
    }
    closeSheet();
  } catch (e) {
    showToast('No se pudo guardar. Revisá tu conexión.');
  }
}

async function deleteItem(id) {
  try {
    await fsDeleteDoc(fsDoc(itemsCol, id));
    closeSheet();
    showToast('Eliminado');
  } catch (e) {
    showToast('No se pudo eliminar. Revisá tu conexión.');
  }
}

async function saveFoodSheet(formData) {
  const name = (formData.name || '').trim();
  if (!name) { showToast('Poné el nombre de la comida'); return; }
  if (!foodCol) { showToast('Sin conexión a la base de datos'); return; }
  const payload = {
    name: name.slice(0, 120),
    restaurant: (formData.restaurant || '').trim().slice(0, 150),
    note: (formData.note || '').trim().slice(0, 300),
  };
  try {
    if (state.sheet.mode === 'add') {
      await fsAddDoc(foodCol, { ...payload, owner: state.session, createdAt: Date.now() });
      showToast('¡Agregado! 🍽️');
    } else {
      await fsUpdateDoc(fsDoc(foodCol, state.sheet.item.id), payload);
      showToast('Cambios guardados');
    }
    closeSheet();
  } catch (e) {
    showToast('No se pudo guardar. Revisá tu conexión.');
  }
}

async function deleteFoodItem(id) {
  try {
    await fsDeleteDoc(fsDoc(foodCol, id));
    closeSheet();
    showToast('Eliminado');
  } catch (e) {
    showToast('No se pudo eliminar. Revisá tu conexión.');
  }
}

async function saveTastes(formData) {
  if (!fsSetDoc || !tastesDocRef) { showToast('Sin conexión a la base de datos'); return; }
  const payload = {};
  TASTE_CATEGORIES.forEach((c) => { payload[c.key] = (formData[c.key] || '').trim().slice(0, 300); });
  try {
    await fsSetDoc(tastesDocRef, payload, { merge: true });
    showToast('Guardado 💐');
  } catch (e) {
    showToast('No se pudo guardar. Revisá tu conexión.');
  }
}

async function toggleReserve(item) {
  try {
    await fsUpdateDoc(fsDoc(itemsCol, item.id), {
      reserved: !item.reserved,
      reservedBy: !item.reserved ? state.session : null,
    });
  } catch (e) {
    showToast('No se pudo actualizar. Revisá tu conexión.');
  }
}

function openConfirm(message, onConfirm) { state.confirm = { message, onConfirm }; render(); }
function closeConfirm() { state.confirm = null; render(); }

function openLightbox(id) {
  const item = state.items.find((it) => it.id === id);
  if (!item || !item.image) return;
  state.lightboxImage = item.image;
  render();
}
function closeLightbox() { state.lightboxImage = null; render(); }

// ---------- Render ----------
function itemThumb(item) {
  if (item.image) return `<button type="button" class="item-thumb" data-action="view-image" data-id="${item.id}"><img src="${escapeHtml(item.image)}" alt="" onerror="this.parentElement.innerHTML='🎁'"/></button>`;
  return `<div class="item-thumb">🎁</div>`;
}
function themeClass(theme) { return theme === 'blue' ? 'theme-blue' : 'theme-pink'; }

function renderItemCard(item, mode, index) {
  const meta = `<div class="item-meta">
    ${item.price ? `<span class="item-price">${escapeHtml(formatPrice(item.price))}</span>` : ''}
    ${item.url ? `<a class="item-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Ver enlace ↗</a>` : ''}
  </div>`;
  let extra = '', actions = '';
  if (mode === 'mine') {
    actions = `<div class="item-actions">
      <button class="icon-btn" data-action="edit" data-id="${item.id}">✏️</button>
      <button class="icon-btn danger" data-action="delete" data-id="${item.id}">🗑️</button>
    </div>`;
  } else if (item.reserved && item.reservedBy === state.session) {
    extra = `<div class="reserve-btn reserved" data-action="unreserve" data-id="${item.id}">✅ Lo vas a regalar tú</div>`;
  } else if (item.reserved) {
    extra = `<div class="reserved-by-other">🎁 Ya está reservado</div>`;
  } else {
    extra = `<button class="reserve-btn" data-action="reserve" data-id="${item.id}">🎁 Yo lo regalo</button>`;
  }
  const delay = Math.min(index || 0, 8) * 0.05;
  return `<div class="item-card card-enter" style="animation-delay:${delay}s">
    ${itemThumb(item)}
    <div class="item-body">
      <div class="item-title">${escapeHtml(item.title)}</div>
      ${item.description ? `<div class="item-desc">${escapeHtml(item.description)}</div>` : ''}
      ${meta}${extra}
    </div>${actions}
  </div>`;
}

function renderFoodCard(item, mode) {
  const actions = mode === 'mine' ? `<div class="item-actions">
    <button class="icon-btn" data-action="edit-food" data-id="${item.id}">✏️</button>
    <button class="icon-btn danger" data-action="delete-food" data-id="${item.id}">🗑️</button>
  </div>` : '';
  return `<div class="item-card card-enter">
    <div class="item-thumb">🍽️</div>
    <div class="item-body">
      <div class="item-title">${escapeHtml(item.name)}</div>
      ${item.restaurant ? `<div class="item-desc">📍 ${escapeHtml(item.restaurant)}</div>` : ''}
      ${item.note ? `<div class="item-desc">${escapeHtml(item.note)}</div>` : ''}
    </div>${actions}
  </div>`;
}

function renderTastesPanel() {
  const t = state.tastes || {};
  const fields = TASTE_CATEGORIES.map((cat) => `
    <div class="field">
      <label>${cat.label}</label>
      <textarea name="${cat.key}" placeholder="${escapeHtml(cat.placeholder)}" maxlength="300">${escapeHtml(t[cat.key])}</textarea>
    </div>`).join('');
  return `<div class="tastes-panel">
    <form id="tastes-form">
      ${fields}
      <div class="sheet-actions">
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>
  </div>`;
}

function renderBootScreen() { return `<div class="screen-boot"><div class="boot-spinner"></div></div>`; }

function renderLoginProfiles() {
  const cards = Object.values(PROFILES).map((p) => `
    <button class="profile-card ${themeClass(p.theme)}" data-action="open-pin" data-id="${p.id}">
      <div class="profile-avatar">${p.emoji}</div>
      <div><div class="profile-name">${escapeHtml(p.name)}</div>
      <div class="profile-hint">Toca para entrar</div></div>
    </button>`).join('');
  return `<div class="screen-login">
    <div class="login-title">Nuestra<br/>Wishlist 💫</div>
    <div class="login-subtitle">Elige tu perfil para entrar</div>
    <div class="profile-cards">${cards}</div>
  </div>`;
}

function renderPinDots() {
  return [0, 1, 2, 3].map((i) => {
    const filled = i < state.pinBuffer.length;
    const cls = state.pinError ? 'error' : (filled ? 'filled' : '');
    return `<div class="pin-dot ${cls}"></div>`;
  }).join('');
}

function updatePinDots() {
  const dotsEl = root.querySelector('.pin-dots');
  if (dotsEl) dotsEl.innerHTML = renderPinDots();
}

function renderPinScreen() {
  const p = state.pinTarget;
  const dots = renderPinDots();
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];
  const keypad = keys.map((k) => {
    if (k === '') return `<div></div>`;
    if (k === 'back') return `<button class="pin-key ghost" data-action="pin-back">⌫</button>`;
    return `<button class="pin-key" data-action="pin-digit" data-digit="${k}">${k}</button>`;
  }).join('');
  return `<div class="screen-pin">
    <button class="pin-back" data-action="pin-cancel">‹ Volver</button>
    <div class="pin-avatar ${themeClass(p.theme)}">${p.emoji}</div>
    <div class="pin-greeting">Hola, ${escapeHtml(p.name)}</div>
    <div class="pin-instruction">Ingresa tu clave de 4 dígitos</div>
    <div class="pin-dots">${dots}</div>
    <div class="pin-keypad">${keypad}</div>
  </div>`;
}

function renderListControls(count) {
  if (count === 0) return '';
  const sorts = [
    { id: 'recent', label: 'Recientes' },
    { id: 'price-asc', label: 'Precio ↑' },
    { id: 'price-desc', label: 'Precio ↓' },
  ];
  const chips = sorts.map((s) => `<button class="sort-chip ${state.sortBy === s.id ? 'active' : ''}" data-action="sort" data-sort="${s.id}">${s.label}</button>`).join('');
  return `<div class="list-controls">
    <div class="search-box"><span class="search-icon">🔍</span>
    <input type="text" id="search-input" class="search-input" data-action="search" placeholder="Buscar en la lista..." value="${escapeHtml(state.search)}" /></div>
    <div class="sort-chips">${chips}</div>
  </div>`;
}

function renderDashboard() {
  const mode = state.activeTab;
  let section = state.activeSection;
  if (section === 'tastes' && state.session !== 'manolo') section = 'gifts';
  const partnerName = PROFILES[partnerId()].name;
  let list;
  if (section === 'tastes') {
    list = renderTastesPanel();
  } else if (section === 'food') {
    const rawItems = mode === 'mine' ? myFoodItems() : partnerFoodItems();
    if (rawItems.length === 0) {
      list = `<div class="empty-state"><div class="empty-emoji">🍽️</div>
        <div>${mode === 'mine' ? 'Aún no agregaste comidas.<br/>Toca + para empezar.' : `${escapeHtml(partnerName)} no agregó comidas todavía.`}</div></div>`;
    } else {
      const cards = rawItems.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map((it) => renderFoodCard(it, mode)).join('');
      list = `<div class="items-list">${cards}</div>`;
    }
  } else {
    const rawItems = mode === 'mine' ? myItems() : partnerItems();
    if (rawItems.length === 0) {
      list = `<div class="empty-state"><div class="empty-emoji">${mode === 'mine' ? '📝' : '🎁'}</div>
        <div>${mode === 'mine' ? 'Aún no agregaste nada.<br/>Toca + para empezar.' : `${escapeHtml(partnerName)} no tiene deseos todavía.`}</div></div>`;
    } else {
      const items = filterAndSort(rawItems);
      const cards = items.length
        ? items.map((it, i) => renderItemCard(it, mode, i)).join('')
        : `<div class="empty-state small"><div class="empty-emoji">🔎</div><div>Nada coincide con "${escapeHtml(state.search)}"</div></div>`;
      list = renderListControls(rawItems.length) + `<div class="items-list">${cards}</div>`;
    }
  }
  const profile = PROFILES[state.session];
  const dashSub = section === 'tastes'
    ? `Notas sobre los gustos de ${escapeHtml(partnerName)}`
    : section === 'food'
      ? (mode === 'mine' ? 'Tus comidas favoritas' : `Las comidas favoritas de ${escapeHtml(partnerName)}`)
      : (mode === 'mine' ? 'Estos son tus deseos' : `Los deseos de ${escapeHtml(partnerName)}`);
  return `<div class="screen-dashboard">
    <div class="dash-header"><div>
      <div class="dash-greeting">Hola, ${escapeHtml(profile.name)} ${profile.emoji}</div>
      <div class="dash-sub">${dashSub}</div>
    </div><button class="logout-btn" data-action="logout">⏻</button></div>
    <div class="tabs">
      <button class="tab-btn ${section === 'gifts' ? 'active' : ''}" data-action="section" data-section="gifts">🎁 Regalos</button>
      <button class="tab-btn ${section === 'food' ? 'active' : ''}" data-action="section" data-section="food">🍽️ Comida</button>
      ${state.session === 'manolo' ? `<button class="tab-btn ${section === 'tastes' ? 'active' : ''}" data-action="section" data-section="tastes">💐 Gustos</button>` : ''}
    </div>
    ${section === 'tastes' ? '' : `<div class="tabs">
      <button class="tab-btn ${mode === 'mine' ? 'active' : ''}" data-action="tab" data-tab="mine">Mi lista</button>
      <button class="tab-btn ${mode === 'partner' ? 'active' : ''}" data-action="tab" data-tab="partner">${escapeHtml(partnerName)}</button>
    </div>`}
    <div class="dashboard-scroll">${list}</div>
    ${section !== 'tastes' && mode === 'mine' ? `<button class="fab" data-action="${section === 'food' ? 'add-food' : 'add'}">+</button>` : ''}
    <div class="bottom-nav">
      <button class="nav-item ${mode === 'mine' ? 'active' : ''}" data-action="tab" data-tab="mine"><span class="nav-icon">🏠</span>Mi lista</button>
      <button class="nav-item ${mode === 'partner' ? 'active' : ''}" data-action="tab" data-tab="partner"><span class="nav-icon">💌</span>${escapeHtml(partnerName)}</button>
      <button class="nav-item" data-action="logout"><span class="nav-icon">⏻</span>Salir</button>
    </div>
  </div>`;
}

function renderImageField(item, uploading) {
  if (item.image) {
    return `<div class="field"><label>Foto</label><div class="image-preview">
      <img src="${escapeHtml(item.image)}" alt="" />
      <button type="button" class="image-remove" data-action="remove-image">🗑️ Quitar</button>
    </div></div>`;
  }
  return `<div class="field"><label>Foto (opcional)</label>
    <label class="upload-btn ${uploading ? 'disabled' : ''}">
      ${uploading ? 'Procesando...' : '📷 Subir foto desde tu celular'}
      <input type="file" accept="image/*" data-action="image-file" ${uploading ? 'disabled' : ''} hidden />
    </label>
    <input type="url" id="image-url-input" name="image" placeholder="o pegá un link de imagen" maxlength="1000" />
  </div>`;
}

function renderFoodSheet() {
  const { mode, item } = state.sheet;
  return `<div class="sheet-overlay" data-action="sheet-overlay"><div class="sheet">
    <div class="sheet-handle"></div>
    <div class="sheet-title">${mode === 'add' ? 'Nueva comida' : 'Editar comida'}</div>
    <form id="food-form">
      <div class="field"><label>¿Qué comida te gusta?</label>
        <input type="text" id="field-food-name" name="name" placeholder="Ej. Milanesa con papas" value="${escapeHtml(item.name)}" required maxlength="120" /></div>
      <div class="field"><label>Restaurante (opcional)</label>
        <input type="text" id="field-food-restaurant" name="restaurant" placeholder="Ej. La Casona" value="${escapeHtml(item.restaurant)}" maxlength="150" /></div>
      <div class="field"><label>Notas (opcional)</label>
        <textarea id="field-food-note" name="note" placeholder="Sin cebolla, bien picante..." maxlength="300">${escapeHtml(item.note)}</textarea></div>
      <div class="sheet-actions">
        <button type="button" class="btn btn-secondary" data-action="sheet-cancel">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
      ${mode === 'edit' ? `<div class="sheet-actions" style="margin-top:10px">
        <button type="button" class="btn btn-danger-text" data-action="sheet-delete" data-id="${item.id}">Eliminar comida</button></div>` : ''}
    </form>
  </div></div>`;
}

function renderSheet() {
  if (!state.sheet) return '';
  if (state.sheet.kind === 'food') return renderFoodSheet();
  const { mode, item, uploading } = state.sheet;
  return `<div class="sheet-overlay" data-action="sheet-overlay"><div class="sheet">
    <div class="sheet-handle"></div>
    <div class="sheet-title">${mode === 'add' ? 'Nuevo deseo' : 'Editar deseo'}</div>
    <form id="item-form">
      <div class="field"><label>¿Qué deseas?</label>
        <input type="text" id="field-title" name="title" placeholder="Ej. Zapatillas rosas" value="${escapeHtml(item.title)}" required maxlength="200" /></div>
      <div class="field"><label>Descripción (opcional)</label>
        <textarea id="field-description" name="description" placeholder="Talla, color, detalles..." maxlength="1000">${escapeHtml(item.description)}</textarea></div>
      <div class="field-row"><div class="field"><label>Precio aprox. (Bs)</label>
        <input type="text" id="field-price" name="price" placeholder="Bs 350" value="${escapeHtml(item.price)}" maxlength="50" /></div></div>
      <div class="field"><label>Link de la tienda (opcional)</label>
        <input type="url" id="field-url" name="url" placeholder="https://..." value="${escapeHtml(item.url)}" maxlength="500" /></div>
      ${renderImageField(item, uploading)}
      <div class="sheet-actions">
        <button type="button" class="btn btn-secondary" data-action="sheet-cancel">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
      ${mode === 'edit' ? `<div class="sheet-actions" style="margin-top:10px">
        <button type="button" class="btn btn-danger-text" data-action="sheet-delete" data-id="${item.id}">Eliminar deseo</button></div>` : ''}
    </form>
  </div></div>`;
}

function renderConfirmDialog() {
  if (!state.confirm) return '';
  return `<div class="confirm-overlay" data-action="confirm-overlay"><div class="confirm-box">
    <div class="confirm-message">${escapeHtml(state.confirm.message)}</div>
    <div class="sheet-actions">
      <button type="button" class="btn btn-secondary" data-action="confirm-cancel">Cancelar</button>
      <button type="button" class="btn btn-danger-solid" data-action="confirm-yes">Eliminar</button>
    </div>
  </div></div>`;
}

function renderLightbox() {
  if (!state.lightboxImage) return '';
  return `<div class="lightbox-overlay" data-action="lightbox-overlay">
    <button type="button" class="lightbox-close" data-action="lightbox-close">✕</button>
    <img class="lightbox-img" src="${escapeHtml(state.lightboxImage)}" alt="" />
  </div>`;
}

function render() {
  let html = '';
  if (state.booting) {
    html = renderBootScreen();
  } else if (state.firestoreError) {
    html = `<div class="screen-boot"><div class="empty-state"><div class="empty-emoji">⚠️</div><div>No se pudo conectar.<br/>Revisá tu internet y recargá la página.</div></div></div>`;
  } else if (!state.session) {
    html = state.pinTarget ? renderPinScreen() : renderLoginProfiles();
  } else {
    html = renderDashboard();
  }
  html += renderSheet();
  html += renderConfirmDialog();
  html += renderLightbox();
  if (state.toast) html += `<div class="toast">${escapeHtml(state.toast)}</div>`;
  root.innerHTML = html;
  bindEvents();
}

function bindEvents() {
  root.querySelectorAll('[data-action]').forEach((elm) => {
    const action = elm.getAttribute('data-action');
    if (action === 'open-pin') {
      elm.addEventListener('click', () => openPin(PROFILES[elm.getAttribute('data-id')]));
    } else if (action === 'pin-cancel') {
      elm.addEventListener('click', backToProfiles);
    } else if (action === 'pin-back') {
      elm.addEventListener('click', deleteDigit);
    } else if (action === 'pin-digit') {
      elm.addEventListener('click', () => pressDigit(elm.getAttribute('data-digit')));
    } else if (action === 'logout') {
      elm.addEventListener('click', logout);
    } else if (action === 'tab') {
      elm.addEventListener('click', () => switchTab(elm.getAttribute('data-tab')));
    } else if (action === 'section') {
      elm.addEventListener('click', () => switchSection(elm.getAttribute('data-section')));
    } else if (action === 'add') {
      elm.addEventListener('click', openAddSheet);
    } else if (action === 'add-food') {
      elm.addEventListener('click', openAddFoodSheet);
    } else if (action === 'edit-food') {
      elm.addEventListener('click', () => {
        const item = myFoodItems().find((it) => it.id === elm.getAttribute('data-id'));
        if (item) openEditFoodSheet(item);
      });
    } else if (action === 'delete-food') {
      elm.addEventListener('click', () => {
        const id = elm.getAttribute('data-id');
        openConfirm('¿Eliminar esta comida? No se puede deshacer.', () => deleteFoodItem(id));
      });
    } else if (action === 'edit') {
      elm.addEventListener('click', () => {
        const item = myItems().find((it) => it.id === elm.getAttribute('data-id'));
        if (item) openEditSheet(item);
      });
    } else if (action === 'delete') {
      elm.addEventListener('click', () => {
        const id = elm.getAttribute('data-id');
        openConfirm('¿Eliminar este deseo? No se puede deshacer.', () => deleteItem(id));
      });
    } else if (action === 'sheet-delete') {
      elm.addEventListener('click', () => {
        const id = elm.getAttribute('data-id');
        if (state.sheet && state.sheet.kind === 'food') {
          openConfirm('¿Eliminar esta comida? No se puede deshacer.', () => deleteFoodItem(id));
        } else {
          openConfirm('¿Eliminar este deseo? No se puede deshacer.', () => deleteItem(id));
        }
      });
    } else if (action === 'confirm-yes') {
      elm.addEventListener('click', () => {
        const cb = state.confirm && state.confirm.onConfirm;
        closeConfirm();
        if (cb) cb();
      });
    } else if (action === 'confirm-cancel' || action === 'confirm-overlay') {
      elm.addEventListener('click', (evt) => {
        if (action === 'confirm-overlay' && evt.target !== elm) return;
        closeConfirm();
      });
    } else if (action === 'search') {
      elm.addEventListener('input', () => {
        const cursorPos = elm.selectionStart;
        state.search = elm.value;
        render();
        const ni = document.getElementById('search-input');
        if (ni) { ni.focus(); ni.setSelectionRange(cursorPos, cursorPos); }
      });
    } else if (action === 'sort') {
      elm.addEventListener('click', () => { state.sortBy = elm.getAttribute('data-sort'); render(); });
    } else if (action === 'reserve' || action === 'unreserve') {
      elm.addEventListener('click', () => {
        const item = partnerItems().find((it) => it.id === elm.getAttribute('data-id'));
        if (item) toggleReserve(item);
      });
    } else if (action === 'sheet-cancel') {
      elm.addEventListener('click', closeSheet);
    } else if (action === 'sheet-overlay') {
      elm.addEventListener('click', (evt) => { if (evt.target === elm) closeSheet(); });
    } else if (action === 'image-file') {
      elm.addEventListener('change', () => handleImageFile(elm.files[0]));
    } else if (action === 'remove-image') {
      elm.addEventListener('click', removeSheetImage);
    } else if (action === 'view-image') {
      elm.addEventListener('click', () => openLightbox(elm.getAttribute('data-id')));
    } else if (action === 'lightbox-close') {
      elm.addEventListener('click', closeLightbox);
    } else if (action === 'lightbox-overlay') {
      elm.addEventListener('click', (evt) => { if (evt.target === elm) closeLightbox(); });
    }
  });

  const form = root.querySelector('#item-form');
  if (form) {
    form.addEventListener('submit', (evt) => {
      evt.preventDefault();
      const fd = new FormData(form);
      const imageUrlField = fd.get('image');
      saveSheet({
        title: fd.get('title'),
        description: fd.get('description'),
        price: fd.get('price'),
        url: fd.get('url'),
        image: state.sheet.item.image || (typeof imageUrlField === 'string' ? imageUrlField : ''),
      });
    });
  }

  const foodForm = root.querySelector('#food-form');
  if (foodForm) {
    foodForm.addEventListener('submit', (evt) => {
      evt.preventDefault();
      const fd = new FormData(foodForm);
      saveFoodSheet({ name: fd.get('name'), restaurant: fd.get('restaurant'), note: fd.get('note') });
    });
  }

  const tastesForm = root.querySelector('#tastes-form');
  if (tastesForm) {
    tastesForm.addEventListener('submit', (evt) => {
      evt.preventDefault();
      const fd = new FormData(tastesForm);
      const formData = {};
      TASTE_CATEGORIES.forEach((c) => { formData[c.key] = fd.get(c.key); });
      saveTastes(formData);
    });
  }

  setupSheetDrag();
}

function setupSheetDrag() {
  const sheetEl = root.querySelector('.sheet');
  const handleEl = root.querySelector('.sheet-handle');
  if (!sheetEl || !handleEl) return;
  let startY = 0;
  let dragY = 0;
  let dragging = false;

  const start = (y) => { dragging = true; startY = y; sheetEl.style.transition = 'none'; };
  const move = (y) => {
    if (!dragging) return;
    dragY = Math.max(0, y - startY);
    sheetEl.style.transform = `translateY(${dragY}px)`;
  };
  const end = () => {
    if (!dragging) return;
    dragging = false;
    sheetEl.style.transition = 'transform 0.2s ease';
    const threshold = sheetEl.offsetHeight * 0.6;
    if (dragY > threshold) {
      sheetEl.style.transform = 'translateY(100%)';
      setTimeout(closeSheet, 180);
    } else {
      sheetEl.style.transform = 'translateY(0)';
    }
  };

  handleEl.addEventListener('touchstart', (e) => start(e.touches[0].clientY), { passive: true });
  handleEl.addEventListener('touchmove', (e) => move(e.touches[0].clientY), { passive: true });
  handleEl.addEventListener('touchend', end);
  handleEl.addEventListener('mousedown', (e) => {
    start(e.clientY);
    const onMove = (ev) => move(ev.clientY);
    const onUp = () => { end(); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

render();
