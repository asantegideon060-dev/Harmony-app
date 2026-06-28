# 🎵 Harmony

> **Connecting Students to Campus Communities**

A university-based PWA that connects students with campus associations, clubs, fellowships, and societies.

---

## 🚀 Quick Deploy

### 1. Clone & Install
```bash
git clone https://github.com/asantegideon060-dev/Harmony-app.git
cd Harmony-app
npm install
```

### 2. Run Locally
```bash
npm run dev
```
Open http://localhost:5173

### 3. Deploy to Vercel
Push to GitHub → Vercel auto-deploys on every push.

---

## ✨ Features

### For Students
- 👨‍🎓 Register & create a profile
- 🔍 Search & discover associations by name, category, or interest
- ❤️ Like, comment & share posts
- 📅 View & save upcoming events
- 🔔 Get notifications from followed associations
- 💬 Message associations directly
- 🎬 TikTok-style Explore feed of association videos

### For Associations
- 🏛️ Create an official association profile
- 📸 Upload logo & cover image
- 📝 Post videos, images, announcements & event flyers
- 📅 Create events with flyers
- 👥 Build a follower base
- 💬 Receive student inquiries

### Admin
- ✅ Approve/reject association registrations
- 👥 Manage all users
- 🗑️ Remove inappropriate content
- 📊 Monitor platform activity

---

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Media | Cloudinary |
| Hosting | Vercel |
| PWA | Service Worker + Web Manifest |

---

## 📱 PWA Installation

On mobile: tap the browser menu → "Add to Home Screen"

On desktop: click the install icon in the address bar

---

## 🔧 Admin Access

To grant admin access, add your email to the `ADMIN_EMAILS` array in `src/App.jsx`:
```js
const ADMIN_EMAILS = ["your@email.com"];
```

---

## 📁 Project Structure

```
harmony-app/
├── index.html          # Entry point
├── vite.config.js      # Vite config
├── vercel.json         # Vercel SPA routing
├── package.json
├── public/
│   ├── manifest.json   # PWA manifest
│   ├── sw.js           # Service worker
│   └── icon.svg        # App icon
└── src/
    ├── main.jsx        # React root
    └── App.jsx         # Full app (single file)
```

---

*Harmony – Connecting Students to Campus Communities* 🎓
