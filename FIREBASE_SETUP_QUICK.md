# 🔧 Quick Firebase Configuration Fix

## ❌ Current Problem
Your Firebase configuration contains placeholder values, causing the **"client is offline"** error:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  // ... more placeholder values
};
```

## ✅ Quick Solution

### Step 1: Get Your Real Firebase Config
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your CampusKart project (or create one if needed)
3. Click **⚙️ Settings** → **Project Settings**
4. Scroll down to **"Your apps"** section
5. Click **"Config"** radio button
6. Copy the `firebaseConfig` object

### Step 2: Update Your Configuration
Replace the content in `backend/firebase-config.js` with your real values:

```javascript
// firebase-config.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// Your REAL Firebase configuration (replace these values)
const firebaseConfig = {
  apiKey: "AIzaSyD...",  // Your actual API key
  authDomain: "campuskart-12345.firebaseapp.com",  // Your actual domain
  projectId: "campuskart-12345",  // Your actual project ID
  storageBucket: "campuskart-12345.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
  measurementId: "G-XXXXXXXXXX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

export default app;
```

### Step 3: Enable Services in Firebase Console
1. **Authentication**: Go to Authentication → Sign-in method → Enable Email/Password and Google
2. **Firestore**: Go to Firestore Database → Create database → Start in test mode
3. **Add your domain**: Authentication → Settings → Authorized domains → Add `localhost` and your domain

## 🧪 Test Your Setup

### Option 1: Use the Diagnostic Tool
1. Open `firebase-diagnostic.html` in your browser
2. Click **"Run All Tests"**
3. Check if configuration errors are resolved

### Option 2: Test Your Main App
1. Open `index.html`
2. Check browser console for errors
3. Try signing in to test authentication

## 🚨 Common Issues & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `client is offline` | Placeholder config | Replace with real Firebase config |
| `auth/configuration-not-found` | Google Auth not enabled | Enable Google sign-in in Firebase Console |
| `permission-denied` | Firestore rules | Set rules to allow read/write for authenticated users |
| `auth/unauthorized-domain` | Domain not authorized | Add your domain to authorized domains |

## ⚡ Immediate Actions

1. **Replace Firebase config** with real values from your Firebase project
2. **Enable Authentication** and **Firestore** in Firebase Console  
3. **Test using** `firebase-diagnostic.html`
4. **Check browser console** for any remaining errors

Once you update the configuration with real values, the offline error should be resolved! 🎉

---

**Need help?** Run `firebase-diagnostic.html` to see detailed error analysis and step-by-step fixes.