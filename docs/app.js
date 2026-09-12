// --- Datos en la nube (Firebase Firestore) ---
// Reutiliza el mismo proyecto de Firebase de "Elita" (Mis Ejercicios), en una
// colección nueva ("wishlist_items") que no toca los datos de esa otra app.
// La carga de Firebase es asíncrona y no bloquea el resto de la página: si
// falla (sin internet, CDN caído), igual se puede ver el login/PIN.

// El meta viewport (user-scalable=no) no alcanza en iOS Safari: desde hace
// años ignora esa directiva por accesibilidad, así que hay que bloquear el
// pellizco para hacer zoom explícitamente a mano.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
let lastTouchEnd = 0;
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });

const root = document.getElementById('app');

const PROFILES = {
  lentina: { id: 'lentina', name: 'Lentina', pin: '3103', emoji: '🐻‍❄️', theme: 'pink' },
  manolo: { id: 'manolo', name: 'Manuelito', pin: '0701', emoji: '🐻', theme: 'blue' },
};

const state = {
  booting: true,
  firestoreError: false,
  items: [],
  session: loadSession(),
  pinTarget: null,
  pinBuffer: '',
  pinError: false,
  activeTab: 'mine',
  search: '',
  sortBy: 'recent',
  sheet: null,
  confirm: null,
  toast: null,
};

let itemsCol = null;
let fsAddDoc = null, fsUpdateDoc = null, fsDeleteDoc = null, fsDoc = null;

(async () => {
  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js');
    const {
      initializeFirestore, persistentLocalCache, collection,
      doc, addDoc, updateDoc, deleteDoc, onSnapshot,
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
    fsAddDoc = addDoc; fsUpdateDoc = updateDoc; fsDeleteDoc = deleteDoc; fsDoc = doc;

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
  } catch (e) {
    state.firestoreError = true;
    state.booting = false;
    render();
  }
})();

function loadSession() {
  try {
    const raw = localStorage.getItem('wishlist_session_v1');
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function saveSession(profileId) {
  state.session = profileId;
  try { localStorage.setItem('wishlist_session_v1', JSON.stringify(profileId)); } catch (e) {}
}
function clearSession() {
  state.session = null;
  try { localStorage.removeItem('wishlist_session_v1'); } catch (e) {}
}

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
  render();
}

function pressDigit(d) {
  if (state.pinBuffer.length >= 4) return;
  state.pinBuffer += d;
  render();
  if (state.pinBuffer.length === 4) {
    const profile = state.pinTarget;
    if (state.pinBuffer === profile.pin) {
      saveSession(profile.id);
      state.pinTarget = null;
      state.pinBuffer = '';
      state.activeTab = 'mine';
      render();
    } else {
      state.pinError = true;
      render();
      setTimeout(() => { state.pinBuffer = ''; state.pinError = false; render(); }, 450);
    }
  }
}

function logout() {
  clearSession();
  state.activeTab = 'mine';
  state.search = '';
  state.sortBy = 'recent';
  render();
}

function switchTab(tab) { state.activeTab = tab; state.search = ''; state.sortBy = 'recent'; render(); }

function openAddSheet() {
  state.sheet = { mode: 'add', item: { title: '', description: '', price: '', url: '', image: '' }, uploading: false };
  render();
}
function openEditSheet(item) {
  state.sheet = { mode: 'edit', item: Object.assign({}, item), uploading: false };
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

// ---------- Render ----------
function itemThumb(item) {
  if (item.image) return `<div class="item-thumb"><img src="${escapeHtml(item.image)}" alt="" onerror="this.parentElement.innerHTML='🎁'"/></div>`;
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

function renderPinScreen() {
  const p = state.pinTarget;
  const dots = [0, 1, 2, 3].map((i) => {
    const filled = i < state.pinBuffer.length;
    const cls = state.pinError ? 'error' : (filled ? 'filled' : '');
    return `<div class="pin-dot ${cls}"></div>`;
  }).join('');
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
  const partnerName = PROFILES[partnerId()].name;
  const rawItems = mode === 'mine' ? myItems() : partnerItems();
  let list;
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
  const profile = PROFILES[state.session];
  return `<div class="screen-dashboard">
    <div class="dash-header"><div>
      <div class="dash-greeting">Hola, ${escapeHtml(profile.name)} ${profile.emoji}</div>
      <div class="dash-sub">${mode === 'mine' ? 'Estos son tus deseos' : `Los deseos de ${escapeHtml(partnerName)}`}</div>
    </div><button class="logout-btn" data-action="logout">⏻</button></div>
    <div class="tabs">
      <button class="tab-btn ${mode === 'mine' ? 'active' : ''}" data-action="tab" data-tab="mine">Mi lista</button>
      <button class="tab-btn ${mode === 'partner' ? 'active' : ''}" data-action="tab" data-tab="partner">${escapeHtml(partnerName)}</button>
    </div>${list}
    ${mode === 'mine' ? `<button class="fab" data-action="add">+</button>` : ''}
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

function renderSheet() {
  if (!state.sheet) return '';
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
    } else if (action === 'add') {
      elm.addEventListener('click', openAddSheet);
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
        openConfirm('¿Eliminar este deseo? No se puede deshacer.', () => deleteItem(id));
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
}

render();
