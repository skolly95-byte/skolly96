/* ============================================================
   GGZone - Main JavaScript
   ============================================================ */

/* ── Toast Notifications ───────────────────────────────────── */
function showToast(message, type = 'success', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toast-out 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ── Navbar ────────────────────────────────────────────────── */
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });
}

const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobile-nav');
if (hamburger && mobileNav) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileNav.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !mobileNav.contains(e.target)) {
      hamburger.classList.remove('open');
      mobileNav.classList.remove('open');
    }
  });
}

/* ── Particles ─────────────────────────────────────────────── */
function initParticles() {
  const container = document.querySelector('.hero-particles');
  if (!container) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      width: ${Math.random() * 3 + 1}px;
      height: ${Math.random() * 3 + 1}px;
      animation-duration: ${Math.random() * 12 + 8}s;
      animation-delay: ${Math.random() * -10}s;
      opacity: ${Math.random() * 0.4 + 0.1};
      background: ${Math.random() > 0.5 ? '#3B82F6' : '#8B5CF6'};
    `;
    container.appendChild(p);
  }
}
initParticles();

/* ── Counter Animation ─────────────────────────────────────── */
function animateCounter(el, target, duration = 2000) {
  const start = 0;
  const startTime = performance.now();
  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(start + (target - start) * eased).toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target.toLocaleString() + (el.dataset.suffix || '');
  }
  requestAnimationFrame(update);
}

function initCounters() {
  const counters = document.querySelectorAll('[data-counter]');
  if (!counters.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.done) {
        entry.target.dataset.done = '1';
        animateCounter(entry.target, parseInt(entry.target.dataset.counter));
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(el => obs.observe(el));
}
initCounters();

/* ── Scroll Reveal ─────────────────────────────────────────── */
function initScrollReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  items.forEach(el => obs.observe(el));
}

// Add styles for reveal animation
const revealStyle = document.createElement('style');
revealStyle.textContent = `
  .reveal { opacity: 0; transform: translateY(30px); transition: opacity 0.6s ease, transform 0.6s ease; }
  .reveal.revealed { opacity: 1; transform: none; }
  .reveal-delay-1 { transition-delay: 0.1s; }
  .reveal-delay-2 { transition-delay: 0.2s; }
  .reveal-delay-3 { transition-delay: 0.3s; }
`;
document.head.appendChild(revealStyle);
initScrollReveal();

/* ── Testimonials Slider ───────────────────────────────────── */
function initSlider() {
  const track = document.querySelector('.testimonials-track');
  if (!track) return;
  const cards = track.querySelectorAll('.testimonial-card');
  const dots  = document.querySelectorAll('.slider-dot');
  let current = 0;
  const perView = window.innerWidth > 900 ? 3 : window.innerWidth > 600 ? 2 : 1;

  function goTo(idx) {
    const max = Math.max(0, cards.length - perView);
    current = Math.max(0, Math.min(idx, max));
    const cardWidth = cards[0].offsetWidth + 20;
    track.style.transform = `translateX(-${current * cardWidth}px)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  document.querySelector('.slider-prev')?.addEventListener('click', () => goTo(current - 1));
  document.querySelector('.slider-next')?.addEventListener('click', () => goTo(current + 1));
  dots.forEach((d, i) => d.addEventListener('click', () => goTo(i)));

  // Auto-play
  setInterval(() => goTo(current + 1 > cards.length - perView ? 0 : current + 1), 5000);
}
initSlider();

/* ── Gallery ───────────────────────────────────────────────── */
function initGallery() {
  const thumbs = document.querySelectorAll('.gallery-thumb');
  const mainImg = document.querySelector('.gallery-main img');
  if (!thumbs.length || !mainImg) return;
  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      thumbs.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      mainImg.src = thumb.querySelector('img').src;
    });
  });
}
initGallery();

/* ── Quantity Control ──────────────────────────────────────── */
function initQty() {
  document.querySelectorAll('.qty-control').forEach(ctrl => {
    const input = ctrl.querySelector('.qty-num');
    ctrl.querySelector('.qty-minus')?.addEventListener('click', () => {
      const val = parseInt(input.value) || 1;
      if (val > 1) input.value = val - 1;
    });
    ctrl.querySelector('.qty-plus')?.addEventListener('click', () => {
      const val = parseInt(input.value) || 1;
      input.value = val + 1;
    });
  });
}
initQty();

/* Wishlist toggle is handled by js/wishlist.js */

/* ── Modal ─────────────────────────────────────────────────── */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.add('open'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.classList.remove('open'); document.body.style.overflow = ''; }
}
document.querySelectorAll('[data-modal-open]').forEach(btn => {
  btn.addEventListener('click', () => openModal(btn.dataset.modalOpen));
});
document.querySelectorAll('[data-modal-close]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.modalClose || btn.closest('.modal-overlay').id));
});
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(overlay.id); });
});

/* ── Active Nav Link ───────────────────────────────────────── */
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-link, .mobile-nav a').forEach(link => {
  const href = link.getAttribute('href');
  if (href && href.includes(currentPage)) link.classList.add('active');
});

/* ── Search Bar ────────────────────────────────────────────── */
const navSearchInput = document.querySelector('.nav-search-bar input');
if (navSearchInput) {
  navSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && navSearchInput.value.trim()) {
      window.location.href = `pages/shop.html?search=${encodeURIComponent(navSearchInput.value.trim())}`;
    }
  });
}

/* ── Smooth Scroll ─────────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
  });
});
