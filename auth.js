/* ============================================================
   GGZone - Auth & User Management (client-side demo)
   ============================================================ */

const Auth = {
  KEY_USER:  'ggzone_user',
  KEY_TOKEN: 'ggzone_token',

  getUser()  { try { return JSON.parse(localStorage.getItem(this.KEY_USER)); } catch { return null; } },
  getToken() { return localStorage.getItem(this.KEY_TOKEN); },
  isLoggedIn() { return !!this.getToken() && !!this.getUser(); },

  login(email, password) {
    // Demo: accept any email with password length >= 6
    if (!email || password.length < 6) return false;
    const user = {
      id: 1,
      name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      email,
      role: email.includes('admin') ? 'admin' : 'user',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(email.split('@')[0])}&background=3B82F6&color=fff&bold=true`
    };
    localStorage.setItem(this.KEY_USER, JSON.stringify(user));
    localStorage.setItem(this.KEY_TOKEN, 'demo_jwt_token_' + Date.now());
    return user;
  },

  register(name, email, password) {
    if (!name || !email || password.length < 6) return false;
    const user = {
      id: Date.now(),
      name,
      email,
      role: 'user',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8B5CF6&color=fff&bold=true`
    };
    localStorage.setItem(this.KEY_USER, JSON.stringify(user));
    localStorage.setItem(this.KEY_TOKEN, 'demo_jwt_token_' + Date.now());
    return user;
  },

  logout() {
    localStorage.removeItem(this.KEY_USER);
    localStorage.removeItem(this.KEY_TOKEN);
    window.location.href = '../index.html';
  },

  updateNavUI() {
    const user = this.getUser();
    const loginLinks = document.querySelectorAll('.nav-login-link');
    const userMenus  = document.querySelectorAll('.nav-user-menu');
    const userNames  = document.querySelectorAll('.nav-user-name');

    if (user) {
      loginLinks.forEach(l => l.style.display = 'none');
      userMenus.forEach(m => m.style.display = 'flex');
      userNames.forEach(n => n.textContent = user.name.split(' ')[0]);
    } else {
      loginLinks.forEach(l => l.style.display = 'flex');
      userMenus.forEach(m => m.style.display = 'none');
    }
  }
};

/* ── Login Form ────────────────────────────────────────────── */
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email    = loginForm.querySelector('#email')?.value?.trim();
    const password = loginForm.querySelector('#password')?.value;
    const btnEl    = loginForm.querySelector('button[type=submit]');
    if (!email || !password) return showToast('Please fill in all fields', 'error');
    btnEl.disabled = true;
    btnEl.textContent = 'Signing in...';
    setTimeout(async () => {
      const user = Auth.login(email, password);
      if (user) {
        // For admin users, also get a PHP session token for API access
        if (user.role === 'admin') {
          try {
            const phpPort = [5500,5501,3000].includes(parseInt(location.port,10));
            const apiBase = phpPort ? 'http://localhost/GG%20Project/admin/api' : '../admin/api';
            const res  = await fetch(apiBase + '/login.php', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (data.success && data.token) {
              localStorage.setItem('ggzone_admin_token', data.token);
            }
          } catch { /* XAMPP not running — admin panel will redirect to PHP login */ }
        }
        showToast(`Welcome back, ${user.name}!`, 'success');
        setTimeout(() => {
          window.location.href = user.role === 'admin' ? '../pages/admin.html' : '../pages/dashboard.html';
        }, 800);
      } else {
        showToast('Invalid credentials. Password must be at least 6 characters.', 'error');
        btnEl.disabled = false;
        btnEl.textContent = 'Sign In';
      }
    }, 800);
  });
}

/* ── Register Form ─────────────────────────────────────────── */
const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name     = registerForm.querySelector('#name')?.value?.trim();
    const email    = registerForm.querySelector('#email')?.value?.trim();
    const password = registerForm.querySelector('#password')?.value;
    const confirm  = registerForm.querySelector('#confirm-password')?.value;
    const btnEl    = registerForm.querySelector('button[type=submit]');

    if (!name || !email || !password) return showToast('Please fill in all fields', 'error');
    if (password !== confirm) return showToast('Passwords do not match', 'error');
    if (password.length < 6) return showToast('Password must be at least 6 characters', 'error');

    btnEl.disabled = true;
    btnEl.textContent = 'Creating account...';
    setTimeout(() => {
      const user = Auth.register(name, email, password);
      if (user) {
        showToast(`Account created! Welcome, ${user.name}!`, 'success');
        setTimeout(() => window.location.href = '../pages/dashboard.html', 800);
      } else {
        showToast('Registration failed. Please try again.', 'error');
        btnEl.disabled = false;
        btnEl.textContent = 'Create Account';
      }
    }, 800);
  });
}

/* ── Forgot Password Form ──────────────────────────────────── */
const forgotForm = document.getElementById('forgot-form');
if (forgotForm) {
  forgotForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = forgotForm.querySelector('#email')?.value?.trim();
    if (!email) return showToast('Enter your email address', 'error');
    const btn = forgotForm.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    setTimeout(() => {
      showToast(`Password reset link sent to ${email}!`, 'success');
      btn.textContent = 'Email Sent!';
    }, 1000);
  });
}

/* ── Password Toggle ───────────────────────────────────────── */
document.querySelectorAll('.pw-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = btn.previousElementSibling;
    const icon  = btn.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'fas fa-eye-slash';
    } else {
      input.type = 'password';
      icon.className = 'fas fa-eye';
    }
  });
});

/* ── Init ──────────────────────────────────────────────────── */
Auth.updateNavUI();

// Protect dashboard/admin pages
if (window.location.pathname.includes('dashboard') && !Auth.isLoggedIn()) {
  window.location.href = '../pages/login.html';
}
if (window.location.pathname.includes('admin') && !Auth.isLoggedIn()) {
  window.location.href = '../pages/login.html';
}

// Logout buttons
document.querySelectorAll('[data-action="logout"]').forEach(btn => {
  btn.addEventListener('click', (e) => { e.preventDefault(); Auth.logout(); });
});

// Fill user info on dashboard
const user = Auth.getUser();
if (user) {
  document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = user.name);
  document.querySelectorAll('[data-user-email]').forEach(el => el.textContent = user.email);
  document.querySelectorAll('[data-user-avatar]').forEach(el => { el.src = user.avatar; el.alt = user.name; });
}
