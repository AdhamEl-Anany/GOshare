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

function renderNavLoggedIn(container, name) {
  if (container.dataset.authState === 'logged-in' && container.querySelector('.nav-username')?.textContent.includes(name)) {
    return;
  }
  container.dataset.authState = 'logged-in';
  container.innerHTML = `
    <a href="dashboard.html" class="btn btn-glass btn-sm">📁 My Dashboard</a>
    <span class="nav-username" style="font-size:0.85rem;color:var(--green-400);font-weight:600;display:flex;align-items:center;gap:4px">👤 ${name}</span>
    <div class="nav-hamburger" id="nav-hamburger"><span></span><span></span><span></span></div>
  `;
  initMobileMenu();
}

function renderNavLoggedOut(container) {
  if (container.dataset.authState === 'logged-out') return;
  container.dataset.authState = 'logged-out';
  container.innerHTML = `
    <a href="auth.html" class="btn btn-outline btn-sm">Log In</a>
    <a href="auth.html" class="btn btn-primary btn-sm">Get Started</a>
    <div class="nav-hamburger" id="nav-hamburger"><span></span><span></span><span></span></div>
  `;
  initMobileMenu();
}

// Init on load
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initScrollReveal();
  initCounters();
  initMobileMenu();
  initGlobalNavAuth();
});
