/* ============================================================
   GGZone - Cart Management
   ============================================================ */

// Stock API URL — works from any page depth
const _STOCK_API = (() => {
  const port = parseInt(location.port, 10);
  if (port === 5500 || port === 5501 || port === 3000)
    return 'http://localhost/GG%20Project/admin/api/stock.php';
  return (location.pathname.includes('/pages/') ? '../' : '') + 'admin/api/stock.php';
})();

async function _stockAdjust(productId, delta) {
  try {
    const res = await fetch(_STOCK_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, delta }),
    });
    return await res.json();
  } catch {
    return { success: true }; // XAMPP offline — don't block cart
  }
}

const Cart = {
  KEY: 'ggzone_cart',

  getAll() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
    catch { return []; }
  },

  save(items) {
    localStorage.setItem(this.KEY, JSON.stringify(items));
    this.updateBadge();
    document.dispatchEvent(new Event('cart:updated'));
  },

  async add(product, qty = 1) {
    // Optimistic add — update cart and show toast immediately
    const items = this.getAll();
    const idx = items.findIndex(i => i.id === product.id);
    if (idx > -1) {
      items[idx].qty += qty;
    } else {
      items.push({ ...product, qty });
    }
    this.save(items);
    const addedMsg = typeof I18n !== 'undefined' ? I18n.tf('toast.addedToCart', { title: product.title }) : `"${product.title}" added to cart!`;
    showToast(addedMsg, 'success');

    // Verify stock in background — roll back if server rejects
    const result = await _stockAdjust(product.id, -qty);
    if (!result.success) {
      const rollback = this.getAll();
      const ri = rollback.findIndex(i => i.id === product.id);
      if (ri > -1) {
        rollback[ri].qty -= qty;
        if (rollback[ri].qty <= 0) rollback.splice(ri, 1);
      }
      this.save(rollback);
      const msg = result.stock === 0
        ? (typeof I18n !== 'undefined' ? I18n.tf('toast.outOfStock', { title: product.title }) : `"${product.title}" is out of stock!`)
        : (typeof I18n !== 'undefined' ? I18n.tf('toast.onlyLeft', { n: result.stock }) : `Only ${result.stock} left in stock!`);
      showToast(msg, 'error');
      return false;
    }
    return true;
  },

  remove(productId) {
    const items = this.getAll();
    const item  = items.find(i => i.id === productId);
    if (item) _stockAdjust(productId, item.qty); // return stock
    this.save(items.filter(i => i.id !== productId));
    showToast(typeof I18n !== 'undefined' ? I18n.t('toast.removed') : 'Item removed from cart', 'info');
  },

  async updateQty(productId, newQty) {
    if (newQty < 1) return this.remove(productId);
    const items = this.getAll();
    const idx   = items.findIndex(i => i.id === productId);
    if (idx === -1) return;

    const diff = newQty - items[idx].qty; // positive = adding more, negative = reducing
    if (diff !== 0) {
      const result = await _stockAdjust(productId, -diff);
      if (!result.success) {
        showToast(typeof I18n !== 'undefined' ? I18n.tf('toast.onlyAvail', { n: result.stock }) : `Only ${result.stock} available!`, 'error');
        return;
      }
    }
    items[idx].qty = newQty;
    this.save(items);
  },

  clear() {
    localStorage.removeItem(this.KEY);
    this.updateBadge();
    document.dispatchEvent(new Event('cart:updated'));
  },

  getCount() {
    return this.getAll().reduce((sum, i) => sum + i.qty, 0);
  },

  getTotal() {
    return this.getAll().reduce((sum, i) => sum + (i.salePrice || i.price) * i.qty, 0);
  },

  updateBadge() {
    const badges = document.querySelectorAll('.cart-badge');
    const count = this.getCount();
    badges.forEach(b => {
      b.textContent = count;
      b.style.display = count > 0 ? 'flex' : 'none';
    });
  }
};

/* ── Add to Cart buttons ───────────────────────────────────── */
document.querySelectorAll('.btn-cart[data-product]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const data = btn.dataset;
    Cart.add({
      id:        parseInt(data.product),
      title:     data.title,
      price:     parseFloat(data.price),
      salePrice: data.salePrice ? parseFloat(data.salePrice) : null,
      image:     data.image,
      platform:  data.platform,
    });
    btn.innerHTML = '<i class="fas fa-check"></i> ' + (typeof I18n !== 'undefined' ? I18n.t('btn.addedToCart') : 'Added!');
    btn.style.background = 'linear-gradient(135deg, #10B981, #059669)';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-shopping-cart"></i> ' + (typeof I18n !== 'undefined' ? I18n.t('btn.addToCart') : 'Add to Cart');
      btn.style.background = '';
      btn.disabled = false;
    }, 1500);
  });
});

/* ── Cart Page Rendering ───────────────────────────────────── */
function renderCart() {
  const container = document.getElementById('cart-items');
  if (!container) return;

  const items  = Cart.getAll();
  const couponDiscount = parseFloat(sessionStorage.getItem('gg_coupon_discount') || 0);

  if (items.length === 0) {
    const _t = typeof I18n !== 'undefined' ? I18n.t.bind(I18n) : k => k;
    container.innerHTML = `
      <div style="text-align:center; padding:60px 20px;">
        <i class="fas fa-shopping-cart" style="font-size:64px; color:var(--text-muted); margin-bottom:20px; display:block;"></i>
        <h3 style="font-size:22px; margin-bottom:10px;">${_t('cart.empty')}</h3>
        <p style="color:var(--text-muted); margin-bottom:24px;">${_t('cart.browseStore')}</p>
        <a href="../pages/shop.html" class="btn btn-primary">${_t('btn.shopNow')}</a>
      </div>`;
    updateSummary(0, couponDiscount);
    return;
  }

  container.innerHTML = items.map(item => {
    const price = item.salePrice || item.price;
    return `
    <div class="cart-item" data-id="${item.id}">
      <img src="${item.image || 'https://placehold.co/90x70/1e293b/94a3b8?text=GG'}" alt="${item.title}" class="cart-item-img">
      <div class="cart-item-info">
        <div class="cart-item-title">${item.title}</div>
        <div class="cart-item-platform">${item.platform || (typeof I18n !== 'undefined' ? I18n.t('cart.digitalProduct') : 'Digital Product')}</div>
      </div>
      <div class="qty-control">
        <button class="qty-btn qty-minus" onclick="Cart.updateQty(${item.id}, ${item.qty - 1}).then(renderCart);">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn qty-plus"  onclick="Cart.updateQty(${item.id}, ${item.qty + 1}).then(renderCart);">+</button>
      </div>
      <div class="cart-item-price">${Currency.format(price * item.qty)}</div>
      <button class="cart-item-remove" onclick="Cart.remove(${item.id}); renderCart();" title="Remove">
        <i class="fas fa-times"></i>
      </button>
    </div>`;
  }).join('');

  updateSummary(Cart.getTotal(), couponDiscount);
}

function updateSummary(subtotal, discount = 0) {
  const shipping = subtotal > 0 ? 0 : 0; // free shipping
  const total = Math.max(0, subtotal - discount + shipping);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('summary-subtotal', Currency.format(subtotal));
  set('summary-discount', discount > 0 ? `-${Currency.format(discount)}` : Currency.format(0));
  set('summary-shipping', typeof I18n !== 'undefined' ? I18n.t('cart.free') : 'Free');
  set('summary-total', Currency.format(total));
}

/* ── Coupon Code ───────────────────────────────────────────── */
const COUPONS = { GGZONE10: 10, SAVE20: 20, GAMING15: 15, WELCOME5: 5 };

const couponBtn = document.getElementById('apply-coupon');
if (couponBtn) {
  couponBtn.addEventListener('click', () => {
    const code = document.getElementById('coupon-input')?.value?.trim().toUpperCase();
    if (!code) return showToast(typeof I18n !== 'undefined' ? I18n.t('toast.enterCoupon') : 'Enter a coupon code', 'error');
    if (COUPONS[code]) {
      sessionStorage.setItem('gg_coupon_discount', COUPONS[code]);
      showToast(typeof I18n !== 'undefined' ? I18n.tf('toast.couponApplied', { n: COUPONS[code] }) : `Coupon applied! $${COUPONS[code]} discount`, 'success');
      renderCart();
    } else {
      showToast(typeof I18n !== 'undefined' ? I18n.t('toast.invalidCoupon') : 'Invalid coupon code', 'error');
    }
  });
}

/* ── Init ──────────────────────────────────────────────────── */
Cart.updateBadge();
renderCart();
document.addEventListener('currency:changed', renderCart);
document.addEventListener('lang:changed', renderCart);
