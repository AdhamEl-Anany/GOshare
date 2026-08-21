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

// Persistence – keep user logged in
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

console.log('🔥 Firebase initialized with GOshare project!');
