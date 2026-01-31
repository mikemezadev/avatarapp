# Quick Start Guide

## 🚀 Running Locally (Current Setup)

Your app is ready to run! Just execute:

```bash
npm install
npm run dev
```

The app will start at `http://localhost:5173`

**Current Status:**
- ✅ Uses localStorage for data persistence
- ✅ Mock authentication system
- ✅ No backend required
- ✅ Works offline

---

## 🔥 Upgrading to Firebase

I've integrated Firebase for real user authentication and cloud data storage. To enable it:

### Quick Setup (5 minutes)

1. **Create Firebase Project**
   - Go to https://console.firebase.google.com/
   - Create a new project
   - Enable Email/Password authentication
   - Create a Firestore database

2. **Get Your Config**
   - In Firebase Console, register a web app
   - Copy the configuration values

3. **Update Environment Variables**
   - Open `.env.local`
   - Replace placeholder values with your Firebase config

4. **Restart the App**
   ```bash
   npm run dev
   ```

📖 **Detailed instructions**: See [FIREBASE_SETUP.md](FIREBASE_SETUP.md)

---

## 🎯 What Changed?

### Before (localStorage only)
- Data stored locally in browser
- Lost when clearing browser data
- Can't sync across devices
- No real authentication

### After (Firebase enabled)
- ✨ Real user accounts with secure passwords
- ☁️ Data saved to cloud (Firestore)
- 🔄 Sync across all devices
- 🔐 Secure authentication
- 💾 Automatic backups
- 🌐 Access from anywhere

---

## 📁 File Changes Made

### New Files
- `firebase.config.ts` - Firebase initialization
- `.env.local` - Environment variables (add your keys here)
- `FIREBASE_SETUP.md` - Detailed Firebase setup guide

### Modified Files
- `components/AuthContext.tsx` - Now uses Firebase Auth
- `components/CollectionContext.tsx` - Syncs with Firestore
- `App.tsx` - Added auth loading state

---

## 🧪 Testing

### Test with Mock Data (No Firebase needed)
Just run the app - it still works with localStorage for guest users!

### Test with Firebase
1. Complete Firebase setup
2. Sign up with a test account
3. Add cards to your collection
4. Close browser and reopen
5. Login again - your data should be there!
6. Try from another device - data syncs!

---

## 🛡️ Security Notes

- `.env.local` is git-ignored (your keys are safe)
- Firestore rules restrict access to user's own data
- Passwords are never stored in plain text
- All Firebase communication is encrypted

---

## 💰 Cost

Firebase offers a generous **FREE tier**:
- Unlimited email authentication
- 50K reads/day, 20K writes/day
- 1 GB storage

For a personal collection tracker, you'll stay well within free limits!

---

## 🎮 Guest Mode

Users can still use the app without signing up:
- Data stored in localStorage (browser only)
- Perfect for trying the app
- Can create account later to sync data

---

## 📞 Need Help?

**Firebase Setup Issues:**
1. Check browser console for errors
2. Verify `.env.local` values are correct
3. Ensure Firestore rules are published
4. Check Authentication is enabled in Firebase Console

**General Issues:**
- Clear browser cache and try again
- Check browser console for error messages
- Verify all dependencies are installed (`npm install`)

---

## 🎉 Next Steps

Once Firebase is working:
1. ✅ Share the app with friends
2. ✅ Access from multiple devices
3. ✅ Build your collection with confidence
4. Consider adding:
   - Password reset
   - Email verification
   - Social login (Google, etc.)
   - Data export/import

---

## 🚢 Deployment

Ready to deploy? Great platforms for hosting:

- **Vercel** (Recommended) - Free tier, auto-deploys from Git
- **Netlify** - Free tier, easy setup
- **Firebase Hosting** - Integrated with your Firebase project

All work perfectly with Vite + React apps!
