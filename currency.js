/* ============================================================
   GGZone - Locale: Language & Currency
   ============================================================ */

// ── Currency ──────────────────────────────────────────────────
const Currency = (() => {
  const KEY  = 'ggzone_currency';
  const RATE = 1310; // 1 USD = 1,310 IQD

  function current() {
    return localStorage.getItem(KEY) || 'USD';
  }

  function set(code) {
    localStorage.setItem(KEY, code);
    applyToDOM();
    document.dispatchEvent(new CustomEvent('currency:changed', { detail: code }));
    LocalePicker._sync();
  }

  function toggle() {
    set(current() === 'USD' ? 'IQD' : 'USD');
  }

  function format(usdAmount) {
    const amt = parseFloat(usdAmount) || 0;
    if (current() === 'IQD') {
      return 'IQD ' + Math.round(amt * RATE).toLocaleString();
    }
    return '$' + amt.toFixed(2);
  }

  function applyToDOM() {
    document.querySelectorAll('[data-usd]').forEach(el => {
      el.textContent = format(parseFloat(el.dataset.usd));
    });
  }

  return { current, set, toggle, format, applyToDOM };
})();

// ── Language ──────────────────────────────────────────────────
const Lang = (() => {
  const KEY = 'ggzone_lang';

  function current() {
    return localStorage.getItem(KEY) || 'en';
  }

  function set(code) {
    localStorage.setItem(KEY, code);
    _apply(code);
    if (typeof I18n !== 'undefined') I18n.apply();
    LocalePicker._sync();
    document.dispatchEvent(new CustomEvent('lang:changed', { detail: code }));
  }

  function _apply(code) {
    document.documentElement.lang = code;
    document.documentElement.dir  = code === 'ar' ? 'rtl' : 'ltr';
  }

  function init() {
    _apply(current());
  }

  return { current, set, init };
})();

// ── Locale Picker UI ──────────────────────────────────────────
const LocalePicker = (() => {
  const CURRENCY_LABELS = { USD: '$ USD', IQD: 'IQD ع' };
  const LANG_LABELS     = { en: 'EN', ar: 'AR' };

  function toggle(e) {
    const picker = e.currentTarget.closest('.locale-picker');
    const isOpen = picker.classList.contains('open');
    _closeAll();
    if (!isOpen) picker.classList.add('open');
  }

  function _closeAll() {
    document.querySelectorAll('.locale-picker.open').forEach(p => p.classList.remove('open'));
  }

  function setCurrency(code) {
    Currency.set(code);
  }

  function setLang(code) {
    Lang.set(code);
  }

  function _sync() {
    const lang = Lang.current();
    const cur  = Currency.current();
    document.querySelectorAll('.locale-label').forEach(el => {
      el.textContent = `${LANG_LABELS[lang] || lang.toUpperCase()} · ${CURRENCY_LABELS[cur] || cur}`;
    });
    document.querySelectorAll('.locale-option[data-lang]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    document.querySelectorAll('.locale-option[data-currency]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.currency === cur);
    });
  }

  function init() {
    Lang.init();
    Currency.applyToDOM();
    _sync();
    document.addEventListener('click', e => {
      if (!e.target.closest('.locale-picker')) _closeAll();
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  return { toggle, setCurrency, setLang, _sync };
})();
