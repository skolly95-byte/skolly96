/* ============================================================
   GGZone — Live Search Dropdown
   Attaches to .nav-search-bar input on every page.
   Fetches products from the API as the user types, shows a
   styled dropdown with results, and navigates on selection.
   ============================================================ */

const LiveSearch = (() => {
  let _input    = null;
  let _dropdown = null;
  let _timer    = null;
  let _active   = -1; // keyboard-focused index

  // ── API URL ────────────────────────────────────────────────
  function _apiBase() {
    const port = parseInt(location.port, 10);
    if (port === 5500 || port === 5501 || port === 3000)
      return 'http://localhost/GG%20Project/admin/api/products.php';
    const inPages = location.pathname.toLowerCase().includes('/pages/');
    return (inPages ? '../' : '') + 'admin/api/products.php';
  }

  // ── Shop URL (for "View all" and Enter key) ────────────────
  function _shopUrl(q) {
    const inPages = location.pathname.toLowerCase().includes('/pages/');
    return (inPages ? '' : 'pages/') + 'shop.html?search=' + encodeURIComponent(q);
  }

  // ── Product page URL ───────────────────────────────────────
  function _productUrl(id) {
    const inPages = location.pathname.toLowerCase().includes('/pages/');
    return (inPages ? '' : 'pages/') + 'product.html?id=' + id;
  }

  // ── Debounced fetch ────────────────────────────────────────
  function _onInput() {
    clearTimeout(_timer);
    const q = _input.value.trim();
    if (q.length < 1) { _hide(); return; }
    _timer = setTimeout(() => _search(q), 220);
  }

  async function _search(q) {
    _setActive(-1);
    _showLoading();
    try {
      // Fetch a wider set then filter to starts-with on the client
      const res  = await fetch(`${_apiBase()}?search=${encodeURIComponent(q)}&limit=50`);
      const data = await res.json();
      const lower = q.toLowerCase();
      const matched = data.success && data.products
        ? data.products.filter(p => p.title.toLowerCase().startsWith(lower))
        : [];
      if (matched.length) {
        _render(matched.slice(0, 7), q, matched.length > 7);
      } else {
        _showEmpty(q);
      }
    } catch {
      _hide();
    }
  }

  // ── Render results ─────────────────────────────────────────
  function _esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Only highlight the matched prefix, not every occurrence
  function _highlight(text, q) {
    return '<mark>' + _esc(text.slice(0, q.length)) + '</mark>' + _esc(text.slice(q.length));
  }

  function _render(products, q, hasMore = false) {
    const items = products.map((p, i) => {
      const price   = (p.sale_price && parseFloat(p.sale_price) > 0) ? parseFloat(p.sale_price) : parseFloat(p.price);
      const hasOrig = p.sale_price && parseFloat(p.sale_price) > 0 && parseFloat(p.sale_price) < parseFloat(p.price);
      const priceHtml = hasOrig
        ? `<span class="sr-price sr-sale">$${price.toFixed(2)}</span> <span class="sr-orig">$${parseFloat(p.price).toFixed(2)}</span>`
        : `<span class="sr-price">$${price.toFixed(2)}</span>`;
      const img     = _esc(p.image_url || '');
      const imgHtml = img
        ? `<img class="sr-img" src="${img}" alt="" loading="lazy" onerror="this.style.display='none'" />`
        : `<div class="sr-img sr-img-placeholder"><i class="fas fa-gamepad"></i></div>`;
      const platform = _esc(p.platform || p.category_name || '');
      const badge    = p.badge ? `<span class="sr-badge sr-badge-${_esc(p.badge)}">${_esc(p.badge.toUpperCase())}</span>` : '';

      return `<a class="sr-item" href="${_productUrl(p.id)}" data-idx="${i}">
        ${imgHtml}
        <div class="sr-info">
          <div class="sr-title">${_highlight(p.title, q)} ${badge}</div>
          <div class="sr-meta">${platform ? `<span class="sr-platform">${platform}</span>` : ''} ${priceHtml}</div>
        </div>
      </a>`;
    }).join('');

    const count = `<div class="sr-count">${products.length}${hasMore ? '+' : ''} result${products.length !== 1 ? 's' : ''}</div>`;
    const viewAll = `<a class="sr-view-all" href="${_shopUrl(q)}">
      <i class="fas fa-search"></i> See all products starting with <strong>"${_esc(q)}"</strong>
      ${hasMore ? '<span class="sr-more">+more</span>' : ''}
    </a>`;

    _dropdown.innerHTML = count + `<div class="sr-list">${items}</div>` + viewAll;
    _dropdown.style.display = 'block';
  }

  function _showLoading() {
    _dropdown.innerHTML = `<div class="sr-state"><i class="fas fa-spinner fa-spin"></i> Searching…</div>`;
    _dropdown.style.display = 'block';
  }

  function _showEmpty(q) {
    _dropdown.innerHTML = `
      <div class="sr-state sr-empty">
        <i class="fas fa-search"></i>
        <span>No results for <strong>"${_esc(q)}"</strong></span>
      </div>
      <a class="sr-view-all" href="${_shopUrl(q)}">
        <i class="fas fa-store"></i> Browse all products
      </a>`;
    _dropdown.style.display = 'block';
  }

  function _hide() {
    if (_dropdown) { _dropdown.style.display = 'none'; _dropdown.innerHTML = ''; }
    _setActive(-1);
  }

  // ── Keyboard navigation ────────────────────────────────────
  function _setActive(idx) {
    _active = idx;
    if (!_dropdown) return;
    _dropdown.querySelectorAll('.sr-item').forEach((el, i) => {
      el.classList.toggle('sr-item-active', i === idx);
    });
  }

  function _onKeydown(e) {
    const items = _dropdown ? [..._dropdown.querySelectorAll('.sr-item')] : [];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _setActive(Math.min(_active + 1, items.length - 1));
      if (items[_active]) items[_active].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _setActive(Math.max(_active - 1, -1));
      if (_active >= 0 && items[_active]) items[_active].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (_active >= 0 && items[_active]) {
        window.location.href = items[_active].href;
      } else {
        const q = _input.value.trim();
        if (q) window.location.href = _shopUrl(q);
      }
    } else if (e.key === 'Escape') {
      _hide();
      _input.blur();
    }
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    const bar = document.querySelector('.nav-search-bar');
    if (!bar) return;

    const input = bar.querySelector('input');
    if (!input) return;
    _input = input;

    // Ensure parent is positioned for absolute dropdown
    bar.style.position = 'relative';

    // Create dropdown container
    const dd = document.createElement('div');
    dd.className = 'search-dropdown';
    dd.style.display = 'none';
    bar.appendChild(dd);
    _dropdown = dd;

    // Wire events
    input.addEventListener('input',   _onInput);
    input.addEventListener('keydown', _onKeydown);
    input.addEventListener('focus', () => {
      if (input.value.trim().length >= 1) _onInput();
    });

    // Close on outside click
    document.addEventListener('click', e => {
      if (!bar.contains(e.target)) _hide();
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  return { hide: _hide };
})();
