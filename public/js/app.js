(function () {
  'use strict';

  const root = document.getElementById('app');

  const state = {
    booting: true, // true until profiles + (if session) dashboard data are loaded
    profiles: [],
    session: loadSession(), // { id, name, emoji, theme } | null
    pinTarget: null, // profile being unlocked
    pinBuffer: '',
    pinError: false,
    activeTab: 'mine', // 'mine' | 'partner'
    myItems: null, // null = not loaded yet (shows skeleton); [] = loaded, empty
    partnerItems: null,
    partnerProfile: null,
    search: '',
    sortBy: 'recent', // 'recent' | 'price-asc' | 'price-desc'
    sheet: null, // { mode: 'add'|'edit', item }
    confirm: null, // { message, onConfirm }
    toast: null,
  };

  function loadSession() {
    try {
      const raw = localStorage.getItem('wishlist_session');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveSession(profile) {
    state.session = profile;
    localStorage.setItem('wishlist_session', JSON.stringify(profile));
  }

  function clearSession() {
    state.session = null;
    localStorage.removeItem('wishlist_session');
  }

  async function api(path, options) {
    const res = await fetch('/api' + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) {
      let msg = 'Error';
      try {
        const data = await res.json();
        msg = data.error || msg;
      } catch (e) {}
      throw new Error(msg);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  function showToast(msg) {
    state.toast = msg;
    render();
    setTimeout(() => {
      state.toast = null;
      render();
    }, 1800);
  }

  // ---------- Data loading ----------
  async function loadProfiles() {
    state.profiles = await api('/profiles');
  }

  async function loadDashboardData() {
    const otherId = state.profiles.find((p) => p.id !== state.session.id)?.id;
    state.partnerProfile = state.profiles.find((p) => p.id === otherId) || null;
    const [mine, partner] = await Promise.all([
      api(`/items?owner=${state.session.id}&viewer=${state.session.id}`),
      otherId ? api(`/items?owner=${otherId}&viewer=${state.session.id}`) : Promise.resolve([]),
    ]);
    state.myItems = mine;
    state.partnerItems = partner;
    render();
  }

  function openConfirm(message, onConfirm) {
    state.confirm = { message, onConfirm };
    render();
  }

  function closeConfirm() {
    state.confirm = null;
    render();
  }

  function filterAndSortItems(items) {
    if (!items) return [];
    const q = state.search.trim().toLowerCase();
    let result = q ? items.filter((it) => it.title.toLowerCase().includes(q)) : items.slice();
    const priceValue = (it) => {
      const n = parseFloat(String(it.price).replace(/[^\d.,]/g, '').replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    };
    if (state.sortBy === 'price-asc' || state.sortBy === 'price-desc') {
      const dir = state.sortBy === 'price-asc' ? 1 : -1;
      result.sort((a, b) => {
        const pa = priceValue(a);
        const pb = priceValue(b);
        if (pa === null && pb === null) return 0;
        if (pa === null) return 1;
        if (pb === null) return -1;
        return (pa - pb) * dir;
      });
    }
    return result;
  }

  // ---------- Actions ----------
  function openPin(profile) {
    state.pinTarget = profile;
    state.pinBuffer = '';
    state.pinError = false;
    render();
  }

  function backToProfiles() {
    state.pinTarget = null;
    state.pinBuffer = '';
    state.pinError = false;
    render();
  }

  async function pressDigit(d) {
    if (state.pinBuffer.length >= 4) return;
    state.pinBuffer += d;
    render();
    if (state.pinBuffer.length === 4) {
      try {
        const res = await api('/login', {
          method: 'POST',
          body: JSON.stringify({ profileId: state.pinTarget.id, pin: state.pinBuffer }),
        });
        saveSession(res.profile);
        state.pinTarget = null;
        state.pinBuffer = '';
        state.activeTab = 'mine';
        await loadDashboardData();
      } catch (e) {
        state.pinError = true;
        render();
        setTimeout(() => {
          state.pinBuffer = '';
          state.pinError = false;
          render();
        }, 450);
      }
    }
  }

  function pressBackspace() {
    state.pinBuffer = state.pinBuffer.slice(0, -1);
    render();
  }

  function logout() {
    clearSession();
    state.activeTab = 'mine';
    state.myItems = null;
    state.partnerItems = null;
    state.search = '';
    state.sortBy = 'recent';
    render();
  }

  function switchTab(tab) {
    state.activeTab = tab;
    state.search = '';
    state.sortBy = 'recent';
    render();
  }

  function openAddSheet() {
    state.sheet = { mode: 'add', item: { title: '', description: '', price: '', url: '', image: '' }, uploading: false };
    render();
  }

  function openEditSheet(item) {
    state.sheet = { mode: 'edit', item: { ...item }, uploading: false };
    render();
  }

  function closeSheet() {
    state.sheet = null;
    render();
  }

  function syncFormFieldsToSheetItem() {
    const form = root.querySelector('#item-form');
    if (!form || !state.sheet) return;
    const fd = new FormData(form);
    state.sheet.item.title = fd.get('title') ?? state.sheet.item.title;
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
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo subir la imagen');
      }
      const data = await res.json();
      state.sheet.item.image = data.url;
    } catch (e) {
      showToast(e.message || 'No se pudo subir la imagen');
    } finally {
      state.sheet.uploading = false;
      render();
    }
  }

  function removeSheetImage() {
    syncFormFieldsToSheetItem();
    state.sheet.item.image = '';
    render();
  }

  async function saveSheet(formData) {
    try {
      if (state.sheet.mode === 'add') {
        await api('/items', {
          method: 'POST',
          body: JSON.stringify({ owner: state.session.id, requester: state.session.id, ...formData }),
        });
        showToast('¡Agregado a tu lista! 🎉');
      } else {
        await api(`/items/${state.sheet.item.id}`, {
          method: 'PUT',
          body: JSON.stringify({ requester: state.session.id, ...formData }),
        });
        showToast('Cambios guardados');
      }
      closeSheet();
      await loadDashboardData();
    } catch (e) {
      showToast(e.message || 'Ocurrió un error');
    }
  }

  async function deleteItem(id) {
    try {
      await api(`/items/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ requester: state.session.id }),
      });
      closeSheet();
      showToast('Eliminado');
      await loadDashboardData();
    } catch (e) {
      showToast(e.message || 'Ocurrió un error');
    }
  }

  async function toggleReserve(item) {
    try {
      await api(`/items/${item.id}/reserve`, {
        method: 'POST',
        body: JSON.stringify({ requester: state.session.id, reserved: !item.reserved }),
      });
      await loadDashboardData();
    } catch (e) {
      showToast(e.message || 'Ocurrió un error');
    }
  }

  // ---------- Render helpers ----------
  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function itemThumb(item) {
    if (item.image) {
      return `<div class="item-thumb"><img src="${escapeHtml(item.image)}" alt="" onerror="this.parentElement.innerHTML='🎁'"/></div>`;
    }
    return `<div class="item-thumb">🎁</div>`;
  }

  function renderItemCard(item, mode, index) {
    const meta = `
      <div class="item-meta">
        ${item.price ? `<span class="item-price">${escapeHtml(item.price)}</span>` : ''}
        ${item.url ? `<a class="item-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Ver enlace ↗</a>` : ''}
      </div>`;

    let extra = '';
    let actions = '';

    if (mode === 'mine') {
      actions = `
        <div class="item-actions">
          <button class="icon-btn" data-action="edit" data-id="${item.id}">✏️</button>
          <button class="icon-btn danger" data-action="delete" data-id="${item.id}">🗑️</button>
        </div>`;
    } else {
      if (item.reserved && item.reservedBy === state.session.id) {
        extra = `<div class="reserve-btn reserved" data-action="unreserve" data-id="${item.id}">✅ Lo vas a regalar tú</div>`;
      } else if (item.reserved) {
        extra = `<div class="reserved-by-other">🎁 Ya está reservado</div>`;
      } else {
        extra = `<button class="reserve-btn" data-action="reserve" data-id="${item.id}">🎁 Yo lo regalo</button>`;
      }
    }

    const delay = Math.min(index || 0, 8) * 0.05;
    return `
      <div class="item-card card-enter" style="animation-delay:${delay}s">
        ${itemThumb(item)}
        <div class="item-body">
          <div class="item-title">${escapeHtml(item.title)}</div>
          ${item.description ? `<div class="item-desc">${escapeHtml(item.description)}</div>` : ''}
          ${meta}
          ${extra}
        </div>
        ${actions}
      </div>`;
  }

  function themeClass(theme) {
    return theme === 'blue' ? 'theme-blue' : 'theme-pink';
  }

  // ---------- Screens ----------
  function renderLoginProfiles() {
    return `
      <div class="screen-login">
        <div class="login-title">Nuestra<br/>Wishlist 💫</div>
        <div class="login-subtitle">Elige tu perfil para entrar</div>
        <div class="profile-cards">
          ${state.profiles
            .map(
              (p) => `
            <button class="profile-card ${themeClass(p.theme)}" data-action="open-pin" data-id="${p.id}">
              <div class="profile-avatar">${p.emoji}</div>
              <div>
                <div class="profile-name">${escapeHtml(p.name)}</div>
                <div class="profile-hint">Toca para entrar</div>
              </div>
            </button>`
            )
            .join('')}
        </div>
      </div>`;
  }

  function renderPinScreen() {
    const p = state.pinTarget;
    const dots = [0, 1, 2, 3]
      .map((i) => {
        const filled = i < state.pinBuffer.length;
        const cls = state.pinError ? 'error' : filled ? 'filled' : '';
        return `<div class="pin-dot ${cls}"></div>`;
      })
      .join('');

    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];
    const keypad = keys
      .map((k) => {
        if (k === '') return `<div></div>`;
        if (k === 'back') return `<button class="pin-key ghost" data-action="pin-back">⌫</button>`;
        return `<button class="pin-key" data-action="pin-digit" data-digit="${k}">${k}</button>`;
      })
      .join('');

    return `
      <div class="screen-pin">
        <button class="pin-back" data-action="pin-cancel">‹ Volver</button>
        <div class="pin-avatar ${themeClass(p.theme)}">${p.emoji}</div>
        <div class="pin-greeting">Hola, ${escapeHtml(p.name)}</div>
        <div class="pin-instruction">Ingresa tu clave de 4 dígitos</div>
        <div class="pin-dots">${dots}</div>
        <div class="pin-keypad">${keypad}</div>
      </div>`;
  }

  function renderSkeletonList() {
    return `
      <div class="items-list">
        ${[0, 1, 2]
          .map(
            (i) => `
          <div class="item-card skeleton-card" style="animation-delay:${i * 0.08}s">
            <div class="skeleton skeleton-thumb"></div>
            <div class="item-body">
              <div class="skeleton skeleton-line" style="width:60%"></div>
              <div class="skeleton skeleton-line" style="width:85%"></div>
              <div class="skeleton skeleton-line" style="width:35%"></div>
            </div>
          </div>`
          )
          .join('')}
      </div>`;
  }

  function renderListControls(rawCount) {
    if (rawCount === 0) return '';
    const sorts = [
      { id: 'recent', label: 'Recientes' },
      { id: 'price-asc', label: 'Precio ↑' },
      { id: 'price-desc', label: 'Precio ↓' },
    ];
    return `
      <div class="list-controls">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" class="search-input" data-action="search" placeholder="Buscar en la lista..." value="${escapeHtml(state.search)}" />
        </div>
        <div class="sort-chips">
          ${sorts
            .map(
              (s) =>
                `<button class="sort-chip ${state.sortBy === s.id ? 'active' : ''}" data-action="sort" data-sort="${s.id}">${s.label}</button>`
            )
            .join('')}
        </div>
      </div>`;
  }

  function renderDashboard() {
    const mode = state.activeTab;
    const rawItems = mode === 'mine' ? state.myItems : state.partnerItems;
    const partnerName = state.partnerProfile ? state.partnerProfile.name : 'tu pareja';
    const loading = rawItems === null;

    let list;
    if (loading) {
      list = renderSkeletonList();
    } else if (rawItems.length === 0) {
      list = `<div class="empty-state">
             <div class="empty-emoji">${mode === 'mine' ? '📝' : '🎁'}</div>
             <div>${mode === 'mine' ? 'Aún no agregaste nada.<br/>Toca + para empezar.' : `${escapeHtml(partnerName)} no tiene deseos todavía.`}</div>
           </div>`;
    } else {
      const items = filterAndSortItems(rawItems);
      const cards = items.length
        ? items.map((it, i) => renderItemCard(it, mode, i)).join('')
        : `<div class="empty-state small">
             <div class="empty-emoji">🔎</div>
             <div>Nada coincide con "${escapeHtml(state.search)}"</div>
           </div>`;
      list = `${renderListControls(rawItems.length)}<div class="items-list">${cards}</div>`;
    }

    return `
      <div class="screen-dashboard">
        <div class="dash-header">
          <div>
            <div class="dash-greeting">Hola, ${escapeHtml(state.session.name)} ${state.session.emoji}</div>
            <div class="dash-sub">${mode === 'mine' ? 'Estos son tus deseos' : `Los deseos de ${escapeHtml(partnerName)}`}</div>
          </div>
          <button class="logout-btn" data-action="logout">⏻</button>
        </div>
        <div class="tabs">
          <button class="tab-btn ${mode === 'mine' ? 'active' : ''}" data-action="tab" data-tab="mine">Mi lista</button>
          <button class="tab-btn ${mode === 'partner' ? 'active' : ''}" data-action="tab" data-tab="partner">${escapeHtml(partnerName)}</button>
        </div>
        ${list}
        ${mode === 'mine' ? `<button class="fab" data-action="add">+</button>` : ''}
        <div class="bottom-nav">
          <button class="nav-item ${mode === 'mine' ? 'active' : ''}" data-action="tab" data-tab="mine">
            <span class="nav-icon">🏠</span>Mi lista
          </button>
          <button class="nav-item ${mode === 'partner' ? 'active' : ''}" data-action="tab" data-tab="partner">
            <span class="nav-icon">💌</span>${escapeHtml(partnerName)}
          </button>
          <button class="nav-item" data-action="logout">
            <span class="nav-icon">⏻</span>Salir
          </button>
        </div>
      </div>`;
  }

  function renderImageField(item, uploading) {
    if (item.image) {
      return `
        <div class="field">
          <label>Foto</label>
          <div class="image-preview">
            <img src="${escapeHtml(item.image)}" alt="" />
            <button type="button" class="image-remove" data-action="remove-image">🗑️ Quitar</button>
          </div>
        </div>`;
    }
    return `
      <div class="field">
        <label>Foto (opcional)</label>
        <label class="upload-btn ${uploading ? 'disabled' : ''}">
          ${uploading ? 'Subiendo...' : '📷 Subir foto desde tu celular'}
          <input type="file" accept="image/*" data-action="image-file" ${uploading ? 'disabled' : ''} hidden />
        </label>
        <input type="url" name="image" placeholder="o pegá un link de imagen" maxlength="1000" />
      </div>`;
  }

  function renderSheet() {
    if (!state.sheet) return '';
    const { mode, item, uploading } = state.sheet;
    return `
      <div class="sheet-overlay" data-action="sheet-overlay">
        <div class="sheet" data-stop>
          <div class="sheet-handle"></div>
          <div class="sheet-title">${mode === 'add' ? 'Nuevo deseo' : 'Editar deseo'}</div>
          <form id="item-form">
            <div class="field">
              <label>¿Qué deseas?</label>
              <input type="text" name="title" placeholder="Ej. Zapatillas rosas" value="${escapeHtml(item.title)}" required maxlength="200" />
            </div>
            <div class="field">
              <label>Descripción (opcional)</label>
              <textarea name="description" placeholder="Talla, color, detalles..." maxlength="1000">${escapeHtml(item.description)}</textarea>
            </div>
            <div class="field-row">
              <div class="field">
                <label>Precio aprox.</label>
                <input type="text" name="price" placeholder="$50.000" value="${escapeHtml(item.price)}" maxlength="50" />
              </div>
            </div>
            <div class="field">
              <label>Link de la tienda (opcional)</label>
              <input type="url" name="url" placeholder="https://..." value="${escapeHtml(item.url)}" maxlength="500" />
            </div>
            ${renderImageField(item, uploading)}
            <div class="sheet-actions">
              <button type="button" class="btn btn-secondary" data-action="sheet-cancel">Cancelar</button>
              <button type="submit" class="btn btn-primary">Guardar</button>
            </div>
            ${
              mode === 'edit'
                ? `<div class="sheet-actions" style="margin-top:10px">
                     <button type="button" class="btn btn-danger-text" data-action="sheet-delete" data-id="${item.id}">Eliminar deseo</button>
                   </div>`
                : ''
            }
          </form>
        </div>
      </div>`;
  }

  function renderBootScreen() {
    return `
      <div class="screen-boot">
        <div class="boot-spinner"></div>
      </div>`;
  }

  function renderConfirmDialog() {
    if (!state.confirm) return '';
    return `
      <div class="confirm-overlay" data-action="confirm-overlay">
        <div class="confirm-box">
          <div class="confirm-message">${escapeHtml(state.confirm.message)}</div>
          <div class="sheet-actions">
            <button type="button" class="btn btn-secondary" data-action="confirm-cancel">Cancelar</button>
            <button type="button" class="btn btn-danger-solid" data-action="confirm-yes">Eliminar</button>
          </div>
        </div>
      </div>`;
  }

  function render() {
    let html = '';

    if (state.booting) {
      html = renderBootScreen();
    } else if (!state.session) {
      html = state.pinTarget ? renderPinScreen() : renderLoginProfiles();
    } else {
      html = renderDashboard();
    }

    html += renderSheet();
    html += renderConfirmDialog();

    if (state.toast) {
      html += `<div class="toast">${escapeHtml(state.toast)}</div>`;
    }

    root.innerHTML = html;
    bindEvents();
  }

  function bindEvents() {
    root.querySelectorAll('[data-action]').forEach((elm) => {
      const action = elm.getAttribute('data-action');
      if (action === 'open-pin') {
        elm.addEventListener('click', () => {
          const profile = state.profiles.find((p) => p.id === elm.getAttribute('data-id'));
          openPin(profile);
        });
      } else if (action === 'pin-cancel' || action === 'pin-back') {
        elm.addEventListener('click', backToProfiles);
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
          const item = state.myItems.find((i) => i.id === elm.getAttribute('data-id'));
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
          const newInput = root.querySelector('[data-action="search"]');
          if (newInput) {
            newInput.focus();
            newInput.setSelectionRange(cursorPos, cursorPos);
          }
        });
      } else if (action === 'sort') {
        elm.addEventListener('click', () => {
          state.sortBy = elm.getAttribute('data-sort');
          render();
        });
      } else if (action === 'reserve') {
        elm.addEventListener('click', () => {
          const item = state.partnerItems.find((i) => i.id === elm.getAttribute('data-id'));
          if (item) toggleReserve(item);
        });
      } else if (action === 'unreserve') {
        elm.addEventListener('click', () => {
          const item = state.partnerItems.find((i) => i.id === elm.getAttribute('data-id'));
          if (item) toggleReserve(item);
        });
      } else if (action === 'sheet-cancel') {
        elm.addEventListener('click', closeSheet);
      } else if (action === 'sheet-overlay') {
        elm.addEventListener('click', (evt) => {
          if (evt.target === elm) closeSheet();
        });
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

  // ---------- Init ----------
  async function init() {
    render(); // shows boot spinner immediately
    await loadProfiles();
    if (state.session) {
      const stillValid = state.profiles.some((p) => p.id === state.session.id);
      if (stillValid) {
        await loadDashboardData();
        state.booting = false;
        render();
        return;
      }
      clearSession();
    }
    state.booting = false;
    render();
  }

  init();
})();
