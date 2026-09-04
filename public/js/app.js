(function () {
  'use strict';

  const root = document.getElementById('app');

  const state = {
    profiles: [],
    session: loadSession(), // { id, name, emoji, theme } | null
    pinTarget: null, // profile being unlocked
    pinBuffer: '',
    pinError: false,
    activeTab: 'mine', // 'mine' | 'partner'
    myItems: [],
    partnerItems: [],
    partnerProfile: null,
    sheet: null, // { mode: 'add'|'edit', item }
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
    state.myItems = [];
    state.partnerItems = [];
    render();
  }

  function switchTab(tab) {
    state.activeTab = tab;
    render();
  }

  function openAddSheet() {
    state.sheet = { mode: 'add', item: { title: '', description: '', price: '', url: '', image: '' } };
    render();
  }

  function openEditSheet(item) {
    state.sheet = { mode: 'edit', item: { ...item } };
    render();
  }

  function closeSheet() {
    state.sheet = null;
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

  function renderItemCard(item, mode) {
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

    return `
      <div class="item-card">
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

  function renderDashboard() {
    const mode = state.activeTab;
    const items = mode === 'mine' ? state.myItems : state.partnerItems;
    const partnerName = state.partnerProfile ? state.partnerProfile.name : 'tu pareja';

    const list =
      items.length === 0
        ? `<div class="empty-state">
             <div class="empty-emoji">${mode === 'mine' ? '📝' : '🎁'}</div>
             <div>${mode === 'mine' ? 'Aún no agregaste nada.<br/>Toca + para empezar.' : `${escapeHtml(partnerName)} no tiene deseos todavía.`}</div>
           </div>`
        : `<div class="items-list">${items.map((it) => renderItemCard(it, mode)).join('')}</div>`;

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

  function renderSheet() {
    if (!state.sheet) return '';
    const { mode, item } = state.sheet;
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
            <div class="field">
              <label>Imagen (URL, opcional)</label>
              <input type="url" name="image" placeholder="https://..." value="${escapeHtml(item.image)}" maxlength="1000" />
            </div>
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

  function render() {
    let html = '';

    if (!state.session) {
      html = state.pinTarget ? renderPinScreen() : renderLoginProfiles();
    } else {
      html = renderDashboard();
    }

    html += renderSheet();

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
          if (confirm('¿Eliminar este deseo?')) deleteItem(elm.getAttribute('data-id'));
        });
      } else if (action === 'sheet-delete') {
        elm.addEventListener('click', () => {
          if (confirm('¿Eliminar este deseo?')) deleteItem(elm.getAttribute('data-id'));
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
      }
    });

    const form = root.querySelector('#item-form');
    if (form) {
      form.addEventListener('submit', (evt) => {
        evt.preventDefault();
        const fd = new FormData(form);
        saveSheet({
          title: fd.get('title'),
          description: fd.get('description'),
          price: fd.get('price'),
          url: fd.get('url'),
          image: fd.get('image'),
        });
      });
    }
  }

  // ---------- Init ----------
  async function init() {
    root.innerHTML = '';
    await loadProfiles();
    if (state.session) {
      const stillValid = state.profiles.some((p) => p.id === state.session.id);
      if (stillValid) {
        await loadDashboardData();
        return;
      }
      clearSession();
    }
    render();
  }

  init();
})();
