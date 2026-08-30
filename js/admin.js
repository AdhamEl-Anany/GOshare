/* ===========================
   GOshare – Admin Panel Logic
   =========================== */

let adminUser = null;

document.addEventListener('DOMContentLoaded', () => {
  // Check if already logged in as admin
  auth.onAuthStateChanged(async (user) => {
    if (user && user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
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
      showToast('Access denied: Email is not authorized for Admin access', 'error');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '⟳ Verifying…';

    try {
      await auth.signInWithEmailAndPassword(email, pass);
      adminUser = auth.currentUser;
      showToast('Welcome Admin! 🔑', 'success');
      showAdminDashboard();
    } catch (error) {
      btn.disabled = false;
      btn.innerHTML = 'Sign In to Admin Panel →';
      console.error('Admin login authentication failed:', error.message);
      showToast('Authentication failed: ' + error.message, 'error');
    }
  });
}

// ── Show Dashboard ──
async function showAdminDashboard() {
  document.getElementById('admin-login-section').style.display = 'none';
  document.getElementById('admin-dashboard-section').style.display = 'block';

  // Load stats
  await loadAdminStats();

  // Load default tab (analytics)
  renderAdminAnalyticsCharts();

  // Tab switching
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.getElementById(tab.dataset.panel);
      if (panel) panel.classList.add('active');

      // Load tab data
      if (tab.dataset.panel === 'panel-analytics') renderAdminAnalyticsCharts();
      else if (tab.dataset.panel === 'panel-requests') await loadRequestsTab();
      else if (tab.dataset.panel === 'panel-users') await loadUsersTab();
      else if (tab.dataset.panel === 'panel-files') await loadFilesTab();
    });
  });

  // Logout
  document.getElementById('admin-logout')?.addEventListener('click', async () => {
    if (typeof globalLogout === 'function') {
      await globalLogout('index.html');
    } else {
      await auth.signOut();
      localStorage.removeItem('goshare_user');
      window.location.reload();
    }
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
      const initial = escapeHTML((r.userName || r.userEmail || '?').charAt(0).toUpperCase());
      const safeName = escapeHTML(r.userName || 'Unknown');
      const safeEmail = escapeHTML(r.userEmail || '—');

      let statusHtml = '';
      let actionsHtml = '';

      if (r.status === 'pending') {
        statusHtml = `<span class="req-status pending">⏳ Pending</span>`;
        actionsHtml = `
          <button class="btn btn-sm btn-primary" onclick="handleApprove('${escapeHTML(r.id)}','${escapeHTML(r.userId)}','${escapeHTML(r.plan)}')">✅ Approve</button>
          <button class="btn btn-sm btn-glass" style="color:#ef5350" onclick="handleReject('${escapeHTML(r.id)}')">❌ Reject</button>
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
            <div class="req-name">${safeName}</div>
            <div class="req-email">${safeEmail}</div>
          </div>
          <span class="req-plan ${escapeHTML(r.plan)}">${r.plan === 'pro' ? '💎 Pro' : '🏢 Business'}</span>
          <span class="req-date">${escapeHTML(date)}</span>
          ${statusHtml}
          <div class="req-actions">${actionsHtml}</div>
        </div>
      `;
    }).join('');
  } catch (e) {
    container.innerHTML = `<div class="admin-empty"><p>Error loading requests: ${escapeHTML(e.message)}</p></div>`;
  }
}

async function handleApprove(requestId, userId, plan) {
  try {
    await approveRequest(requestId, userId, plan);
    showToast(`✅ User upgraded to ${escapeHTML(plan)}!`, 'success');
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
      const safeName = escapeHTML(u.name || '—');
      const safeEmail = escapeHTML(u.email || '—');
      const safePlan = escapeHTML(u.plan || 'free');
      return `
        <tr>
          <td><strong>${safeName}</strong></td>
          <td>${safeEmail}</td>
          <td><span class="user-plan ${safePlan}">${safePlan.toUpperCase()}</span></td>
          <td>${formatSize(u.storageUsed || 0)}</td>
          <td>${escapeHTML(date)}</td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    container.innerHTML = `<tr><td colspan="5" class="admin-empty">Error: ${escapeHTML(e.message)}</td></tr>`;
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
      const safeFileName = escapeHTML(f.name || 'File');
      const safeEmail = escapeHTML(f.ownerEmail || '—');
      const shortLink = f.shortId ? `file.html?s=${escapeHTML(f.shortId)}` : '—';
      return `
        <tr>
          <td>${getFileIcon(f.name)} ${safeFileName}</td>
          <td>${safeEmail}</td>
          <td>${formatSize(f.size || 0)}</td>
          <td>${f.downloads || 0}</td>
          <td><code style="font-size:0.8rem;color:var(--green-400)">${shortLink}</code></td>
          <td>${escapeHTML(date)}</td>
        </tr>
      `;
    }).join('');
  } catch (e) {
    container.innerHTML = `<tr><td colspan="6" class="admin-empty">Error: ${escapeHTML(e.message)}</td></tr>`;
  }
}

let adminUserChart = null;
let adminStorageChart = null;
let adminPlansChart = null;

function renderAdminAnalyticsCharts() {
  if (typeof Chart === 'undefined') return;

  // 1. User Growth Chart
  const ctxUsers = document.getElementById('admin-chart-users')?.getContext('2d');
  if (ctxUsers) {
    if (adminUserChart) adminUserChart.destroy();
    adminUserChart = new Chart(ctxUsers, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
        datasets: [{
          label: 'Registered Users',
          data: [120, 240, 390, 580, 750, 920, 1080, 1165],
          borderColor: '#00c853',
          backgroundColor: 'rgba(0, 200, 83, 0.15)',
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#b0bec5' } } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#b0bec5' } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#b0bec5' } }
        }
      }
    });
  }

  // 2. Storage & Uploads Chart
  const ctxStorage = document.getElementById('admin-chart-storage')?.getContext('2d');
  if (ctxStorage) {
    if (adminStorageChart) adminStorageChart.destroy();
    adminStorageChart = new Chart(ctxStorage, {
      type: 'bar',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            label: 'Uploaded Files',
            data: [42, 65, 58, 94, 112, 140, 185],
            backgroundColor: '#00c853',
            borderRadius: 6
          },
          {
            label: 'Storage Volume (MB)',
            data: [1.2, 2.1, 2.9, 3.8, 4.7, 5.5, 6.7],
            backgroundColor: '#4dd0e1',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#b0bec5' } } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#b0bec5' } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#b0bec5' } }
        }
      }
    });
  }

  // 3. User Plans Pie Chart
  const ctxPlans = document.getElementById('admin-chart-plans')?.getContext('2d');
  if (ctxPlans) {
    if (adminPlansChart) adminPlansChart.destroy();
    adminPlansChart = new Chart(ctxPlans, {
      type: 'doughnut',
      data: {
        labels: ['Free Tier (10GB)', 'Pro Tier (50GB)', 'Business Tier (1TB)'],
        datasets: [{
          data: [85, 12, 3],
          backgroundColor: ['#00c853', '#4dd0e1', '#ab47bc'],
          borderWidth: 2,
          borderColor: '#0b1610'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#b0bec5', padding: 16 } }
        }
      }
    });
  }
}
