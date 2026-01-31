# Firebase Integration Checklist

Use this checklist to ensure proper Firebase setup:

## ✅ Pre-Setup
- [ ] Node.js is installed
- [ ] You have a Google account
- [ ] `npm install` completed successfully

---

## 🔥 Firebase Console Setup

### 1. Create Project
- [ ] Created Firebase project at console.firebase.google.com
- [ ] Project name recorded: ___________________

### 2. Register Web App
- [ ] Added web app in Firebase Console
- [ ] Copied Firebase configuration values

### 3. Enable Authentication
- [ ] Opened **Build > Authentication**
- [ ] Clicked "Get started"
- [ ] Enabled **Email/Password** sign-in method
- [ ] Saved changes

### 4. Create Firestore Database
- [ ] Opened **Build > Firestore Database**
- [ ] Clicked "Create database"
- [ ] Selected **Test mode** (for development)
- [ ] Chose a location: ___________________
- [ ] Clicked "Enable"

### 5. Configure Security Rules
- [ ] Opened **Firestore Database > Rules** tab
- [ ] Copied rules from FIREBASE_SETUP.md
- [ ] Clicked "Publish"
- [ ] Rules published successfully

---

## 💻 Local Configuration

### 6. Environment Variables
- [ ] Opened `.env.local` file
- [ ] Replaced `VITE_FIREBASE_API_KEY` with actual value
- [ ] Replaced `VITE_FIREBASE_AUTH_DOMAIN` with actual value
- [ ] Replaced `VITE_FIREBASE_PROJECT_ID` with actual value
- [ ] Replaced `VITE_FIREBASE_STORAGE_BUCKET` with actual value
- [ ] Replaced `VITE_FIREBASE_MESSAGING_SENDER_ID` with actual value
- [ ] Replaced `VITE_FIREBASE_APP_ID` with actual value
- [ ] Saved `.env.local` file

### 7. Restart Development Server
- [ ] Stopped current dev server (Ctrl+C)
- [ ] Ran `npm run dev`
- [ ] App opened in browser without errors

---

## 🧪 Testing

### 8. Test Authentication
- [ ] Opened app in browser
- [ ] Clicked "Sign Up" or login button
- [ ] Created test account with email/password
- [ ] Successfully signed up
- [ ] Logged out
- [ ] Logged back in with same credentials
- [ ] Login successful

### 9. Test Data Persistence
- [ ] Logged in to app
- [ ] Selected a universe
- [ ] Added at least 3 cards to collection
- [ ] Refreshed the page
- [ ] Cards still in collection ✓
- [ ] Closed browser completely
- [ ] Reopened app and logged in
- [ ] Collection data persisted ✓

### 10. Verify Firestore Data
- [ ] Opened Firebase Console
- [ ] Went to **Firestore Database**
- [ ] Saw `users` collection with your user document
- [ ] Saw `collections` collection with your data
- [ ] Data structure looks correct

---

## 🐛 Troubleshooting

If something doesn't work:

### Authentication Errors
- [ ] Checked browser console for error messages
- [ ] Verified Email/Password is enabled in Firebase Console
- [ ] Confirmed `.env.local` values match Firebase Console exactly
- [ ] No extra spaces or quotes in `.env.local` values

### Data Not Saving
- [ ] Checked browser console for Firestore errors
- [ ] Verified Firestore security rules are published
- [ ] Confirmed internet connection is active
- [ ] Checked Firestore Database is not in expired test mode

### General Issues
- [ ] Cleared browser cache
- [ ] Tried in incognito/private window
- [ ] Verified `npm install` completed without errors
- [ ] Checked all files were saved

---

## ✨ Success Indicators

You'll know everything is working when:

1. ✅ You can sign up with email/password
2. ✅ You can log out and log back in
3. ✅ Your collection data persists after page refresh
4. ✅ You see your data in Firebase Console > Firestore Database
5. ✅ No errors in browser console (F12)

---

## 📊 Firebase Console Quick Links

After setup, bookmark these:

- **Authentication Users**: console.firebase.google.com/project/YOUR_PROJECT/authentication/users
- **Firestore Data**: console.firebase.google.com/project/YOUR_PROJECT/firestore
- **Project Settings**: console.firebase.google.com/project/YOUR_PROJECT/settings/general

(Replace YOUR_PROJECT with your actual project ID)

---

## 🎉 Next Steps After Success

- [ ] Test from multiple devices
- [ ] Share app with a friend to test
- [ ] Consider deploying to Vercel/Netlify
- [ ] Review production security rules in FIREBASE_SETUP.md
- [ ] Add custom domain (optional)
- [ ] Enable Firebase Analytics (optional)

---

## 📝 Notes

Use this space for any custom notes or issues encountered:

```
[Your notes here]
```
