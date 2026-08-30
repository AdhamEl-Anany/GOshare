/* ===========================
   GOshare – Auth Logic (Firebase)
   =========================== */

document.addEventListener('DOMContentLoaded', () => {
  // Check auth state
  auth.onAuthStateChanged(async (user) => {
    const params = new URLSearchParams(window.location.search);
    const isLogout = params.get('logout') === 'true' || params.get('switch') === 'true';

    if (isLogout && user) {
      await auth.signOut();
      return;
    }

    if (user && !isLogout) {
      renderActiveSessionBanner(user);
    }
  });

  // Tab switching
  const tabs = document.querySelectorAll('.auth-tab');
  const panels = document.querySelectorAll('.auth-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.panel).classList.add('active');
    });
  });

  // Password toggle
  document.querySelectorAll('.pass-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
      } else {
        input.type = 'password';
        btn.textContent = '👁️';
      }
    });
  });

  // ── LOGIN ──
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-pass').value;
      const btn      = loginForm.querySelector('[type=submit]');

      if (!validateEmail(email)) {
        showFieldError('login-email-err', 'Please enter a valid email address');
        return;
      }
      clearFieldError('login-email-err');

      setLoading(btn, true);

      // Unified Secure User & Admin Login
      try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        const loggedUser = cred.user;
        const isAdmin = loggedUser.email && loggedUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

        // Ensure user document exists in Firestore for stats counting
        let userDoc = await getUserDoc(loggedUser.uid);
        if (!userDoc) {
          await createUserDoc(loggedUser.uid, {
            name: loggedUser.displayName || loggedUser.email.split('@')[0],
            email: loggedUser.email,
            plan: 'free',
            role: isAdmin ? 'admin' : 'user'
          });
        }

        localStorage.setItem('goshare_user', JSON.stringify({
          uid: loggedUser.uid,
          email: loggedUser.email,
          name: loggedUser.displayName || loggedUser.email.split('@')[0]
        }));

        if (isAdmin) {
          showToast('Welcome Admin! Redirecting to Admin Panel… 🔑', 'success');
          setTimeout(() => window.location.href = 'admin.html', 800);
        } else {
          showToast('Welcome back! Redirecting…', 'success');
          setTimeout(() => window.location.href = 'dashboard.html', 800);
        }
      } catch (error) {
        setLoading(btn, false);
        let msg = 'Invalid email or password';
        if (error.code === 'auth/user-not-found') msg = 'No account found with this email';
        else if (error.code === 'auth/wrong-password') msg = 'Incorrect password';
        else if (error.code === 'auth/invalid-credential') msg = 'Invalid email or password';
        else if (error.code === 'auth/too-many-requests') msg = 'Too many attempts. Try again later.';
        showFieldError('login-pass-err', msg);
        shakeForm(loginForm);
      }
    });
  }

  // ── REGISTER ──
  const regForm = document.getElementById('register-form');
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name     = document.getElementById('reg-name').value.trim();
      const email    = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-pass').value;
      const confirm  = document.getElementById('reg-confirm').value;
      const btn      = regForm.querySelector('[type=submit]');

      let valid = true;

      if (name.length < 2) {
        showFieldError('reg-name-err', 'Name must be at least 2 characters'); valid = false;
      } else clearFieldError('reg-name-err');

      if (!validateEmail(email)) {
        showFieldError('reg-email-err', 'Please enter a valid email'); valid = false;
      } else clearFieldError('reg-email-err');

      if (password.length < 6) {
        showFieldError('reg-pass-err', 'Password must be at least 6 characters'); valid = false;
      } else clearFieldError('reg-pass-err');

      if (password !== confirm) {
        showFieldError('reg-confirm-err', 'Passwords do not match'); valid = false;
      } else clearFieldError('reg-confirm-err');

      if (!valid) return;

      setLoading(btn, true);

      try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: name });

        // Check if user registered via referral link
        const urlParams = new URLSearchParams(window.location.search);
        const refVal = urlParams.get('ref');
        const refUid = (refVal && refVal !== 'undefined' && refVal !== 'null' && refVal.trim().length > 5) ? refVal.trim() : null;
        const bonusInitial = refUid ? (2 * 1024 * 1024 * 1024) : 0; // +2 GB for joining via referral!

        // Create user document in Firestore
        await createUserDoc(cred.user.uid, {
          name,
          email,
          plan: 'free',
          role: 'user',
          bonusStorage: bonusInitial,
          referredBy: refUid || null
        });

        // Reward referrer with +2 GB bonus storage
        if (refUid) {
          try {
            const referrerRef = db.collection('users').doc(refUid);
            const referrerDoc = await referrerRef.get();
            if (referrerDoc.exists) {
              const currentBonus = referrerDoc.data().bonusStorage || 0;
              const currentCount = referrerDoc.data().referralCount || 0;
              await referrerRef.update({
                bonusStorage: currentBonus + (2 * 1024 * 1024 * 1024),
                referralCount: currentCount + 1
              });
              console.log(`🎁 Referral bonus +2GB awarded to referrer: ${refUid}`);
            }
          } catch (refErr) {
            console.warn('Referral reward notice:', refErr);
          }
        }

        showToast(refUid ? 'Account created with +2 GB Bonus Storage! Welcome to GOshare! 🎁🎉' : 'Account created! Welcome to GOshare! 🎉', 'success');
        setTimeout(() => window.location.href = 'dashboard.html', 1000);
      } catch (error) {
        setLoading(btn, false);
        let msg = 'Registration failed. Try again.';
        if (error.code === 'auth/email-already-in-use') msg = 'Email already registered. Try logging in.';
        else if (error.code === 'auth/weak-password') msg = 'Password is too weak (min 6 chars)';
        else if (error.code === 'auth/invalid-email') msg = 'Invalid email format';
        showFieldError('reg-email-err', msg);
      }
    });

    // Password strength meter
    const passInput = document.getElementById('reg-pass');
    if (passInput) {
      passInput.addEventListener('input', () => {
        updatePasswordStrength(passInput.value);
      });
    }
  }
});

// ── Active Session Chooser Banner ──
function renderActiveSessionBanner(user) {
  const card = document.querySelector('.auth-card');
  if (!card || document.getElementById('active-session-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'active-session-banner';
  banner.style.cssText = `
    background: rgba(0, 200, 83, 0.12);
    border: 1px solid var(--green-500);
    border-radius: var(--radius-lg);
    padding: 16px;
    margin-bottom: 20px;
    text-align: center;
  `;
  banner.innerHTML = `
    <p style="font-size:0.9rem;margin-bottom:12px;color:var(--text-primary)">
      Logged in as: <strong style="color:var(--green-400)">${user.email}</strong>
    </p>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <a href="${user.email === ADMIN_EMAIL ? 'admin.html' : 'dashboard.html'}" class="btn btn-sm btn-primary">
        🚀 Continue as ${user.displayName || user.email.split('@')[0]}
      </a>
      <button type="button" class="btn btn-sm btn-glass" onclick="switchAccount()" style="color:#ef5350;border-color:rgba(239,83,80,0.3)">
        🔄 Switch Account / Log Out
      </button>
    </div>
  `;
  card.insertBefore(banner, card.firstChild);
}

async function switchAccount() {
  await auth.signOut();
  document.getElementById('active-session-banner')?.remove();
  showToast('Logged out. Select or log in with another account.', 'info');
}

// ── Helpers ──
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.add('show'); }
  const input = el?.previousElementSibling;
  if (input && input.classList) input.classList.add('error');
}

function clearFieldError(id) {
  const el = document.getElementById(id);
  if (el) { el.textContent = ''; el.classList.remove('show'); }
}

function setLoading(btn, loading) {
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '<span class="animate-spin">⟳</span> Loading…';
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    btn.disabled = false;
  }
}

function shakeForm(form) {
  form.style.animation = 'none';
  form.offsetHeight;
  form.style.animation = 'shake 0.4s ease';
}

function updatePasswordStrength(pass) {
  const bar  = document.getElementById('pass-strength-fill');
  const text = document.getElementById('pass-strength-text');
  if (!bar || !text) return;

  let score = 0;
  if (pass.length >= 6)  score++;
  if (pass.length >= 10) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;

  const levels = [
    { label: '', color: 'transparent', width: '0%' },
    { label: 'Weak',   color: '#ef5350', width: '20%' },
    { label: 'Fair',   color: '#FF9800', width: '40%' },
    { label: 'Good',   color: '#FFC107', width: '60%' },
    { label: 'Strong', color: '#00C853', width: '80%' },
    { label: 'Excellent', color: '#00E676', width: '100%' },
  ];

  const level = levels[score] || levels[0];
  bar.style.width = level.width;
  bar.style.background = level.color;
  text.textContent = level.label;
  text.style.color = level.color;
}

// ────────────────────────────────────
//  SOCIAL AUTHENTICATION (Google & GitHub with Account Selection)
// ────────────────────────────────────

async function loginWithGoogle() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await auth.signInWithPopup(provider);
    const user = cred.user;

    // Create user doc if missing
    let userDoc = await getUserDoc(user.uid);
    if (!userDoc) {
      const urlParams = new URLSearchParams(window.location.search);
      const refVal = urlParams.get('ref');
      const refUid = (refVal && refVal !== 'undefined' && refVal !== 'null' && refVal.trim().length > 5) ? refVal.trim() : null;
      const bonusInitial = refUid ? (2 * 1024 * 1024 * 1024) : 0;

      await createUserDoc(user.uid, {
        name: user.displayName || user.email.split('@')[0],
        email: user.email,
        plan: 'free',
        role: user.email === ADMIN_EMAIL ? 'admin' : 'user',
        bonusStorage: bonusInitial,
        referredBy: refUid || null
      });

      // Reward referrer with +2 GB bonus storage
      if (refUid) {
        try {
          const referrerRef = db.collection('users').doc(refUid);
          const referrerDoc = await referrerRef.get();
          if (referrerDoc.exists) {
            const currentBonus = referrerDoc.data().bonusStorage || 0;
            const currentCount = referrerDoc.data().referralCount || 0;
            await referrerRef.update({
              bonusStorage: currentBonus + (2 * 1024 * 1024 * 1024),
              referralCount: currentCount + 1
            });
            console.log(`🎁 Referral bonus +2GB awarded to referrer: ${refUid}`);
          }
        } catch (refErr) {
          console.warn('Referral reward notice:', refErr);
        }
      }
    }

    showToast(`Welcome, ${user.displayName || 'User'}! 🎉`, 'success');
    setTimeout(() => window.location.href = user.email === ADMIN_EMAIL ? 'admin.html' : 'dashboard.html', 800);
  } catch (error) {
    console.error('Google Auth Error:', error);
    if (error.code === 'auth/popup-closed-by-user') return;
    if (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-allowed') {
      showToast('Please enable Google Sign-In in Firebase Console ➔ Authentication ➔ Sign-in method', 'error');
    } else {
      showToast(`Google login: ${error.message}`, 'error');
    }
  }
}

async function loginWithGithub() {
  try {
    const provider = new firebase.auth.GithubAuthProvider();
    provider.setCustomParameters({ prompt: 'consent' });
    const cred = await auth.signInWithPopup(provider);
    const user = cred.user;

    // Create user doc if missing
    let userDoc = await getUserDoc(user.uid);
    if (!userDoc) {
      const urlParams = new URLSearchParams(window.location.search);
      const refVal = urlParams.get('ref');
      const refUid = (refVal && refVal !== 'undefined' && refVal !== 'null' && refVal.trim().length > 5) ? refVal.trim() : null;
      const bonusInitial = refUid ? (2 * 1024 * 1024 * 1024) : 0;

      await createUserDoc(user.uid, {
        name: user.displayName || user.email.split('@')[0],
        email: user.email,
        plan: 'free',
        role: user.email === ADMIN_EMAIL ? 'admin' : 'user',
        bonusStorage: bonusInitial,
        referredBy: refUid || null
      });

      // Reward referrer with +2 GB bonus storage
      if (refUid) {
        try {
          const referrerRef = db.collection('users').doc(refUid);
          const referrerDoc = await referrerRef.get();
          if (referrerDoc.exists) {
            const currentBonus = referrerDoc.data().bonusStorage || 0;
            const currentCount = referrerDoc.data().referralCount || 0;
            await referrerRef.update({
              bonusStorage: currentBonus + (2 * 1024 * 1024 * 1024),
              referralCount: currentCount + 1
            });
            console.log(`🎁 Referral bonus +2GB awarded to referrer: ${refUid}`);
          }
        } catch (refErr) {
          console.warn('Referral reward notice:', refErr);
        }
      }
    }

    showToast(`Welcome, ${user.displayName || 'User'}! 🎉`, 'success');
    setTimeout(() => window.location.href = user.email === ADMIN_EMAIL ? 'admin.html' : 'dashboard.html', 800);
  } catch (error) {
    console.error('GitHub Auth Error:', error);
    if (error.code === 'auth/popup-closed-by-user') return;
    if (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-allowed') {
      showToast('Please enable GitHub Sign-In in Firebase Console ➔ Authentication ➔ Sign-in method', 'error');
    } else {
      showToast(`GitHub login: ${error.message}`, 'error');
    }
  }
}

async function triggerUserPasswordReset(e) {
  if (e) e.preventDefault();
  const emailInput = document.getElementById('login-email');
  let email = emailInput ? emailInput.value.trim() : '';

  if (!email || !validateEmail(email)) {
    email = prompt('Enter your registered email address to receive a password reset link:');
  }

  if (!email || !validateEmail(email)) {
    alert('Please enter a valid email address.');
    return;
  }

  try {
    await auth.sendPasswordResetEmail(email);
    alert(`✅ Password Reset Link Sent!\n\nAn official Firebase password reset email has been sent to:\n${email}\n\nPlease check your email inbox (and Spam folder).`);
    if (typeof showToast === 'function') showToast(`Reset link sent to ${email}`, 'success');
  } catch (error) {
    console.error('Password reset error:', error);
    if (error.code === 'auth/user-not-found') {
      alert(`⚠️ Account Not Found:\n\nNo account with email "${email}" is registered in Firebase Auth.\n\nPlease check the spelling or sign up for a new account.`);
    } else {
      alert(`❌ Error sending reset email:\n\n${error.message}`);
    }
  }
}
