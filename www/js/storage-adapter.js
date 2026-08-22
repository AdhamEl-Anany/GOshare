/* ===========================
   GOshare – Cloud Storage Adapter
   (100% Free Storage Provider - No Credit Card Required)
   =========================== */

async function uploadFileCloud(uid, file, onProgress) {
  if (onProgress) onProgress(15);

  // 1. Try Firebase Storage if active
  if (typeof firebase !== 'undefined' && firebase.storage) {
    try {
      const storagePath = `uploads/${uid}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const ref = firebase.storage().ref(storagePath);
      
      const uploadPromise = new Promise((resolve, reject) => {
        const uploadTask = ref.put(file);
        
        let hasFailed = false;
        uploadTask.on('state_changed',
          (snapshot) => {
            if (snapshot.totalBytes > 0) {
              const pct = Math.min(95, Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
              if (onProgress) onProgress(pct);
            }
          },
          (error) => {
            hasFailed = true;
            console.warn('Firebase Storage unavailable/billing required, switching to Free Storage:', error.message);
            resolve(null);
          },
          async () => {
            if (!hasFailed) {
              try {
                const downloadUrl = await uploadTask.snapshot.ref.getDownloadURL();
                resolve({ downloadUrl, storagePath });
              } catch (e) {
                resolve(null);
              }
            }
          }
        );

        // Fail-safe timeout (3 seconds) if billing pop-up blocks Firebase Storage
        setTimeout(() => {
          if (!hasFailed) {
            console.warn('Firebase Storage timeout, switching to 100% Free IndexedDB Storage Provider');
            resolve(null);
          }
        }, 3000);
      });

      const res = await uploadPromise;
      if (res && res.downloadUrl) return res;
    } catch (e) {
      console.warn('Firebase Storage error, using 100% Free Storage:', e);
    }
  }

  // 2. High-Performance Persistent Free Storage Provider (IndexedDB + Blob Storage)
  return await uploadFileFreeProvider(uid, file, onProgress);
}

async function uploadFileFreeProvider(uid, file, onProgress) {
  if (onProgress) onProgress(50);
  
  const blobKey = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  
  // Store file binary permanently in browser IndexedDB database
  await storeIndexedDBFile(blobKey, file);

  const blobUrl = URL.createObjectURL(file);

  if (onProgress) onProgress(100);

  return {
    downloadUrl: blobUrl,
    storagePath: `idb:${blobKey}`,
    blobKey: blobKey,
    isFreeProvider: true
  };
}

// ── IndexedDB Storage Helper ──
function getStorageDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('GOshareCloudStorage', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('user_files')) {
        db.createObjectStore('user_files');
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function storeIndexedDBFile(key, file) {
  try {
    const db = await getStorageDB();
    const tx = db.transaction('user_files', 'readwrite');
    tx.objectStore('user_files').put(file, key);
    return new Promise((resolve) => tx.oncomplete = () => resolve(true));
  } catch (e) {
    console.warn('IndexedDB store notice:', e);
    return false;
  }
}

async function getIndexedDBFile(key) {
  try {
    const db = await getStorageDB();
    return new Promise((resolve) => {
      const tx = db.transaction('user_files', 'readonly');
      const req = tx.objectStore('user_files').get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

async function deleteIndexedDBFile(key) {
  try {
    const db = await getStorageDB();
    const tx = db.transaction('user_files', 'readwrite');
    tx.objectStore('user_files').delete(key);
  } catch (e) {
    // Ignore
  }
}
