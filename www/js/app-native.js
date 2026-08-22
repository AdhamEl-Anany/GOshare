/* ===========================
   GOshare – Native Capacitor Android Bridge
   =========================== */

window.isCapacitorApp = typeof Capacitor !== 'undefined' && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform();

document.addEventListener('DOMContentLoaded', () => {
  if (window.isCapacitorApp) {
    console.log('📱 GOshare Native Android App Mode Active');
    initAndroidBackButton();
    initAndroidStatusBar();
  }
});

// ── Android Hardware Back Button Handler ──
function initAndroidBackButton() {
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
    window.Capacitor.Plugins.App.addListener('backButton', ({ canGoBack }) => {
      const activeModal = document.querySelector('.modal-overlay.active, #nav-user-menu[style*="block"]');
      if (activeModal) {
        activeModal.classList?.remove('active');
        if (activeModal.style) activeModal.style.display = 'none';
        return;
      }

      if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || !canGoBack) {
        window.Capacitor.Plugins.App.exitApp();
      } else {
        window.history.back();
      }
    });
  }
}

// ── Android Status Bar Styling ──
function initAndroidStatusBar() {
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.StatusBar) {
    try {
      window.Capacitor.Plugins.StatusBar.setBackgroundColor({ color: '#040C06' });
    } catch (e) {}
  }
}

// ── Native Share Sheet Bridge ──
async function shareNativeUrl(title, text, url) {
  if (window.isCapacitorApp && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share) {
    try {
      await window.Capacitor.Plugins.Share.share({
        title: title || 'GOshare',
        text: text || 'Download file on GOshare:',
        url: url || window.location.href,
        dialogTitle: 'Share via GOshare'
      });
      return true;
    } catch (e) {
      console.warn('Native share dialog closed or error:', e);
    }
  }
  return false;
}
