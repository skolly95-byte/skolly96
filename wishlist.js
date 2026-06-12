const Wishlist = (() => {
  const KEY = 'ggzone_wishlist';

  function getAll() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]').map(Number); }
    catch { return []; }
  }

  function save(ids) { localStorage.setItem(KEY, JSON.stringify(ids)); }

  function has(id) { return getAll().includes(Number(id)); }

  function toggle(id) {
    id = Number(id);
    const ids = getAll();
    const idx = ids.indexOf(id);
    if (idx > -1) { ids.splice(idx, 1); save(ids); return false; }
    ids.push(id); save(ids); return true;
  }

  function _apply(btn, wished) {
    const icon = btn.querySelector('i');
    if (icon) { icon.classList.toggle('fas', wished); icon.classList.toggle('far', !wished); }
    btn.classList.toggle('wishlisted', wished);
  }

  function click(btn) {
    const id = btn.dataset.wishId;
    if (!id) return;
    const added = toggle(id);
    _apply(btn, added);
    const addMsg    = typeof I18n !== 'undefined' ? I18n.t('toast.addedWishlist')   : 'Added to wishlist!';
    const removeMsg = typeof I18n !== 'undefined' ? I18n.t('toast.wishlistUpdated') : 'Removed from wishlist';
    if (typeof showToast !== 'undefined') showToast(added ? addMsg : removeMsg, added ? 'success' : 'info');
  }

  function restoreAll() {
    document.querySelectorAll('[data-wish-id]').forEach(btn => _apply(btn, has(btn.dataset.wishId)));
  }

  return { getAll, has, toggle, click, restoreAll };
})();
