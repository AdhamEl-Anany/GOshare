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

function generateShortId(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
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
  try {
    const linkDoc = await db.collection('links').doc(shortId).get();
    if (linkDoc.exists) {
      const linkData = linkDoc.data();
      const fileDoc = await db.collection('files').doc(linkData.fileId).get();
      if (fileDoc.exists) return { id: fileDoc.id, ...fileDoc.data() };
    }
  } catch (e) {}

  const fallbackFiles = JSON.parse(localStorage.getItem('goshare_files_fallback') || '[]');
  const file = fallbackFiles.find(f => f.shortId === shortId);
  if (file) return file;

  // Search by shortId in files collection
  try {
    const snap = await db.collection('files').where('shortId', '==', shortId).limit(1).get();
    if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch (e) {}

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

function uploadFileToStorage(uid, file, onProgress) {
  return new Promise((resolve) => {
    if (onProgress) onProgress(15);
    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const pct = Math.min(90, Math.round((e.loaded / e.total) * 100));
        onProgress(pct);
      }
    };

    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      if (onProgress) onProgress(100);

      try {
        const storagePath = `uploads/${uid}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const ref = storage.ref(storagePath);
        const uploadTask = ref.put(file);

        let timer = setTimeout(() => {
          console.warn('Storage slow/locked, resolving with instant DataURL fallback');
          resolve({ downloadUrl: dataUrl, storagePath: '' });
        }, 2000);

        uploadTask.then(async (snapshot) => {
          clearTimeout(timer);
          try {
            const downloadUrl = await snapshot.ref.getDownloadURL();
            resolve({ downloadUrl, storagePath });
          } catch (e) {
            resolve({ downloadUrl: dataUrl, storagePath: '' });
          }
        }).catch(() => {
          clearTimeout(timer);
          resolve({ downloadUrl: dataUrl, storagePath: '' });
        });
      } catch (err) {
        resolve({ downloadUrl: dataUrl, storagePath: '' });
      }
    };

    reader.onerror = () => {
      resolve({ downloadUrl: '', storagePath: '' });
    };

    reader.readAsDataURL(file);
  });
}

async function deleteFileFromStorage(storagePath) {
  if (!storagePath) return;
  try {
    await storage.ref(storagePath).delete();
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
