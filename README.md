# 💎 GOshare – Fast, Secure & Premium Cloud File Sharing Platform

<p align="center">
  <img src="assets/images/logo-horizontal.jpeg" alt="GOshare Logo" width="600" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/GOshare-v2.0.0-00C853?style=for-the-badge&logo=firebase&logoColor=white" />
  <img src="https://img.shields.io/badge/Android%20App-v1.0.0%20APK-3DDC84?style=for-the-badge&logo=android&logoColor=white" />
  <img src="https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore%20%7C%20Storage-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" />
  <img src="https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" />
  <img src="https://img.shields.io/badge/Security-XSS%20Protected%20%7C%20Crypto%20ShortLinks-00E676?style=for-the-badge" />
</p>

**GOshare** is a state-of-the-art, high-performance, responsive cloud file sharing platform & Android application inspired by MediaFire with an emerald & diamond dark glassmorphism design. Powered by **Google Firebase** (Auth, Firestore, Storage) and **Capacitor 8 Native Bridge** for seamless web & mobile file management.

---

## 📱 Android Mobile App

GOshare is now available as a native **Android Application** (APK & AAB)!

- 📥 **Direct APK Download**: [Download GOshare APK v1.0.0](https://github.com/AdhamEl-Anany/GOshare/releases/download/v1.0.0/GOshare-Android-App.apk)
- 🔗 **Deep Linking (App Links)**: Shareable file URLs (`https://adhamel-anany.github.io/GOshare/file.html?s=...`) open directly inside the native app.
- ⚡ **Native Capabilities**: Built with Capacitor 8, featuring native Android Back Button navigation, Status Bar customization, and native Share Sheet integration.
- ⚙️ **Automated Cloud Builds**: Powered by GitHub Actions CI/CD workflows (`.github/workflows/build-android.yml`) that compile fresh production APK/AAB binaries automatically on code push.

---

## 🌟 Key Features

- 🔒 **Firebase Authentication**: Full user signup, signin, session persistence, navbar user dropdown, and secure profile management.
- 🎬 **In-Browser Media Players & Previews**: Instant stream & preview for HD Videos (`.mp4, .webm, .mov`), Audio tracks (`.mp3, .wav, .ogg`), and Images (`.png, .jpg, .webp, .svg`).
- 🔐 **Password-Protected File Links**: Set custom security passwords for shared files so only authorized users with the passcode can view or download.
- ⏳ **Auto-Expiring Links**: Set custom expiration limits (e.g. 24 hours, 7 days) after which shared file links automatically expire.
- 🔗 **High-Entropy Cryptographic Short Links**: Powered by `crypto.getRandomValues()` to generate secure 10-character IDs (`file.html?s=aB3xZ9K1mP`).
- 📁 **Cloud Storage Adapter**: Multi-provider cloud storage adapter with zero credit card requirements, instant upload progress, and malware file blocking (`.exe, .bat, .php`).
- 💳 **PayPal Live & Dynamic EGP InstaPay Gateways**: Fully integrated PayPal Live SDK and real-time live currency exchange rate converter for InstaPay transfers in Egyptian Pounds.
- ⚙️ **Comprehensive Admin Panel**: Management suite for reviewing premium upgrade requests, managing users, inspecting stored files, and system statistics.
- 📊 **Real-Time Live Platform Counters**: Dynamic home page counters connected live to Firestore collections data.

---

## 🛠️ Tech Stack

- **Web Frontend**: HTML5, CSS3 (Vanilla Glassmorphism, CSS Custom Variables & Animations), JavaScript (ES6+)
- **Mobile Engine**: Capacitor 8 (Cross-Platform Android Native Bridge)
- **Backend Services**: Google Firebase (Authentication, Cloud Firestore, Storage)
- **CI/CD & Cloud Build**: GitHub Actions Workflows (`build-android.yml`)
- **Payment Gateways**: PayPal Live SDK & Live Currency Exchange Rate API (USD to EGP)
- **Deployment**: GitHub Pages / Firebase Hosting

---

## 💻 Local Development & Build

```bash
# Clone the repository
git clone https://github.com/AdhamEl-Anany/GOshare.git

# Navigate to project folder
cd GOshare

# Sync web assets to Android Capacitor container
npm run cap:sync
```

---

## 👨‍💻 Developer & Credits

Developed and Managed by **ENG.Adham Hany**

- 📘 **Facebook**: [Adham Hany](https://www.facebook.com/share/18zxWztWGU/?mibextid=wwXIfr)
- 🎵 **TikTok**: [@adham_01130](https://www.tiktok.com/@adham_01130?_r=1&_t=ZS-98JYKSfhp2K)
- 📸 **Instagram**: [@elanany.adham](https://www.instagram.com/elanany.adham?igsh=Ymh0bTN0MHp3OWp1&utm_source=qr)
- 💼 **LinkedIn**: [ENG.Adham Hany](https://www.linkedin.com/in/adham-hany-93878933a?utm_source=share_via&utm_content=profile&utm_medium=member_ios)
- 💻 **GitHub**: [AdhamEl-Anany](https://github.com/AdhamEl-Anany)
- ▶️ **YouTube**: [Channel](https://www.youtube.com/channel/UCjukCoewJ849qKGY2-csxlw)

---

© 2026 **GOshare**. Developed with 💚 by **ENG.Adham Hany**.
