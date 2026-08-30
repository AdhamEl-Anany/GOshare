/* ===========================
   GOshare – JavaScript Utilities
   (Shared across all pages)
   =========================== */

// ── HTML Security Escaper (XSS Protection) ──
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Secure Global Logout ──
async function globalLogout(redirect = 'index.html') {
  try {
    if (typeof auth !== 'undefined' && auth) {
      await auth.signOut();
    }
  } catch (e) {
    console.warn('Signout notice:', e);
  }
  localStorage.removeItem('goshare_user');
  window.location.href = redirect;
}

// ── Toast Notifications ──
function createToastContainer() {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    c.className = 'toast-container';
    document.body.appendChild(c);
  }
  return c;
}

function showToast(message, type = 'info', duration = 3500) {
  const container = createToastContainer();
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span>${message}</span>
    <button class="toast-close" onclick="removeToast(this.parentElement)">✕</button>
  `;
  container.appendChild(toast);
  setTimeout(() => removeToast(toast), duration);
}

function removeToast(el) {
  if (!el) return;
  el.style.animation = 'slideOutRight 0.3s ease forwards';
  setTimeout(() => el.remove(), 300);
}

// ── Scroll Reveal ──
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ── Animated Counter ──
function animateCounter(el, target, duration = 2000, suffix = '') {
  const start = performance.now();
  const startVal = 0;
  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(startVal + (target - startVal) * eased);
    el.textContent = current.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function initCounters() {
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.target, 10);
        const suffix = el.dataset.suffix || '';
        animateCounter(el, target, 2000, suffix);
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-counter]').forEach(el => counterObserver.observe(el));
}

// ── Navbar Scroll ──
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

// ── Mobile Menu ──
function initMobileMenu() {
  const hamburger = document.getElementById('nav-hamburger');
  const navLinks  = document.getElementById('nav-links');
  if (!hamburger || !navLinks) return;

  hamburger.addEventListener('click', () => {
    navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
    navLinks.style.flexDirection = 'column';
    navLinks.style.position = 'absolute';
    navLinks.style.top = '70px';
    navLinks.style.left = '0';
    navLinks.style.right = '0';
    navLinks.style.background = 'rgba(4,12,6,0.98)';
    navLinks.style.padding = '20px 24px';
    navLinks.style.borderBottom = '1px solid rgba(0,200,83,0.2)';
    navLinks.style.gap = '20px';
    navLinks.style.backdropFilter = 'blur(20px)';
  });
}

// ── Particle Background ──
function initParticles(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  let animId;

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x  = Math.random() * canvas.width;
      this.y  = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = (Math.random() - 0.5) * 0.4;
      this.r  = Math.random() * 2 + 0.5;
      this.alpha = Math.random() * 0.5 + 0.1;
      this.color = Math.random() > 0.5
        ? `rgba(0,200,83,${this.alpha})`
        : `rgba(77,208,225,${this.alpha})`;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }
  }

  function init() {
    resize();
    particles = Array.from({ length: 80 }, () => new Particle());
    animate();
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,200,83,${0.08 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    animId = requestAnimationFrame(animate);
  }

  window.addEventListener('resize', () => { resize(); });
  init();
}

// ── Auth guard ──
function requireAuth(redirect = 'auth.html') {
  const user = JSON.parse(localStorage.getItem('goshare_user') || 'null');
  if (!user) { window.location.href = redirect; return null; }
  return user;
}

function getUser() {
  return JSON.parse(localStorage.getItem('goshare_user') || 'null');
}

// ── File icon helper ──
function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const map = {
    pdf: '📄', doc: '📝', docx: '📝', txt: '📃',
    xls: '📊', xlsx: '📊', csv: '📊', ppt: '📋', pptx: '📋',
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🎞️', svg: '🎨', webp: '🖼️',
    mp4: '🎬', mov: '🎬', avi: '🎬', mkv: '🎬', webm: '🎬',
    mp3: '🎵', wav: '🎵', flac: '🎵', aac: '🎵',
    zip: '🗜️', rar: '🗜️', tar: '🗜️', gz: '🗜️', '7z': '🗜️',
    js: '📦', ts: '📦', py: '🐍', html: '🌐', css: '🎨',
    exe: '⚙️', dmg: '💿', apk: '📱',
    psd: '🎨', ai: '🎨', fig: '🎨',
  };
  return map[ext] || '📁';
}

// ── Format file size ──
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ── Format date ──
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Copy to clipboard ──
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
  } catch {
    showToast('Copy failed', 'error');
  }
}

// ── Global Navbar Auth Manager ──
function initGlobalNavAuth() {
  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  const cachedUser = JSON.parse(localStorage.getItem('goshare_user') || 'null');

  // Instant render from local cache if user is logged in
  if (cachedUser) {
    renderNavLoggedIn(navActions, cachedUser.name || cachedUser.displayName || (cachedUser.email ? cachedUser.email.split('@')[0] : 'User'));
  }

  // Firebase listener confirmation
  if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged(user => {
      if (user) {
        const name = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
        const currentCache = JSON.parse(localStorage.getItem('goshare_user') || '{}');
        const updated = {
          ...currentCache,
          uid: user.uid,
          email: user.email,
          name: name
        };
        localStorage.setItem('goshare_user', JSON.stringify(updated));
        renderNavLoggedIn(navActions, name);
      } else {
        localStorage.removeItem('goshare_user');
        renderNavLoggedOut(navActions);
      }
    });
  }
}

// ── Light/Dark Theme Manager ──
function initThemeToggle() {
  const savedTheme = localStorage.getItem('goshare_theme') || 'dark';
  if (savedTheme === 'light') {
    document.documentElement.classList.add('light-mode');
    if (document.body) document.body.classList.add('light-mode');
  } else {
    document.documentElement.classList.remove('light-mode');
    if (document.body) document.body.classList.remove('light-mode');
  }
  updateThemeToggleIcon();
}

function toggleTheme() {
  const isLight = document.documentElement.classList.toggle('light-mode');
  if (document.body) document.body.classList.toggle('light-mode', isLight);
  localStorage.setItem('goshare_theme', isLight ? 'light' : 'dark');
  updateThemeToggleIcon();
  if (typeof showToast === 'function') {
    showToast(isLight ? 'Switched to Light Mode ☀️' : 'Switched to Dark Mode 🌙', 'info');
  }
}

function updateThemeToggleIcon() {
  const isLight = document.documentElement.classList.contains('light-mode');
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.innerHTML = isLight ? '☀️' : '🌙';
    btn.title = isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode';
  });
}

// ── Real-Time Currency Exchange Rate (USD to EGP) ──
let cachedEgpRate = 50.0;
async function getLiveUsdToEgpRate() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates && data.rates.EGP) {
        cachedEgpRate = parseFloat(data.rates.EGP);
        return cachedEgpRate;
      }
    }
  } catch (e) {
    console.warn('Currency exchange rate API notice:', e);
  }
  return cachedEgpRate;
}

function toggleNavUserDropdown(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('nav-user-menu');
  if (!menu) return;
  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function renderNavLoggedIn(container, name) {
  if (container.dataset.authState === 'logged-in' && container.querySelector('.nav-username')?.textContent.includes(name)) {
    updateThemeToggleIcon();
    return;
  }
  const isLight = document.body.classList.contains('light-mode');
  container.dataset.authState = 'logged-in';
  container.innerHTML = `
    <button type="button" class="btn btn-glass btn-sm theme-toggle-btn" onclick="toggleTheme()" style="padding:6px 10px;font-size:1.1rem" title="Toggle Theme">${isLight ? '☀️' : '🌙'}</button>
    <a href="dashboard.html" class="btn btn-glass btn-sm">📁 My Dashboard</a>
    <div style="position:relative;display:inline-block">
      <button type="button" class="btn btn-glass btn-sm nav-username" onclick="toggleNavUserDropdown(event)" style="font-weight:600;color:var(--green-400);display:flex;align-items:center;gap:6px">
        👤 ${escapeHTML(name)} ▾
      </button>
      <div id="nav-user-menu" style="display:none;position:absolute;right:0;top:calc(100% + 8px);background:var(--bg-card2);border:1px solid var(--glass-border);border-radius:var(--radius-md);padding:6px;min-width:210px;z-index:99999;box-shadow:var(--shadow-card)">
        <a href="dashboard.html" style="display:flex;align-items:center;gap:8px;padding:8px 12px;color:var(--text-primary);text-decoration:none;font-size:0.85rem;border-radius:var(--radius-sm)">📁 My Dashboard</a>
        <a href="pricing.html" style="display:flex;align-items:center;gap:8px;padding:8px 12px;color:var(--text-primary);text-decoration:none;font-size:0.85rem;border-radius:var(--radius-sm)">💎 Upgrade Plan</a>
        <a href="privacy.html" style="display:flex;align-items:center;gap:8px;padding:8px 12px;color:var(--text-primary);text-decoration:none;font-size:0.85rem;border-radius:var(--radius-sm)">🔒 Privacy Policy</a>
        <a href="delete-account.html" style="display:flex;align-items:center;gap:8px;padding:8px 12px;color:#ff5252;text-decoration:none;font-size:0.85rem;border-radius:var(--radius-sm);font-weight:600">⚠️ Delete Account & Data</a>
        <div style="height:1px;background:var(--bg-border);margin:4px 0"></div>
        <button type="button" onclick="globalLogout('index.html')" style="width:100%;text-align:left;display:flex;align-items:center;gap:8px;padding:8px 12px;color:#ef5350;background:none;border:none;font-size:0.85rem;cursor:pointer;border-radius:var(--radius-sm)">🚪 Logout</button>
      </div>
    </div>
    <div class="nav-hamburger" id="nav-hamburger"><span></span><span></span><span></span></div>
  `;
  initMobileMenu();
}

function renderNavLoggedOut(container) {
  if (container.dataset.authState === 'logged-out') {
    updateThemeToggleIcon();
    return;
  }
  const isLight = document.body.classList.contains('light-mode');
  container.dataset.authState = 'logged-out';
  container.innerHTML = `
    <button type="button" class="btn btn-glass btn-sm theme-toggle-btn" onclick="toggleTheme()" style="padding:6px 10px;font-size:1.1rem" title="Toggle Theme">${isLight ? '☀️' : '🌙'}</button>
    <a href="auth.html" class="btn btn-outline btn-sm">Log In</a>
    <a href="auth.html" class="btn btn-primary btn-sm">Get Started</a>
    <div class="nav-hamburger" id="nav-hamburger"><span></span><span></span><span></span></div>
  `;
  initMobileMenu();
}

// Global click listener to hide user dropdown when clicking outside
document.addEventListener('click', (e) => {
  const menu = document.getElementById('nav-user-menu');
  if (menu && !menu.contains(e.target) && !e.target.closest('.nav-username')) {
    menu.style.display = 'none';
  }
});

// Init theme immediately before render to avoid flicker
initThemeToggle();

// Init on load
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initNavbar();
  initScrollReveal();
  initCounters();
  initMobileMenu();
  initGlobalNavAuth();
});
