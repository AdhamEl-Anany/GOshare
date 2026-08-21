/* ===========================
   GOshare – Landing Page JS
   =========================== */

document.addEventListener('DOMContentLoaded', () => {
  // Init particles
  initParticles('hero-canvas');

  // Hero typing animation
  initTypingEffect();

  // Upload demo button
  const heroCta = document.getElementById('hero-upload-btn');
  if (heroCta) {
    heroCta.addEventListener('click', () => {
      const user = getUser();
      window.location.href = user ? 'dashboard.html' : 'auth.html';
    });
  }

  // Drag preview on hero
  initHeroDragPreview();
});

// ── Typing effect ──
function initTypingEffect() {
  const el = document.getElementById('typing-text');
  if (!el) return;
  const words = ['Fast', 'Secure', 'Simple', 'Reliable', 'Instant'];
  let wordIndex = 0;
  let charIndex = 0;
  let deleting = false;

  function type() {
    const word = words[wordIndex];
    if (deleting) {
      el.textContent = word.slice(0, charIndex--);
      if (charIndex < 0) { deleting = false; wordIndex = (wordIndex + 1) % words.length; setTimeout(type, 400); return; }
    } else {
      el.textContent = word.slice(0, ++charIndex);
      if (charIndex === word.length) { deleting = true; setTimeout(type, 1800); return; }
    }
    setTimeout(type, deleting ? 60 : 100);
  }
  type();
}

// ── Hero drag preview ──
function initHeroDragPreview() {
  const zone = document.getElementById('hero-drop-zone');
  if (!zone) return;

  ['dragenter', 'dragover'].forEach(evt => {
    zone.addEventListener(evt, (e) => {
      e.preventDefault();
      zone.classList.add('drag-active');
    });
  });
  ['dragleave', 'drop'].forEach(evt => {
    zone.addEventListener(evt, (e) => {
      e.preventDefault();
      zone.classList.remove('drag-active');
      if (evt === 'drop') {
        showToast('Sign in to upload files!', 'info');
        setTimeout(() => window.location.href = 'auth.html', 1000);
      }
    });
  });
}
