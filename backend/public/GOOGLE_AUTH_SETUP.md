# 🔧 Google Authentication Setup Guide

## Current Issue
**Error:** `auth/configuration-not-found`  
**Cause:** Google Sign-In is not enabled in Firebase Console

## ✅ Step-by-Step Fix

### 1. Enable Google Sign-In in Firebase Console

1. **Go to Firebase Console:**
   - Open https://console.firebase.google.com/
   - Select your project: `thrift-6bd6d`

2. **Navigate to Authentication:**
   - Click on **"Authentication"** in the left sidebar
   - Click on **"Sign-in method"** tab

3. **Enable Google Provider:**
   - Find **"Google"** in the list of sign-in providers
   - Click on **"Google"** to open its configuration
   - Toggle the **"Enable"** switch to ON

4. **Configure Google Provider:**
   - **Project support email:** Enter your email address
   - **Project public-facing name:** Enter "CampusKart" (or your preferred name)
   - Click **"Save"**

### 2. Add Authorized Domains

1. **In Firebase Console → Authentication → Settings:**
   - Scroll down to **"Authorized domains"**
   - Make sure these domains are listed:
     - `localhost` (for local development)
     - Your production domain (when you deploy)
   - If missing, click **"Add domain"** and add them

### 3. Configure OAuth Consent Screen (if prompted)

If you get redirected to Google Cloud Console:

1. **Go to Google Cloud Console:**
   - Open https://console.cloud.google.com/
   - Select your project: `thrift-6bd6d`

2. **Configure OAuth Consent:**
   - Go to **"APIs & Services"** → **"OAuth consent screen"**
   - Choose **"External"** user type
   - Fill in required fields:
     - **App name:** "CampusKart"
     - **User support email:** Your email
     - **Developer contact information:** Your email
   - Save and continue through the steps

### 4. Test the Configuration

1. **Use the test file:**
   - Open `google-auth-test.html` in your browser
   - Click **"Test Firebase Config"** - should show green ✅
   - Click **"Test Google Provider Setup"** - should not show `configuration-not-found` error

2. **Test your auth page:**
   - Open `auth.html` in your browser
   - Try clicking the Google sign-in button
   - Should open Google popup (or show popup-blocked error, which is normal)

## 🚨 Common Issues & Solutions

### Issue: "Project support email is required"
- **Solution:** Go to Firebase Console → Authentication → Sign-in method → Google → Add your email

### Issue: "OAuth consent screen not configured"
- **Solution:** Configure OAuth consent screen in Google Cloud Console (Step 3 above)

### Issue: "Domain not authorized"
- **Solution:** Add your domain to authorized domains list (Step 2 above)

### Issue: Popup blocked
- **Solution:** This is normal browser behavior. Allow popups or use redirect method

## ✅ Verification Checklist

- [ ] Firebase project `thrift-6bd6d` selected
- [ ] Authentication enabled in Firebase Console
- [ ] Google sign-in method enabled
- [ ] Project support email configured
- [ ] `localhost` added to authorized domains
- [ ] OAuth consent screen configured (if required)
- [ ] Test file shows no `configuration-not-found` errors

## 📝 Notes

- After enabling Google Sign-In, it may take a few minutes to propagate
- You might need to refresh your browser cache
- For production, add your actual domain to authorized domains

## 🆘 Still Having Issues?

1. Check the browser console for detailed error messages
2. Try the `debug-auth.html` file for more detailed testing
3. Ensure you have owner/editor permissions on the Firebase project
4. Contact Firebase support if the issue persists after following all steps

## 📞 Support Links

- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Google Sign-In Setup Guide](https://firebase.google.com/docs/auth/web/google-signin)
- [Firebase Console](https://console.firebase.google.com/)
- [Google Cloud Console](https://console.cloud.google.com/)