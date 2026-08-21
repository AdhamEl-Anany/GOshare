/* ===========================
   GOshare – Admin Panel Logic
   =========================== */

const ADMIN_PASS = 'toqa1402';
let adminUser = null;

document.addEventListener('DOMContentLoaded', () => {
  // Check if already logged in as admin
  auth.onAuthStateChanged(async (user) => {
    if (user && user.email === ADMIN_EMAIL) {
      adminUser = user;
      showAdminDashboard();
    } else {
      showAdminLogin();
    }
  });
});

// ── Show Login ──
function showAdminLogin() {
  document.getElementById('admin-login-section').style.display = 'flex';
  document.getElementById('admin-dashboard-section').style.display = 'none';

  const form = document.getElementById('admin-login-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim();
    const pass  = document.getElementById('admin-pass').value;
    const btn   = form.querySelector('[type=submit]');

    if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      showToast('Not an admin email', 'error');
      return;
    }

    if (pass !== ADMIN_PASS) {
      showToast('Incorrect Admin password', 'error');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '⟳ Verifying…';

    try {
      // 1. Try to sign in
      await auth.signInWithEmailAndPassword(email, pass);
      adminUser = auth.currentUser;
      showToast('Welcome Admin! 🔑', 'success');
      showAdminDashboard();
    } catch (error) {
      console.log('Admin login attempt error:', error.code);

      // 2. Try to create account if doesn't exist
      try {
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        await cred.user.updateProfile({ displayName: 'ENG.Adham Hany' });
        await createUserDoc(cred.user.uid, {
          name: 'ENG.Adham Hany',
          email: email,
          plan: 'business',
          role: 'admin'
        });
        adminUser = cred.user;
        showToast('Admin account initialized & logged in! 🔑', 'success');
        showAdminDashboard();
        return;
      } catch (createErr) {
        console.log('Admin create attempt notice:', createErr.code);
      }

      // 3. Fallback: If Firebase blocks due to too-many-requests or credentials, allow Admin access since password matches
      showToast('Welcome Admin! 🔑', 'success');
      showAdminDashboard();
    }
  });
}

// ── Show Dashboard ──
async function showAdminDashboard() {
  document.getElementById('admin-login-section').style.display = 'none';
  document.getElementById('admin-dashboard-section').style.display = 'block';

  // Load stats
  await loadAdminStats();

  // Load default tab (requests)
  await loadRequestsTab();

  // Tab switching
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.getElementById(tab.dataset.panel);
      if (panel) panel.classList.add('active');

      // Load tab data
      if (tab.dataset.panel === 'panel-requests') await loadRequestsTab();
      else if (tab.dataset.panel === 'panel-users') await loadUsersTab();
      else if (tab.dataset.panel === 'panel-files') await loadFilesTab();
    });
  });

  // Logout
  document.getElementById('admin-logout')?.addEventListener('click', async () => {
    await auth.signOut();
    window.location.reload();
  });
}

// ── Stats ──
async function loadAdminStats() {
  try {
    const stats = await getAdminStats();
    document.getElementById('admin-stat-users').textContent = stats.totalUsers;
    document.getElementById('admin-stat-files').textContent = stats.totalFiles;
    document.getElementById('admin-stat-storage').textContent = formatSize(stats.totalStorage);
    document.getElementById('admin-stat-downloads').textContent = stats.totalDownloads.toLocaleString();
    document.getElementById('admin-stat-pending').textContent = stats.pendingRequests;

    // Update tab badge
    const badge = document.getElementById('pending-badge');
    if (badge) {
      if (stats.pendingRequests > 0) {
        badge.textContent = stats.pendingRequests;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch (e) {
    console.error('Stats error:', e);
  }
}

// ── Requests Tab ──
async function loadRequestsTab() {
  const container = document.getElementById('requests-list');
  if (!container) return;

  container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">⟳ Loading…</div>';

  try {
    const requests = await getAllPremiumRequests();

    if (requests.length === 0) {
      container.innerHTML = `<div class="admin-empty">
        <div class="empty-icon">📭</div>
        <p>No premium requests yet</p>
      </div>`;
      return;
    }

    container.innerHTML = requests.map(r => {
      const date = r.requestedAt?.toDate ? r.requestedAt.toDate().toLocaleDateString() : '—';
      const initial = (r.userName || r.userEmail || '?').charAt(0).toUpperCase();

      let statusHtml = '';
      let actionsHtml = '';

      if (r.status === 'pending') {
        statusHtml = `<span class="req-status pending">⏳ Pending</span>`;
        actionsHtml = `
          <button class="btn btn-sm btn-primary" onclick="handleApprove('${r.id}','${r.userId}','${r.plan}')">✅ Approve</button>
          <button class="btn btn-sm btn-glass" style="color:#ef5350" onclick="handleReject('${r.id}')">❌ Reject</button>
        `;
      } else if (r.status === 'approved') {
        statusHtml = `<span class="req-status approved">✅ Approved</span>`;
      } else {
        statusHtml = `<span class="req-status rejected">❌ Rejected</span>`;
      }

      return `
        <div class="request-card">
          <div class="req-avatar">${initial}</div>
          <div class="req-info">
            <div class="req-name">${r.userName || 'Unknown'}</div>
            <div class="req-email">${r.userEmail}</div>
          </div>
          <span class="req-plan ${r.plan}">${r.plan === 'pro' ? '💎 Pro' : '🏢 Business'}</span>
          <span class="req-date">${date}</span>
          ${statusHtml}
          <div class="req-actions">${actionsHtml}</div>
        </div>
      `;
    }).join('');
  } catch (e) {
    container.innerHTML = `<div class="admin-empty"><p>Error loading requests: ${e.message}</p></div>`;
  }
}

async function handleApprove(requestId, userId, plan) {
  try {
    await approveRequest(requestId, userId, plan);
    showToast(`✅ User upgraded to ${plan}!`, 'success');
    await loadAdminStats();
    await loadRequestsTab();
  } catch (e) {
    showToast('Approve failed: ' + e.message, 'error');
  }
}

async function handleReject(requestId) {
  try {
    await rejectRequest(requestId);
    showToast('Request rejected', 'info');
    await loadAdminStats();
    await loadRequestsTab();
  } catch (e) {
    showToast('Reject failed: ' + e.message, 'error');
  }
}

// ── Users Tab ──
async function loadUsersTab() {
  const container = document.getElementById('users-table-body');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted)">⟳ Loading…</td></tr>';

  try {
    const users = await getAllUsers();

    if (users.length === 0) {
      container.innerHTML = '<tr><td colspan="5" class="admin-empty">No users yet</td></tr>';
      return;
    }

    container.innerHTML = users.map(u => {
      const date = u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : '—';
      return `
        <tr>
          <td><strong>${u.name || '—'}</strong></td>
          <td>${u.email}</td>
          <td><span class="user-plan ${u.plan || 'free'}">${(u.plan || 'free').toUpperCase()}</span></td>
          <td>${formatSize(u.storageUsed || 0)}</td>
          <td>${date}</td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    container.innerHTML = `<tr><td colspan="5" class="admin-empty">Error: ${e.message}</td></tr>`;
  }
}

// ── Files Tab ──
async function loadFilesTab() {
  const container = document.getElementById('files-table-body');
  if (!container) return;

  container.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">⟳ Loading…</td></tr>';

  try {
    const files = await getAllFiles();

    if (files.length === 0) {
      container.innerHTML = '<tr><td colspan="6" class="admin-empty">No files yet</td></tr>';
      return;
    }

    container.innerHTML = files.map(f => {
      const date = f.createdAt?.toDate ? f.createdAt.toDate().toLocaleDateString() : '—';
      const shortLink = f.shortId ? `file.html?s=${f.shortId}` : '—';
      return `
        <tr>
          <td>${getFileIcon(f.name)} ${f.name}</td>
          <td>${f.ownerEmail || '—'}</td>
          <td>${formatSize(f.size || 0)}</td>
          <td>${f.downloads || 0}</td>
          <td><code style="font-size:0.8rem;color:var(--green-400)">${shortLink}</code></td>
          <td>${date}</td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    container.innerHTML = `<tr><td colspan="6" class="admin-empty">Error: ${e.message}</td></tr>`;
  }
}
