# Environment Setup Guide

This guide will help you set up Google OAuth for the Journal app.

## Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
```

## Step-by-Step Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "Apple Journal Clone" (or your preferred name)
4. Click "Create"

### 2. Enable Google Drive API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google Drive API"
3. Click on it and press "Enable"

### 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" user type
3. Fill in the required fields:
   - App name: `Apple Journal Clone`
   - User support email: Your email
   - Developer contact: Your email
4. Click "Save and Continue"
5. Add scopes:
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/drive.appdata`
6. Add test users (your email for testing)
7. Complete the setup

### 4. Create OAuth Credentials

#### Web Client (for Expo Go development)

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Web application"
4. Name: `Journal Web Client`
5. Add to "Authorized JavaScript origins":
   - `https://auth.expo.io`
6. Add to "Authorized redirect URIs":
   - `https://auth.expo.io/@your-expo-username/apple-journal-clone`
7. Click "Create"
8. Copy the Client ID to `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

#### Android Client (for standalone builds)

1. Click "Create Credentials" → "OAuth client ID"
2. Select "Android"
3. Name: `Journal Android Client`
4. Package name: `com.yourname.applejournalclone`
5. SHA-1 certificate fingerprint:
   - For debug: Run `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`
   - For production: Use your release keystore
6. Click "Create"
7. Copy the Client ID to `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`

## Testing Without Google Setup

The app includes a demo mode. If no Google credentials are configured, pressing "Continue with Google" will navigate directly to the home screen for testing purposes.

## Troubleshooting

### "redirect_uri_mismatch" error
- Make sure your Expo username and app slug match exactly in the redirect URI
- Check that you've added the correct origins and redirect URIs

### "access_denied" error
- Ensure your email is added as a test user in the OAuth consent screen
- The app is in "Testing" mode until you verify it with Google

### Need your Expo username?
Run `npx expo whoami` or check your account at [expo.dev](https://expo.dev)

