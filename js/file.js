/* ===========================
   GOshare – File Detail Page (Firebase)
   =========================== */

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const shortId = params.get('s');

  if (!shortId) {
    showFileNotFound();
    return;
  }

  loadFileByShortId(shortId);

  // Copy link
  document.getElementById('copy-link-btn')?.addEventListener('click', () => {
    copyToClipboard(window.location.href);
  });
});

async function loadFileByShortId(shortId) {
  try {
    const file = await getFileByShortId(shortId);
    if (!file) {
      showFileNotFound();
      return;
    }

    renderFileDetail(file);

    // Download button
    document.getElementById('download-btn')?.addEventListener('click', () => {
      startDownload(file);
    });

  } catch (e) {
    console.error('Error loading file:', e);
    showFileNotFound();
  }
}

function renderFileDetail(file) {
  document.title = `${file.name} – GOshare`;

  // File icon
  const iconEl = document.getElementById('file-icon');
  if (iconEl) iconEl.textContent = getFileIcon(file.name);

  // File name
  document.querySelectorAll('[data-file-name]').forEach(el => el.textContent = file.name);

  // Meta
  const sizeEl = document.getElementById('file-size');
  if (sizeEl) sizeEl.textContent = formatSize(file.size || 0);

  const typeEl = document.getElementById('file-type');
  if (typeEl) typeEl.textContent = (file.type || 'Unknown').toUpperCase();

  const dateEl = document.getElementById('file-date');
  if (dateEl) {
    const d = file.createdAt?.toDate ? file.createdAt.toDate() : new Date(file.createdAt);
    dateEl.textContent = d.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  }

  const dlEl = document.getElementById('file-downloads');
  if (dlEl) animateCounter(dlEl, file.downloads || 0, 1500);

  // Detail section
  const sizeDetail = document.getElementById('file-size-detail');
  if (sizeDetail) sizeDetail.textContent = formatSize(file.size || 0);

  const typeDetail = document.getElementById('file-type-detail');
  if (typeDetail) typeDetail.textContent = (file.type || '—').toUpperCase();

  const dateDetail = document.getElementById('file-date-detail');
  if (dateDetail) {
    const d = file.createdAt?.toDate ? file.createdAt.toDate() : new Date(file.createdAt);
    dateDetail.textContent = d.toLocaleString();
  }

  const typeBadge = document.getElementById('file-type-badge');
  if (typeBadge) typeBadge.textContent = (file.type || '—').toUpperCase();

  // Share URL
  const shareUrlEl = document.getElementById('share-url');
  if (shareUrlEl) shareUrlEl.value = window.location.href;
}

function startDownload(file) {
  const btn = document.getElementById('download-btn');
  const progressSection = document.getElementById('download-progress');
  const progressFill    = document.getElementById('download-progress-fill');
  const progressText    = document.getElementById('download-progress-text');
  const statusText      = document.getElementById('download-status');

  if (!file.downloadUrl) {
    showToast('Download URL not available', 'error');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '⟳ Preparing…';
  if (progressSection) progressSection.style.display = 'block';

  // Increment download count in Firestore
  incrementDownloads(file.id).catch(() => {});

  // Simulate progress then redirect to actual download
  let pct = 0;
  const interval = setInterval(() => {
    pct += Math.random() * 20 + 10;
    if (pct >= 100) {
      pct = 100;
      clearInterval(interval);

      if (progressFill) progressFill.style.width = '100%';
      if (progressText) progressText.textContent = '100%';
      if (statusText)   statusText.textContent = 'Download ready!';

      // Open the actual Firebase Storage download URL
      const a = document.createElement('a');
      a.href = file.downloadUrl;
      a.target = '_blank';
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      btn.innerHTML = '✅ Downloaded!';
      btn.style.background = 'var(--grad-green)';
      showToast(`"${file.name}" download started!`, 'success');

      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '⬇️ Download Again';
        btn.style.background = '';
        if (progressSection) progressSection.style.display = 'none';
      }, 3000);
    } else {
      if (progressFill) progressFill.style.width = pct.toFixed(0) + '%';
      if (progressText) progressText.textContent = pct.toFixed(0) + '%';
      if (statusText)   statusText.textContent = `Preparing… ${formatSize(file.size * pct / 100)} / ${formatSize(file.size)}`;
    }
  }, 150);
}

function showFileNotFound() {
  const main = document.getElementById('file-main');
  if (main) main.innerHTML = `
    <div style="text-align:center;padding:80px 20px">
      <div style="font-size:4rem;margin-bottom:20px">🔍</div>
      <h2 style="font-size:1.5rem;margin-bottom:12px">File Not Found</h2>
      <p style="color:var(--text-muted);margin-bottom:28px">This file may have been deleted or the link is invalid.</p>
      <a href="index.html" class="btn btn-primary">Go Home</a>
    </div>
  `;
}
