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
  const snap = await db.collection('files')
    .where('ownerId', '==', uid)
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getAllFiles() {
  const snap = await db.collection('files').orderBy('createdAt', 'desc').get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getFileDoc(fileId) {
  const doc = await db.collection('files').doc(fileId).get();
  if (doc.exists) return { id: doc.id, ...doc.data() };
  return null;
}

async function deleteFileDoc(fileId) {
  await db.collection('files').doc(fileId).delete();
}

async function renameFileDoc(fileId, newName) {
  await db.collection('files').doc(fileId).update({ name: newName });
}

async function incrementDownloads(fileId) {
  await db.collection('files').doc(fileId).update({
    downloads: firebase.firestore.FieldValue.increment(1)
  });
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
  await db.collection('links').doc(shortId).set({
    fileId,
    ownerId,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function getFileByShortId(shortId) {
  const linkDoc = await db.collection('links').doc(shortId).get();
  if (!linkDoc.exists) return null;
  const linkData = linkDoc.data();
  const fileDoc = await db.collection('files').doc(linkData.fileId).get();
  if (!fileDoc.exists) return null;
  return { id: fileDoc.id, ...fileDoc.data() };
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
//  FIREBASE STORAGE OPERATIONS (With Automatic Fallback)
// ────────────────────────────────────

function uploadFileToStorage(uid, file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      try {
        const storagePath = `uploads/${uid}/${Date.now()}_${file.name}`;
        const ref = storage.ref(storagePath);
        const uploadTask = ref.put(file);

        uploadTask.on('state_changed',
          (snapshot) => {
            const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(pct);
          },
          (error) => {
            console.warn('Storage notice (Blaze plan needed), using Firestore DataURL fallback:', error.message);
            if (onProgress) onProgress(100);
            resolve({ downloadUrl: dataUrl, storagePath: '' });
          },
          async () => {
            const downloadUrl = await uploadTask.snapshot.ref.getDownloadURL();
            resolve({ downloadUrl, storagePath });
          }
        );
      } catch (err) {
        console.warn('Storage unavailable, using Firestore DataURL fallback:', err.message);
        if (onProgress) onProgress(100);
        resolve({ downloadUrl: dataUrl, storagePath: '' });
      }
    };
    reader.onerror = (err) => reject(err);
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
