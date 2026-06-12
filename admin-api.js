/* ============================================================
   GGZone Admin API Bridge
   Requires XAMPP running with the ggzone database imported.
   Access the admin page via XAMPP (http://localhost/...), not Live Server.
   ============================================================ */
'use strict';

// If you're on Live Server (port 5500), update this to your XAMPP path
const ADMIN_API = (() => {
  const port = parseInt(location.port, 10);
  if (port === 5500 || port === 5501 || port === 3000) {
    // Change 'GG%20Project' to match your XAMPP htdocs folder name
    return 'http://localhost/GG%20Project/admin/api';
  }
  return '../admin/api';
})();

/* ── Token ──────────────────────────────────────────────────── */
const TOKEN_KEY = 'ggzone_admin_token';
const getToken  = ()  => localStorage.getItem(TOKEN_KEY) || '';
const setToken  = (t) => localStorage.setItem(TOKEN_KEY, t);
const clearToken = () => localStorage.removeItem(TOKEN_KEY);

/* ── Auth guard ─────────────────────────────────────────────── */
if (!getToken()) {
  window.location.replace('../admin/index.php');
}

/* ── Logout ─────────────────────────────────────────────────── */
document.querySelectorAll('[data-action="logout"]').forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    clearToken();
    localStorage.removeItem('ggzone_user');
    localStorage.removeItem('ggzone_token');
    window.location.href = '../admin/index.php';
  });
});

/* ── HTTP helper ────────────────────────────────────────────── */
async function apiCall(method, endpoint, params = {}, body = null) {
  try {
    const url = new URL(ADMIN_API + '/' + endpoint, location.href);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) url.searchParams.set(k, v);
    });
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getToken(),
      },
    };
    if (body !== null) opts.body = JSON.stringify(body);
    const res = await fetch(url.toString(), opts);
    if (res.status === 401) {
      clearToken();
      showToast('Session expired. Redirecting to login...', 'error');
      setTimeout(() => window.location.href = '../admin/index.php', 1500);
      return null;
    }
    return await res.json();
  } catch {
    showToast('Connection error — is XAMPP running?', 'error');
    return null;
  }
}

const api = {
  get:  (ep, params) => apiCall('GET',    ep, params),
  post: (ep, body)   => apiCall('POST',   ep, {}, body),
  put:  (ep, body)   => apiCall('PUT',    ep, {}, body),
  del:  (ep, params) => apiCall('DELETE', ep, params),
};

/* ── Panel state ────────────────────────────────────────────── */
let productsPage = 1, productSearch = '', productCategory = '';
let ordersPage   = 1, orderSearch   = '', orderStatus     = '';

/* ============================================================
   DASHBOARD
   ============================================================ */
async function loadDashboard() {
  const d = await api.get('stats.php');
  if (!d || !d.success) return;

  const s = d.stats;

  // Stat counters
  const setCounter = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.dataset.counter = val;
    el.dataset.done = '';
    animateCounter(el, parseFloat(val));
  };
  setCounter('stat-orders',   s.total_orders);
  setCounter('stat-revenue',  s.total_revenue);
  setCounter('stat-users',    s.total_users);
  setCounter('stat-products', s.total_products);

  // Change % labels
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText('stat-order-change',   (s.order_pct >= 0 ? '↑ +' : '↓ ') + Math.abs(s.order_pct) + '% this month');
  setText('stat-revenue-change', (s.revenue_pct >= 0 ? '↑ +' : '↓ ') + Math.abs(s.revenue_pct) + '% this month');
  setText('stat-users-change',   '↑ +' + s.new_users_week + ' this week');

  // Update order filter button counts
  updateOrderFilterCounts(s);

  // Revenue chart
  if (d.chart && d.chart.length) {
    const max = Math.max(...d.chart.map(c => c.revenue)) || 1;
    const bars = document.querySelectorAll('#revenue-chart .chart-col');
    d.chart.forEach((c, i) => {
      if (!bars[i]) return;
      const bar   = bars[i].querySelector('.chart-bar-inner');
      const label = bars[i].querySelector('.chart-label');
      if (bar)   bar.style.height = Math.max(4, Math.round((c.revenue / max) * 100)) + '%';
      if (label) label.textContent = c.label;
    });
  }

  // Top categories
  if (d.top_categories && d.top_categories.length) {
    const container = document.getElementById('top-categories');
    if (container) {
      container.innerHTML = d.top_categories.map(c => `
        <div>
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;">
            <span>${escHtml(c.name)}</span><span>${c.pct}%</span>
          </div>
          <div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">
            <div style="width:${c.pct}%;height:100%;background:linear-gradient(90deg,var(--blue),var(--purple));border-radius:3px;"></div>
          </div>
        </div>`).join('');
    }
  }

  // Recent orders table
  if (d.recent_orders) {
    renderRecentOrders(d.recent_orders);
  }
}

function renderRecentOrders(orders) {
  const tbody = document.getElementById('recent-orders-tbody');
  if (!tbody) return;
  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">No orders yet</td></tr>';
    return;
  }
  tbody.innerHTML = orders.slice(0, 5).map(o => `
    <tr>
      <td style="font-family:var(--font-gaming);color:var(--blue);">${escHtml(o.order_number)}</td>
      <td>
        <div style="font-weight:500;">${escHtml(o.customer_name)}</div>
        <div style="font-size:12px;color:var(--text-muted);">${escHtml(o.customer_email)}</div>
      </td>
      <td>${escHtml(o.products || '—')}</td>
      <td style="font-weight:600;">$${parseFloat(o.total).toFixed(2)}</td>
      <td style="color:var(--text-muted);">${formatDate(o.created_at)}</td>
      <td><span class="status-badge status-${o.status}">${o.status}</span></td>
      <td>
        <div class="admin-actions">
          <button class="admin-action view" onclick="showPanel('orders',null)" title="View Orders"><i class="fas fa-eye"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

/* ============================================================
   PRODUCTS
   ============================================================ */
async function loadProducts() {
  const tbody = document.getElementById('products-tbody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

  const d = await api.get('products.php', {
    page: productsPage, search: productSearch, category: productCategory, limit: 15,
  });
  if (!d || !d.success) return;

  renderProducts(d.products);
  renderPagination('products-pagination', d.page, d.pages, (p) => {
    productsPage = p; loadProducts();
  });

  const countEl = document.getElementById('products-count');
  if (countEl) countEl.textContent = `All Products (${d.total})`;
}

function renderProducts(products) {
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;
  if (!products.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;">No products found</td></tr>';
    return;
  }
  tbody.innerHTML = products.map(p => `
    <tr>
      <td>
        <img src="${escHtml(p.image_url || 'https://via.placeholder.com/80x80/1e293b/3B82F6?text=IMG')}"
             class="product-thumb" alt="" onerror="this.src='https://via.placeholder.com/80x80/1e293b/3B82F6?text=IMG'" />
      </td>
      <td>
        <div style="font-weight:600;">${escHtml(p.title)}</div>
        <div style="font-size:12px;color:var(--text-muted);">${escHtml(p.sku || 'No SKU')}</div>
      </td>
      <td>${escHtml(p.category_name || '—')}</td>
      <td style="font-weight:600;">$${parseFloat(p.price).toFixed(2)}</td>
      <td>${p.stock >= 999990 ? '∞' : p.stock}</td>
      <td>${p.sales_count || 0}</td>
      <td><span class="status-badge ${p.status === 'active' ? 'status-completed' : 'status-processing'}">${p.status}</span></td>
      <td>
        <div class="admin-actions">
          <button class="admin-action edit" onclick='openEditProduct(${JSON.stringify(p)})' title="Edit"><i class="fas fa-edit"></i></button>
          <button class="admin-action delete" onclick="deleteProduct(${p.id},'${escHtml(p.title).replace(/'/g,"\\'")}')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

async function deleteProduct(id, title) {
  if (!confirm(`Delete "${title}"?\nThis cannot be undone.`)) return;
  const d = await api.del('products.php', { id });
  if (d && d.success) {
    showToast('Product deleted', 'success');
    loadProducts();
  } else {
    showToast(d?.error || 'Delete failed', 'error');
  }
}

/* ── Add / Edit Product Modal ───────────────────────────────── */
let _editingProductId = null;

async function openAddProduct() {
  _editingProductId = null;
  document.getElementById('product-modal-title').textContent = 'Add New Product';
  document.getElementById('product-form').reset();
  document.getElementById('product-id-field').value = '';
  await populateCategoryDropdown('product-category-id');
  openModal('product-modal');
}

async function openEditProduct(p) {
  _editingProductId = p.id;
  document.getElementById('product-modal-title').textContent = 'Edit Product';
  document.getElementById('product-id-field').value = p.id;
  await populateCategoryDropdown('product-category-id', p.category_id);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
  set('pf-title',       p.title);
  set('pf-platform',    p.platform);
  set('pf-price',       p.price);
  set('pf-sale-price',  p.sale_price || '');
  set('pf-stock',       p.stock >= 999990 ? '' : p.stock);
  set('pf-sku',         p.sku);
  set('pf-image',       p.image_url);
  set('pf-badge',       p.badge || '');
  set('pf-status',      p.status);
  set('pf-description', p.description);
  const featEl = document.getElementById('pf-featured');
  if (featEl) featEl.checked = !!p.featured;
  openModal('product-modal');
}

async function populateCategoryDropdown(selectId, selectedId = null) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const d = await api.get('categories.php');
  if (!d || !d.success) return;
  sel.innerHTML = '<option value="">Select category...</option>' +
    d.categories.map(c =>
      `<option value="${c.id}" ${parseInt(selectedId) === c.id ? 'selected' : ''}>${escHtml(c.name)}</option>`
    ).join('');
}

async function submitProductForm(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  const get = (id) => document.getElementById(id)?.value?.trim() ?? '';
  const data = {
    title:       get('pf-title'),
    platform:    get('pf-platform'),
    price:       parseFloat(get('pf-price')) || 0,
    sale_price:  get('pf-sale-price') ? parseFloat(get('pf-sale-price')) : null,
    stock:       get('pf-stock') ? parseInt(get('pf-stock')) : 999999,
    sku:         get('pf-sku'),
    image_url:   get('pf-image'),
    badge:       get('pf-badge'),
    status:      get('pf-status') || 'active',
    description: get('pf-description'),
    category_id: parseInt(document.getElementById('product-category-id')?.value) || null,
    featured:    document.getElementById('pf-featured')?.checked ? 1 : 0,
  };

  const isEdit = !!_editingProductId;
  if (isEdit) data.id = _editingProductId;

  const d = isEdit ? await api.put('products.php', data) : await api.post('products.php', data);

  btn.disabled = false;
  btn.innerHTML = isEdit ? '<i class="fas fa-save"></i> Save Changes' : '<i class="fas fa-plus"></i> Add Product';

  if (d && d.success) {
    showToast(isEdit ? 'Product updated!' : 'Product added!', 'success');
    closeModal('product-modal');
    loadProducts();
  } else {
    showToast(d?.error || 'Save failed', 'error');
  }
}

/* ============================================================
   ORDERS
   ============================================================ */
async function loadOrders() {
  const tbody = document.getElementById('orders-tbody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

  const d = await api.get('orders.php', {
    page: ordersPage, search: orderSearch, status: orderStatus, limit: 15,
  });
  if (!d || !d.success) return;

  renderOrders(d.orders);
  renderPagination('orders-pagination', d.page, d.pages, (p) => {
    ordersPage = p; loadOrders();
  });
}

function renderOrders(orders) {
  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;
  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px;">No orders found</td></tr>';
    return;
  }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><input type="checkbox" style="accent-color:var(--blue);" /></td>
      <td style="font-family:var(--font-gaming);color:var(--blue);">${escHtml(o.order_number)}</td>
      <td>${escHtml(o.customer_name)}</td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(o.products || '—')}</td>
      <td style="font-weight:600;">$${parseFloat(o.total).toFixed(2)}</td>
      <td style="color:var(--text-muted);">${formatDate(o.created_at)}</td>
      <td>
        <select onchange="updateOrderStatus(${o.id}, this.value)"
                style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);color:#93C5FD;padding:4px 8px;border-radius:4px;font-size:12px;outline:none;">
          ${['pending','processing','completed','cancelled'].map(s =>
            `<option value="${s}" ${o.status === s ? 'selected' : ''}>${capitalize(s)}</option>`
          ).join('')}
        </select>
      </td>
      <td>
        <div class="admin-actions">
          <button class="admin-action delete" onclick="deleteOrder(${o.id},'${escHtml(o.order_number)}')" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

async function updateOrderStatus(id, status) {
  const d = await api.put('orders.php', { id, status });
  if (d && d.success) {
    showToast('Order status updated!', 'success');
  } else {
    showToast(d?.error || 'Update failed', 'error');
    loadOrders();
  }
}

async function deleteOrder(id, number) {
  if (!confirm(`Delete order ${number}?\nThis cannot be undone.`)) return;
  const d = await api.del('orders.php', { id });
  if (d && d.success) {
    showToast('Order deleted', 'success');
    loadOrders();
  } else {
    showToast(d?.error || 'Delete failed', 'error');
  }
}

function updateOrderFilterCounts(stats) {
  const map = {
    'filter-all':        (stats.total_orders || 0),
    'filter-pending':    (stats.pending      || 0),
    'filter-processing': (stats.processing   || 0),
    'filter-completed':  (stats.completed    || 0),
    'filter-cancelled':  (stats.cancelled    || 0),
  };
  Object.entries(map).forEach(([id, count]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = el.textContent.replace(/\(.*\)/, `(${count})`);
  });
}

/* ── Order filter tabs ──────────────────────────────────────── */
function filterOrdersByStatus(status, btn) {
  orderStatus = status;
  ordersPage  = 1;
  document.querySelectorAll('#orders-filter-bar .btn').forEach(b => b.className = 'btn btn-ghost btn-sm');
  btn.className = 'btn btn-primary btn-sm';
  loadOrders();
}

/* ============================================================
   PAGINATION
   ============================================================ */
function renderPagination(containerId, page, pages, onPageChange) {
  const el = document.getElementById(containerId);
  if (!el || pages <= 1) { if (el) el.innerHTML = ''; return; }
  const prev = page > 1;
  const next = page < pages;
  el.innerHTML = `
    <div class="pagination" style="justify-content:flex-end;margin-top:0;">
      <button class="page-btn ${prev ? '' : 'disabled'}" onclick="${prev ? `(${onPageChange.toString()})(${page - 1})` : ''}" ${prev ? '' : 'disabled'}><i class="fas fa-chevron-left"></i></button>
      ${Array.from({length: Math.min(pages, 5)}, (_, i) => {
        const p = i + 1;
        return `<button class="page-btn ${p === page ? 'active' : ''}" onclick="(${onPageChange.toString()})(${p})">${p}</button>`;
      }).join('')}
      ${pages > 5 ? `<span style="color:var(--text-muted);padding:0 6px;">...</span><button class="page-btn ${page === pages ? 'active' : ''}" onclick="(${onPageChange.toString()})(${pages})">${pages}</button>` : ''}
      <button class="page-btn ${next ? '' : 'disabled'}" onclick="${next ? `(${onPageChange.toString()})(${page + 1})` : ''}" ${next ? '' : 'disabled'}><i class="fas fa-chevron-right"></i></button>
    </div>`;
}

/* ============================================================
   UTILITIES
   ============================================================ */
function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ── Debounce for search inputs ─────────────────────────────── */
function debounce(fn, ms = 350) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ============================================================
   PANEL LOADER — called from showPanel()
   ============================================================ */
const _panelLoaded = {};

function loadPanel(name) {
  if (name === 'dashboard' && !_panelLoaded.dashboard) {
    _panelLoaded.dashboard = true;
    loadDashboard();
  }
  if (name === 'products' && !_panelLoaded.products) {
    _panelLoaded.products = true;
    loadCategoryFilterDropdown();
    loadProducts();
  }
  if (name === 'orders') {
    _panelLoaded.orders = true;
    loadOrders(); // always reload so new orders appear
  }
}

async function loadCategoryFilterDropdown() {
  const sel = document.getElementById('product-category-filter');
  if (!sel) return;
  const d = await api.get('categories.php');
  if (!d || !d.success) return;
  sel.innerHTML = '<option value="">All Categories</option>' +
    d.categories.map(c => `<option value="${c.slug}">${escHtml(c.name)}</option>`).join('');
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Dashboard loads on page open
  loadPanel('dashboard');

  // Product search
  const pSearch = document.getElementById('product-search');
  if (pSearch) {
    pSearch.addEventListener('input', debounce(() => {
      productSearch = pSearch.value.trim();
      productsPage  = 1;
      loadProducts();
    }));
  }

  // Product category filter
  const pCat = document.getElementById('product-category-filter');
  if (pCat) {
    pCat.addEventListener('change', () => {
      productCategory = pCat.value;
      productsPage    = 1;
      loadProducts();
    });
  }

  // Order search
  const oSearch = document.getElementById('order-search');
  if (oSearch) {
    oSearch.addEventListener('input', debounce(() => {
      orderSearch  = oSearch.value.trim();
      ordersPage   = 1;
      loadOrders();
    }));
  }

  // Product form submit (shared add/edit modal)
  const pForm = document.getElementById('product-form');
  if (pForm) pForm.addEventListener('submit', submitProductForm);
});
