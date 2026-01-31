# Firebase Setup Instructions

## Prerequisites
- A Google account
- Node.js installed locally

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter a project name (e.g., "MTG Collection Tracker")
4. (Optional) Enable Google Analytics
5. Click "Create project"

## Step 2: Register Your Web App

1. In your Firebase project dashboard, click the **Web** icon (`</>`) to add a web app
2. Register your app with a nickname (e.g., "MTG Web App")
3. Click "Register app"
4. Copy the Firebase configuration object - you'll need these values

## Step 3: Enable Authentication

1. In the Firebase Console, go to **Build > Authentication**
2. Click "Get started"
3. Go to the **Sign-in method** tab
4. Enable **Email/Password** authentication
5. Click "Save"

## Step 4: Set Up Firestore Database

1. In the Firebase Console, go to **Build > Firestore Database**
2. Click "Create database"
3. Choose **Start in test mode** (for development)
   - **Important**: Update security rules for production!
4. Select a Cloud Firestore location (choose one close to your users)
5. Click "Enable"

## Step 5: Configure Security Rules (Important!)

Replace the default Firestore rules with these secure rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - users can only read/write their own document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Collections - users can only access their own collections
    match /collections/{collectionId} {
      allow read, write: if request.auth != null && 
                           collectionId.matches('^' + request.auth.uid + '_.*');
    }
  }
}
```

**To update rules:**
1. Go to **Firestore Database > Rules** tab
2. Replace the content with the above rules
3. Click "Publish"

## Step 6: Update Your Local Environment

1. Copy the Firebase configuration values from Step 2
2. Open the `.env.local` file in your project root
3. Replace the placeholder values with your actual Firebase config:

```env
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

4. Save the file

## Step 7: Test Your Setup

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Open your app and try to:
   - Sign up with a new account
   - Add some cards to your collection
   - Log out and log back in
   - Verify your data persists

## Data Structure in Firestore

Your Firestore database will have two collections:

### `users` collection
```
users/
  {userId}/
    username: string
    email: string
    createdAt: number
```

### `collections` collection
```
collections/
  {userId}_{universe}/
    cards: { [cardId]: quantity }
    foilCards: { [cardId]: quantity }
    decks: { [deckName]: boolean }
    customDecks: CustomDeck[]
    lastUpdated: number
```

## Production Considerations

### Update Firestore Security Rules
For production, implement more granular security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isSignedIn() && isOwner(userId);
      allow create: if isSignedIn() && isOwner(userId);
      allow update: if isSignedIn() && isOwner(userId) 
                    && request.resource.data.keys().hasOnly(['username', 'email', 'createdAt']);
    }
    
    // Collections
    match /collections/{collectionId} {
      allow read: if isSignedIn() && collectionId.matches('^' + request.auth.uid + '_.*');
      allow write: if isSignedIn() && collectionId.matches('^' + request.auth.uid + '_.*')
                   && request.resource.data.keys().hasOnly(['cards', 'foilCards', 'decks', 'customDecks', 'lastUpdated']);
    }
  }
}
```

### Set Up Firebase Authentication Domain
1. Go to **Authentication > Settings > Authorized domains**
2. Add your production domain (e.g., `yourdomain.com`)

### Environment Variables for Production
Create a `.env.production` file with your production Firebase config:
```env
VITE_FIREBASE_API_KEY=your-production-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-production-domain.firebaseapp.com
# ... other production config
```

## Troubleshooting

### "Missing or insufficient permissions" error
- Check your Firestore security rules
- Ensure the user is authenticated
- Verify the document path matches the security rules

### Authentication not working
- Verify Email/Password is enabled in Firebase Console
- Check that API keys in `.env.local` are correct
- Look for errors in browser console

### Data not syncing
- Check browser console for Firestore errors
- Verify internet connection
- Ensure Firestore is enabled and not in test mode that has expired

## Cost Considerations

Firebase has a generous free tier:
- **Authentication**: 50,000 phone authentications/month (Email is unlimited)
- **Firestore**: 
  - 50,000 reads/day
  - 20,000 writes/day
  - 20,000 deletes/day
  - 1 GiB storage

For a typical user of this app, this should be well within free tier limits.

## Next Steps

After Firebase is working:
1. Consider adding password reset functionality
2. Add email verification
3. Implement data export/import features
4. Add social authentication (Google, Facebook, etc.)
5. Set up Firebase Analytics to track app usage
