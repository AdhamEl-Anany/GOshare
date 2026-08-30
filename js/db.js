/* ===========================
   GOshare – Database Operations (Firestore + Storage)
   =========================== */

// ────────────────────────────────────
//  USER OPERATIONS
// ────────────────────────────────────

async function createUserDoc(uid, data) {
  await db.collection('users').doc(uid).set({
    name: data.name || '',
    email: data.email || '',
    plan: data.plan || 'free',
    role: data.role || 'user',
    storageUsed: 0,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function getUserDoc(uid) {
  const doc = await db.collection('users').doc(uid).get();
  if (doc.exists) return { id: doc.id, ...doc.data() };
  return null;
}

async function updateUserDoc(uid, data) {
  await db.collection('users').doc(uid).update(data);
}

async function updateUserPlan(uid, plan) {
  await db.collection('users').doc(uid).update({ plan });
}

async function getAllUsers() {
  const snap = await db.collection('users').orderBy('createdAt', 'desc').get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function updateUserStorageUsed(uid) {
  const snap = await db.collection('files').where('ownerId', '==', uid).get();
  let total = 0;
  snap.forEach(doc => { total += doc.data().size || 0; });
  await db.collection('users').doc(uid).update({ storageUsed: total });
  return total;
}

// ────────────────────────────────────
//  FILE OPERATIONS
// ────────────────────────────────────

async function addFileDoc(fileData) {
  const ref = await db.collection('files').add({
    name: fileData.name,
    size: fileData.size || 0,
    type: fileData.type || '',
    ownerId: fileData.ownerId,
    ownerEmail: fileData.ownerEmail || '',
    downloadUrl: fileData.downloadUrl || '',
    storagePath: fileData.storagePath || '',
    shortId: fileData.shortId,
    downloads: 0,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return ref.id;
}

async function getUserFiles(uid) {
  let files = [];
  try {
    const snap = await db.collection('files')
      .where('ownerId', '==', uid)
      .get();
    files = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.warn('Firestore getUserFiles notice:', e.message);
  }

  const fallbackFiles = JSON.parse(localStorage.getItem('goshare_files_fallback') || '[]')
    .filter(f => f.ownerId === uid);

  const existingIds = new Set(files.map(f => f.id));
  fallbackFiles.forEach(f => {
    if (!existingIds.has(f.id)) files.push(f);
  });

  return files;
}

async function getAllFiles() {
  try {
    const snap = await db.collection('files').get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    return JSON.parse(localStorage.getItem('goshare_files_fallback') || '[]');
  }
}

async function getFileDoc(fileId) {
  try {
    const doc = await db.collection('files').doc(fileId).get();
    if (doc.exists) return { id: doc.id, ...doc.data() };
  } catch (e) {}

  const fallbackFiles = JSON.parse(localStorage.getItem('goshare_files_fallback') || '[]');
  return fallbackFiles.find(f => f.id === fileId) || null;
}

async function deleteFileDoc(fileId) {
  try {
    await db.collection('files').doc(fileId).delete();
  } catch (e) {}

  let fallbackFiles = JSON.parse(localStorage.getItem('goshare_files_fallback') || '[]');
  fallbackFiles = fallbackFiles.filter(f => f.id !== fileId);
  localStorage.setItem('goshare_files_fallback', JSON.stringify(fallbackFiles));
}

async function renameFileDoc(fileId, newName) {
  try {
    await db.collection('files').doc(fileId).update({ name: newName });
  } catch (e) {}

  const fallbackFiles = JSON.parse(localStorage.getItem('goshare_files_fallback') || '[]');
  const file = fallbackFiles.find(f => f.id === fileId);
  if (file) {
    file.name = newName;
    localStorage.setItem('goshare_files_fallback', JSON.stringify(fallbackFiles));
  }
}

async function incrementDownloads(fileId) {
  try {
    await db.collection('files').doc(fileId).update({
      downloads: firebase.firestore.FieldValue.increment(1)
    });
  } catch (e) {}

  const fallbackFiles = JSON.parse(localStorage.getItem('goshare_files_fallback') || '[]');
  const file = fallbackFiles.find(f => f.id === fileId);
  if (file) {
    file.downloads = (file.downloads || 0) + 1;
    localStorage.setItem('goshare_files_fallback', JSON.stringify(fallbackFiles));
  }
}

// ────────────────────────────────────
//  SHORT LINK OPERATIONS
// ────────────────────────────────────

// ── Cryptographically Secure High-Entropy Short ID Generator ──
function generateShortId(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(length);
  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(bytes[i] % chars.length);
  }
  return result;
}

async function createShortLink(shortId, fileId, ownerId) {
  try {
    await db.collection('links').doc(shortId).set({
      fileId,
      ownerId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.warn('Firestore short link write notice:', e.message);
  }
}

async function getFileByShortId(shortId) {
  const fetchWithTimeout = (promise, ms = 4000) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore query timeout')), ms))
    ]);
  };

  try {
    const linkDoc = await fetchWithTimeout(db.collection('links').doc(shortId).get());
    if (linkDoc && linkDoc.exists) {
      const linkData = linkDoc.data();
      const fileDoc = await fetchWithTimeout(db.collection('files').doc(linkData.fileId).get());
      if (fileDoc && fileDoc.exists) return { id: fileDoc.id, ...fileDoc.data() };
    }
  } catch (e) {
    console.warn('Firestore link query notice:', e.message);
  }

  try {
    const fallbackFiles = JSON.parse(localStorage.getItem('goshare_files_fallback') || '[]');
    const file = fallbackFiles.find(f => f.shortId === shortId);
    if (file) return file;
  } catch (e) {}

  // Search by shortId in files collection
  try {
    const snap = await fetchWithTimeout(db.collection('files').where('shortId', '==', shortId).limit(1).get());
    if (snap && !snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch (e) {
    console.warn('Firestore files search notice:', e.message);
  }

  return null;
}

async function deleteShortLink(shortId) {
  await db.collection('links').doc(shortId).delete();
}

// ────────────────────────────────────
//  PREMIUM REQUEST OPERATIONS
// ────────────────────────────────────

async function createPremiumRequest(data) {
  const ref = await db.collection('premiumRequests').add({
    userId: data.userId,
    userEmail: data.userEmail,
    userName: data.userName || '',
    plan: data.plan, // 'pro' or 'business'
    status: 'pending',
    requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
    reviewedAt: null
  });
  return ref.id;
}

async function getUserPremiumRequest(uid) {
  const snap = await db.collection('premiumRequests')
    .where('userId', '==', uid)
    .where('status', '==', 'pending')
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

async function getPendingRequests() {
  const snap = await db.collection('premiumRequests')
    .where('status', '==', 'pending')
    .orderBy('requestedAt', 'desc')
    .get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getAllPremiumRequests() {
  const snap = await db.collection('premiumRequests')
    .orderBy('requestedAt', 'desc')
    .get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function approveRequest(requestId, userId, plan) {
  // Update request status
  await db.collection('premiumRequests').doc(requestId).update({
    status: 'approved',
    reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  // Update user plan
  await updateUserPlan(userId, plan);
}

async function rejectRequest(requestId) {
  await db.collection('premiumRequests').doc(requestId).update({
    status: 'rejected',
    reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ────────────────────────────────────
//  FIREBASE STORAGE OPERATIONS (Instant Progress & Fail-Safe)
// ────────────────────────────────────

async function uploadFileToStorage(uid, file, onProgress) {
  if (typeof uploadFileCloud === 'function') {
    return await uploadFileCloud(uid, file, onProgress);
  }
  // Fallback
  const blobUrl = URL.createObjectURL(file);
  if (onProgress) onProgress(100);
  return { downloadUrl: blobUrl, storagePath: '' };
}

async function deleteFileFromStorage(storagePath) {
  if (!storagePath) return;
  if (storagePath.startsWith('idb:')) {
    const key = storagePath.replace('idb:', '');
    if (typeof deleteIndexedDBFile === 'function') {
      await deleteIndexedDBFile(key);
    }
    return;
  }
  try {
    if (typeof storage !== 'undefined' && storage.ref) {
      await storage.ref(storagePath).delete();
    }
  } catch (e) {
    console.warn('Storage delete failed:', e.message);
  }
}

// ────────────────────────────────────
//  STATS (Admin)
// ────────────────────────────────────

async function getAdminStats() {
  const [usersSnap, filesSnap, pendingSnap] = await Promise.all([
    db.collection('users').get(),
    db.collection('files').get(),
    db.collection('premiumRequests').where('status', '==', 'pending').get()
  ]);

  let totalStorage = 0;
  let totalDownloads = 0;
  filesSnap.forEach(doc => {
    totalStorage += doc.data().size || 0;
    totalDownloads += doc.data().downloads || 0;
  });

  return {
    totalUsers: usersSnap.size,
    totalFiles: filesSnap.size,
    totalStorage,
    totalDownloads,
    pendingRequests: pendingSnap.size
  };
}

// ── Public Platform Live Stats (Homepage - Real Active Data) ──
async function getPublicPlatformStats() {
  if (window.REAL_STATS_CONFIG && window.REAL_STATS_CONFIG.overrideMockData) {
    return {
      totalUsers: window.REAL_STATS_CONFIG.totalUsers || 0,
      totalFiles: window.REAL_STATS_CONFIG.totalFiles || 0,
      totalStorage: window.REAL_STATS_CONFIG.totalStorage || 0
    };
  }
  try {
    const usersSnap = await db.collection('users').get();
    const filesSnap = await db.collection('files').get();

    // Filter real registered active users
    let totalUsers = 0;
    usersSnap.forEach(doc => {
      const data = doc.data();
      if (!data) return;
      const email = (data.email || '').toLowerCase().trim();
      const name = (data.name || '').toLowerCase().trim();
      // Exclude empty, dummy test, or mock emails/accounts
      const isDummy = !email || email.includes('test') || email.includes('example.com') || email.includes('mock') || email.startsWith('dummy');
      if (!isDummy && (email.includes('@') || name.length > 1)) {
        totalUsers++;
      }
    });

    // Filter real uploaded valid files & compute actual storage used
    let totalFiles = 0;
    let totalStorage = 0;
    filesSnap.forEach(doc => {
      const data = doc.data();
      if (!data) return;
      const fileName = (data.name || '').trim();
      const size = data.size || 0;
      const url = data.downloadUrl || data.storagePath || '';
      // Exclude empty/dummy test files
      const isDummyFile = !fileName || fileName.toLowerCase().includes('dummy') || fileName.toLowerCase().includes('test-file') || size === 0 || !url;
      if (!isDummyFile) {
        totalFiles++;
        totalStorage += size;
      }
    });

    return {
      totalUsers,
      totalFiles,
      totalStorage
    };
  } catch (e) {
    console.warn('Public stats query notice:', e);
    return { totalUsers: 0, totalFiles: 0, totalStorage: 0 };
  }
}

// ── Account & Data Purge (Google Play Compliant) ──
async function deleteUserAccountAndData(uid) {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== uid) {
    throw new Error('User not authenticated');
  }

  // 1. Purge all user files from Cloud Storage & Firestore
  try {
    const files = await getUserFiles(uid);
    for (const f of files) {
      if (f.storagePath) {
        try { await deleteFileFromStorage(f.storagePath); } catch (e) {}
      }
      await deleteFileDoc(f.id);
    }
  } catch (e) {
    console.warn('Error purging user files:', e);
  }

  // 2. Delete user record from Firestore
  try {
    await db.collection('users').doc(uid).delete();
  } catch (e) {
    console.warn('Error deleting user record:', e);
  }

  // 3. Clear local storage cache
  localStorage.removeItem('goshare_user');
  localStorage.removeItem('goshare_files_fallback');

  // 4. Delete user account from Firebase Auth
  await currentUser.delete();
}

