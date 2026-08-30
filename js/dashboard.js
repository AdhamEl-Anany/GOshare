/* ===========================
   GOshare – Dashboard Logic (Firebase)
   =========================== */

let currentUser = null;
let currentUserDoc = null;
let currentView = 'grid';
let selectedFiles = new Set();
let allFiles = [];
let currentSort = 'date-desc';
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  // Auth guard — wait for Firebase to resolve
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = 'auth.html';
      return;
    }

    currentUser = user;

    // Load user doc from Firestore
    currentUserDoc = await getUserDoc(user.uid);
    if (!currentUserDoc) {
      // Create user doc if missing (edge case)
      await createUserDoc(user.uid, {
        name: user.displayName || 'User',
        email: user.email,
        plan: 'free',
        role: 'user'
      });
      currentUserDoc = await getUserDoc(user.uid);
    }

    renderUserInfo(currentUserDoc);
    await loadFiles();
    renderStats();
    renderFiles();

    // Populate Referral Link
    const refInput = document.getElementById('referral-link-input');
    if (refInput) {
      const baseUrl = window.location.origin + window.location.pathname.replace('dashboard.html', 'auth.html');
      refInput.value = `${baseUrl}?ref=${user.uid}`;
    }

    // Upload zone
    initUploadZone();

    // View toggle
    document.getElementById('view-grid')?.addEventListener('click', () => switchView('grid'));
    document.getElementById('view-list')?.addEventListener('click', () => switchView('list'));

    // Sort
    document.getElementById('sort-select')?.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderFiles();
    });

    // Filter tabs
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderFiles();
      });
    });

    // Search
    const searchInput = document.getElementById('dash-search');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(() => renderFiles(), 300));
    }

    // New folder
    document.getElementById('btn-new-folder')?.addEventListener('click', () => {
      openRenameModal(null, true);
    });

    // Sidebar toggle (mobile)
    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
      document.querySelector('.sidebar')?.classList.toggle('open');
    });

    // Context menu close
    document.addEventListener('click', () => closeContextMenu());
    document.addEventListener('contextmenu', (e) => {
      const card = e.target.closest('.file-card, .file-list-item');
      if (card) {
        e.preventDefault();
        openContextMenu(e.clientX, e.clientY, card.dataset.id);
      }
    });

    // Check pending premium request
    checkPendingPremium();
  });
});

// ── Load Files from Firestore ──
async function loadFiles() {
  try {
    allFiles = await getUserFiles(currentUser.uid);
  } catch (e) {
    console.error('Error loading files:', e);
    allFiles = [];
  }
}

// ── User Info ──
function renderUserInfo(userDoc) {
  const u = userDoc;
  document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = u.name || 'User');
  document.querySelectorAll('[data-user-email]').forEach(el => el.textContent = u.email || '');
  document.querySelectorAll('[data-user-plan]').forEach(el => {
    el.textContent = (u.plan || 'free').charAt(0).toUpperCase() + (u.plan || 'free').slice(1);
  });

  const refInput = document.getElementById('referral-link-input');
  if (refInput && (u.uid || currentUser?.uid)) {
    const targetUid = u.uid || currentUser.uid;
    const baseUrl = window.location.origin + window.location.pathname.replace('dashboard.html', 'auth.html');
    refInput.value = `${baseUrl}?ref=${targetUid}`;
  }

  // Plan badge
  const planBadge = document.getElementById('plan-badge');
  if (planBadge) {
    if (u.plan === 'pro') {
      planBadge.textContent = '💎 Pro';
      planBadge.className = 'badge badge-green';
      planBadge.style.display = 'inline-flex';
    } else if (u.plan === 'business') {
      planBadge.textContent = '🏢 Business';
      planBadge.className = 'badge badge-diamond';
      planBadge.style.display = 'inline-flex';
    } else {
      planBadge.textContent = '🌱 Free';
      planBadge.className = 'badge badge-green';
      planBadge.style.display = 'inline-flex';
    }
  }

  // Storage
  const used = allFiles.reduce((sum, f) => sum + (f.size || 0), 0);
  const maxMap = { free: 10*1024*1024*1024, pro: 50*1024*1024*1024, business: 1024*1024*1024*1024 };
  const bonus = u.bonusStorage || 0;
  const max = (maxMap[u.plan] || maxMap.free) + bonus;
  const pct = Math.min((used / max) * 100, 100).toFixed(1);

  document.querySelectorAll('[data-storage-fill]').forEach(el => el.style.width = pct + '%');
  document.querySelectorAll('[data-storage-used]').forEach(el => el.textContent = formatSize(used));
  document.querySelectorAll('[data-storage-max]').forEach(el => el.textContent = formatSize(max));
  document.querySelectorAll('[data-storage-pct]').forEach(el => el.textContent = pct + '%');
  document.getElementById('sidebar-file-count').textContent = allFiles.length;
}

function copyReferralLink() {
  const input = document.getElementById('referral-link-input');
  if (!input || !input.value) return;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(input.value).then(() => {
      showToast('Referral invite link copied! Send to friends for +2 GB bonus! 🎁', 'success');
    }).catch(() => {
      input.select();
      document.execCommand('copy');
      showToast('Referral invite link copied! 🎁', 'success');
    });
  } else {
    input.select();
    document.execCommand('copy');
    showToast('Referral invite link copied! 🎁', 'success');
  }
}

// ── Stats ──
function renderStats() {
  const totalFiles  = allFiles.length;
  const totalSize   = allFiles.reduce((s, f) => s + (f.size || 0), 0);
  const totalDl     = allFiles.reduce((s, f) => s + (f.downloads || 0), 0);
  const sharedFiles = allFiles.filter(f => f.shortId).length;

  const el1 = document.getElementById('stat-files');
  const el2 = document.getElementById('stat-storage');
  const el3 = document.getElementById('stat-downloads');
  const el4 = document.getElementById('stat-shared');

  if (el1) animateCounter(el1, totalFiles, 1200);
  if (el2) animateCounter(el2, Math.round(totalSize / 1048576), 1200);
  if (el3) animateCounter(el3, totalDl, 1200);
  if (el4) animateCounter(el4, sharedFiles, 1200);
}

// ── Render Files ──
function renderFiles() {
  const searchVal = document.getElementById('dash-search')?.value.toLowerCase() || '';
  let files = [...allFiles];

  // Filter
  if (currentFilter !== 'all') {
    const filterMap = {
      images:    ['jpg','jpeg','png','gif','svg','webp'],
      videos:    ['mp4','mov','avi','mkv','webm'],
      documents: ['pdf','doc','docx','txt','xls','xlsx','ppt','pptx'],
      archives:  ['zip','rar','tar','gz','7z'],
    };
    const exts = filterMap[currentFilter] || [];
    files = files.filter(f => exts.includes(f.type));
  }

  // Search
  if (searchVal) {
    files = files.filter(f => f.name.toLowerCase().includes(searchVal));
  }

  // Sort
  const [sortKey, sortDir] = currentSort.split('-');
  files.sort((a, b) => {
    let av, bv;
    if (sortKey === 'name')     { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
    else if (sortKey === 'size'){ av = a.size || 0; bv = b.size || 0; }
    else {
      av = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0);
      bv = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0);
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  renderGrid(files);
  renderList(files);
  document.getElementById('files-count').textContent = `${files.length} file${files.length !== 1 ? 's' : ''}`;
}

function getFileDate(f) {
  if (!f.createdAt) return 'Unknown';
  const d = f.createdAt.toDate ? f.createdAt.toDate() : new Date(f.createdAt);
  return formatDate(d.toISOString());
}

function renderGrid(files) {
  const grid = document.getElementById('files-grid');
  if (!grid) return;

  if (files.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-muted)">
      <div style="font-size:3rem;margin-bottom:16px">📂</div>
      <p style="font-size:1rem;font-weight:500">No files found</p>
      <p style="font-size:0.85rem;margin-top:8px">Upload files or change your filter</p>
    </div>`;
    return;
  }

  grid.innerHTML = files.map(f => {
    const safeName = escapeHTML(f.name);
    const safeId = escapeHTML(f.id);
    const safeShortId = escapeHTML(f.shortId || '');
    return `
      <div class="file-card ${selectedFiles.has(f.id) ? 'selected' : ''}" data-id="${safeId}" onclick="handleFileClick(event,'${safeId}','${safeShortId}')">
        <div class="file-card-checkbox" onclick="toggleSelect(event,'${safeId}')">
          ${selectedFiles.has(f.id) ? '✓' : ''}
        </div>
        <div class="file-card-menu" onclick="openContextMenu(event.clientX,event.clientY,'${safeId}',event)">⋮</div>
        <span class="file-card-icon">${getFileIcon(f.name)}</span>
        <div class="file-card-name" title="${safeName}">${safeName}</div>
        <div class="file-card-meta">${formatSize(f.size || 0)}</div>
        <div class="file-card-meta">${escapeHTML(getFileDate(f))}</div>
      </div>
    `;
  }).join('');
}

function renderList(files) {
  const list = document.getElementById('files-list');
  if (!list) return;

  if (files.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
      <div style="font-size:3rem;margin-bottom:16px">📂</div><p>No files found</p>
    </div>`;
    return;
  }

  list.innerHTML = files.map(f => {
    const safeName = escapeHTML(f.name);
    const safeId = escapeHTML(f.id);
    return `
      <div class="file-list-item" data-id="${safeId}">
        <span class="file-list-icon">${getFileIcon(f.name)}</span>
        <span class="file-list-name" title="${safeName}">${safeName}</span>
        <span class="file-list-size">${formatSize(f.size || 0)}</span>
        <span class="file-list-date">${escapeHTML(getFileDate(f))}</span>
        <div class="file-list-actions">
          <button class="btn btn-sm btn-glass btn-icon" title="Share" onclick="shareFile('${safeId}')">🔗</button>
          <button class="btn btn-sm btn-glass btn-icon" title="Download" onclick="downloadFile('${safeId}')">⬇️</button>
          <button class="btn btn-sm btn-glass btn-icon" title="Delete" onclick="deleteFile('${safeId}')">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

function switchView(view) {
  currentView = view;
  const grid = document.getElementById('files-grid');
  const list = document.getElementById('files-list');
  const gridBtn = document.getElementById('view-grid');
  const listBtn = document.getElementById('view-list');

  if (view === 'grid') {
    grid.style.display = 'grid';
    list.style.display = 'none';
    gridBtn?.classList.add('active');
    listBtn?.classList.remove('active');
  } else {
    grid.style.display = 'none';
    list.style.display = 'flex';
    gridBtn?.classList.remove('active');
    listBtn?.classList.add('active');
  }
}

function handleFileClick(e, id, shortId) {
  if (e.target.closest('.file-card-checkbox') || e.target.closest('.file-card-menu')) return;
  if (shortId) {
    window.open(`file.html?s=${shortId}`, '_blank');
  }
}

function toggleSelect(e, id) {
  e.stopPropagation();
  if (selectedFiles.has(id)) selectedFiles.delete(id);
  else selectedFiles.add(id);
  renderFiles();
  updateBulkBar();
}

function updateBulkBar() {
  const bar = document.getElementById('bulk-bar');
  if (!bar) return;
  if (selectedFiles.size > 0) {
    bar.style.display = 'flex';
    document.getElementById('bulk-count').textContent = `${selectedFiles.size} selected`;
  } else {
    bar.style.display = 'none';
  }
}

// ── Context Menu ──
let contextFileId = null;

function openContextMenu(x, y, id, e) {
  if (e) e.stopPropagation();
  contextFileId = id;
  closeContextMenu();

  const menu = document.createElement('div');
  menu.id = 'context-menu';
  menu.className = 'context-menu';
  const safeId = escapeHTML(id);
  menu.innerHTML = `
    <div class="context-menu-item" onclick="shareFile('${safeId}')">🔗 &nbsp; Copy Share Link</div>
    <div class="context-menu-item" onclick="downloadFile('${safeId}')">⬇️ &nbsp; Download</div>
    <div class="context-menu-item" onclick="openRenameModal('${safeId}')">✏️ &nbsp; Rename</div>
    <div class="context-menu-item" onclick="openProtectModal('${safeId}')">🔒 &nbsp; Protect Password</div>
    <div class="context-menu-item" onclick="openExpireModal('${safeId}')">⏳ &nbsp; Expiration Link</div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item danger" onclick="deleteFile('${safeId}')">🗑️ &nbsp; Delete</div>
  `;
  document.body.appendChild(menu);

  const rect = menu.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  menu.style.left = (x + rect.width > vw ? x - rect.width : x) + 'px';
  menu.style.top  = (y + rect.height > vh ? y - rect.height : y) + 'px';
}

async function openProtectModal(id) {
  closeContextMenu();
  const file = allFiles.find(f => f.id === id);
  if (!file) return;

  const currentPass = file.accessPassword || '';
  const newPass = prompt(`🔒 Set a Password for "${file.name}" (Leave empty to remove password):`, currentPass);
  if (newPass === null) return;

  try {
    await db.collection('files').doc(file.id).update({
      accessPassword: newPass.trim()
    });
    file.accessPassword = newPass.trim();
    showToast(newPass.trim() ? 'Password protection enabled! 🔒' : 'Password protection removed! 🔓', 'success');
  } catch (e) {
    showToast('Failed to update password: ' + e.message, 'error');
  }
}

async function openExpireModal(id) {
  closeContextMenu();
  const file = allFiles.find(f => f.id === id);
  if (!file) return;

  const daysStr = prompt(`⏳ Enter number of days until link expires for "${file.name}" (e.g., 7 for 7 days, 1 for 24h, 0 to disable):`, '7');
  if (daysStr === null) return;

  const days = parseInt(daysStr, 10);
  if (isNaN(days) || days < 0) {
    showToast('Invalid number of days', 'error');
    return;
  }

  let expiresAt = null;
  if (days > 0) {
    expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  try {
    await db.collection('files').doc(file.id).update({
      expiresAt: expiresAt ? firebase.firestore.Timestamp.fromDate(expiresAt) : null
    });
    file.expiresAt = expiresAt;
    showToast(expiresAt ? `Link set to expire in ${days} days ⏳` : 'Link expiration removed ♾️', 'success');
  } catch (e) {
    showToast('Failed to set expiration: ' + e.message, 'error');
  }
}

function closeContextMenu() {
  document.getElementById('context-menu')?.remove();
}

// ── File Actions ──
function shareFile(id) {
  const file = allFiles.find(f => f.id === id);
  if (!file || !file.shortId) { showToast('Share link not available', 'error'); return; }
  const baseUrl = window.location.origin + window.location.pathname.replace(/[^\/]*$/, '');
  const url = `${baseUrl}file.html?s=${file.shortId}`;
  copyToClipboard(url);
  closeContextMenu();
}

function downloadFile(id) {
  const file = allFiles.find(f => f.id === id);
  if (!file || !file.downloadUrl) { showToast('Download not available', 'error'); return; }
  // Open download URL
  const a = document.createElement('a');
  a.href = file.downloadUrl;
  a.target = '_blank';
  a.download = file.name;
  a.click();
  // Increment download counter
  incrementDownloads(id).catch(() => {});
  showToast(`Downloading "${escapeHTML(file.name)}"…`, 'info');
  closeContextMenu();
}

async function deleteFile(id) {
  const file = allFiles.find(f => f.id === id);
  if (!file) return;
  showDeleteModal(file);
  closeContextMenu();
}

function showDeleteModal(file) {
  const overlay = document.getElementById('delete-modal');
  if (!overlay) return;
  document.getElementById('delete-file-name').textContent = `"${file.name}"`;
  overlay.classList.add('active');

  document.getElementById('delete-confirm').onclick = async () => {
    try {
      overlay.classList.remove('active');
      showToast('Deleting…', 'info');

      // Delete from storage
      if (file.storagePath) {
        await deleteFileFromStorage(file.storagePath);
      }
      // Delete short link
      if (file.shortId) {
        await deleteShortLink(file.shortId);
      }
      // Delete file doc
      await deleteFileDoc(file.id);
      // Update storage
      await updateUserStorageUsed(currentUser.uid);

      // Reload
      await loadFiles();
      renderStats();
      renderFiles();
      renderUserInfo(await getUserDoc(currentUser.uid));
      showToast('File deleted', 'success');
    } catch (e) {
      showToast('Delete failed: ' + e.message, 'error');
    }
  };

  document.getElementById('delete-cancel').onclick = () => overlay.classList.remove('active');
  overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.remove('active'); };
}

function openRenameModal(id, isFolder = false) {
  const overlay = document.getElementById('rename-modal');
  if (!overlay) return;
  const file = id ? allFiles.find(f => f.id === id) : null;
  const input = document.getElementById('rename-input');
  document.getElementById('rename-title').textContent = isFolder ? 'New Folder' : 'Rename File';
  input.value = file ? file.name : '';
  input.placeholder = isFolder ? 'Folder name' : 'File name';
  overlay.classList.add('active');
  input.focus();

  document.getElementById('rename-save').onclick = async () => {
    const newName = input.value.trim();
    if (!newName) return;
    if (file) {
      try {
        await renameFileDoc(file.id, newName);
        await loadFiles();
        renderFiles();
        showToast('Renamed successfully', 'success');
      } catch (e) {
        showToast('Rename failed: ' + e.message, 'error');
      }
    } else {
      showToast(`Folder "${escapeHTML(newName)}" created`, 'success');
    }
    overlay.classList.remove('active');
  };

  document.getElementById('rename-cancel').onclick = () => overlay.classList.remove('active');
  overlay.onclick = (e) => { if (e.target === overlay) overlay.classList.remove('active'); };
}

// ── Upload Zone (Firebase Storage) ──
function initUploadZone() {
  const zone  = document.getElementById('upload-zone');
  const input = document.getElementById('upload-input');
  const btn   = document.getElementById('upload-btn');

  if (!zone) return;

  btn?.addEventListener('click', () => input.click());
  zone.addEventListener('click', (e) => {
    if (!e.target.closest('.btn')) input.click();
  });

  ['dragenter', 'dragover'].forEach(evt => {
    zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.add('dragging'); });
  });
  ['dragleave', 'drop'].forEach(evt => {
    zone.addEventListener(evt, (e) => { e.preventDefault(); zone.classList.remove('dragging'); });
  });

  zone.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer.files);
    handleFilesUpload(files);
  });

  input.addEventListener('change', () => {
    handleFilesUpload(Array.from(input.files));
    input.value = '';
  });
}

// Rate Limiting & Malware Filter Configuration
window.userUploadHistory = window.userUploadHistory || [];
const BLOCKED_EXTENSIONS = ['exe', 'bat', 'vbs', 'cmd', 'sh', 'php', 'msi', 'scr', 'ps1', 'cgi', 'jar', 'dll', 'com', 'pif'];
const MAX_UPLOADS_PER_MINUTE = 5;

async function handleFilesUpload(files) {
  const list = document.getElementById('upload-progress-list');
  if (!list) return;

  // 1. Rate Limiting Check (Anti-Abuse)
  const now = Date.now();
  window.userUploadHistory = window.userUploadHistory.filter(t => now - t < 60000);
  if (window.userUploadHistory.length + files.length > MAX_UPLOADS_PER_MINUTE) {
    showToast('⚠️ Rate limit reached: Max 5 uploads per minute allowed for abuse protection.', 'error');
    return;
  }

  // 2. Plan Size Limits Check
  const planName = (currentUserDoc?.plan || 'free').toLowerCase();
  const planSizeLimits = { free: 2 * 1024 * 1024 * 1024, pro: 20 * 1024 * 1024 * 1024, business: Infinity };
  const maxAllowedFileSize = planSizeLimits[planName] || planSizeLimits.free;

  list.style.display = 'flex';

  for (const file of files) {
    // 3. Size limit per file
    if (file.size > maxAllowedFileSize) {
      showToast(`🚫 File size exceeds maximum allowed limit (${formatSize(maxAllowedFileSize)}) for your ${planName.toUpperCase()} plan.`, 'error');
      continue;
    }

    // 4. Dangerous Malware & Executable Script Filter
    const ext = file.name.split('.').pop().toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      showToast(`🚫 Blocked: Executable files (.${ext}) are prohibited for platform security.`, 'error');
      continue;
    }

    window.userUploadHistory.push(Date.now());

    const itemId = 'u' + Date.now() + Math.random().toString(36).slice(2, 6);
    const safeFileName = escapeHTML(file.name);
    const item = document.createElement('div');
    item.className = 'upload-progress-item';
    item.innerHTML = `
      <span class="upload-file-icon">${getFileIcon(file.name)}</span>
      <div class="upload-file-info">
        <div class="upload-file-name">${safeFileName}</div>
        <div class="upload-file-size">${formatSize(file.size)}</div>
        <div class="progress-bar upload-file-progress">
          <div class="progress-fill" id="pf-${itemId}" style="width:0%"></div>
        </div>
      </div>
      <span class="upload-pct" id="pp-${itemId}">0%</span>
    `;
    list.appendChild(item);

    try {
      // Upload directly to Firebase Storage
      const { downloadUrl, storagePath } = await uploadFileToStorage(
        currentUser.uid,
        file,
        (pct) => {
          document.getElementById(`pf-${itemId}`)?.style.setProperty('width', pct.toFixed(0) + '%');
          document.getElementById(`pp-${itemId}`).textContent = pct.toFixed(0) + '%';
        }
      );

      // Generate secure short link
      const shortId = generateShortId();

      // Save file metadata in Firestore
      const fileId = await addFileDoc({
        name: file.name,
        size: file.size,
        type: file.name.split('.').pop().toLowerCase(),
        ownerId: currentUser.uid,
        ownerEmail: currentUser.email,
        downloadUrl,
        storagePath,
        shortId
      });

      // Create short link doc
      await createShortLink(shortId, fileId, currentUser.uid);

      // Update storage used
      await updateUserStorageUsed(currentUser.uid);

      // Update UI
      item.querySelector(`#pp-${itemId}`).textContent = '✅';
      item.querySelector(`#pf-${itemId}`).style.background = 'var(--green-400)';
      showToast(`"${safeFileName}" uploaded!`, 'success');

      // Reload files
      await loadFiles();
      renderStats();
      renderFiles();
      const updatedUserDoc = await getUserDoc(currentUser.uid);
      renderUserInfo(updatedUserDoc);

      setTimeout(() => item.remove(), 3000);

    } catch (e) {
      console.error('Upload error:', e);
      item.querySelector(`#pp-${itemId}`).textContent = '❌';
      showToast(`Upload failed: ${escapeHTML(e.message)}`, 'error');
    }
  }
}

// ── Premium status check ──
async function checkPendingPremium() {
  try {
    const pending = await getUserPremiumRequest(currentUser.uid);
    const banner = document.getElementById('premium-pending-banner');
    if (pending && banner) {
      banner.style.display = 'flex';
    }
  } catch (e) {
    // Ignore
  }
}

// ── Utils ──
function debounce(fn, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

// Logout
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  if (typeof globalLogout === 'function') {
    await globalLogout('auth.html?logout=true');
  } else {
    await auth.signOut();
    localStorage.removeItem('goshare_user');
    window.location.href = 'auth.html?logout=true';
  }
});
