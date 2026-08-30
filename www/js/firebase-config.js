/* ===========================
   GOshare – Firebase Configuration
   =========================== */

const firebaseConfig = {
  apiKey: "AIzaSyDvHMgqJ3ZgWlGe3xiMHDteQoWYbYPRo5Q",
  authDomain: "goshare-cd92f.firebaseapp.com",
  projectId: "goshare-cd92f",
  storageBucket: "goshare-cd92f.firebasestorage.app",
  messagingSenderId: "962464942390",
  appId: "1:962464942390:web:30ff06b815e3b989d70b97",
  measurementId: "G-K9MB7FWNQT"
};

// Initialize Firebase (Compat CDN)
firebase.initializeApp(firebaseConfig);

// Global references
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Admin email (hardcoded)
const ADMIN_EMAIL = 'adham.cs.guides@gmail.com';

// Real Platform Baseline Stats (Full active platform counts with dynamic live updates)
window.REAL_STATS_CONFIG = {
  overrideMockData: true,
  totalUsers: 1165,       // Total registered users
  totalFiles: 1102,       // Total files shared
  totalStorage: 7025459   // Total cloud storage used (6.7 MB)
};

// Persistence – keep user logged in
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

console.log('🔥 Firebase initialized with GOshare project!');
