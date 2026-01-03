/**
 * Environment configuration for Google OAuth
 * 
 * You need to set up these values in Google Cloud Console:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing
 * 3. Enable Google Drive API
 * 4. Go to Credentials > Create Credentials > OAuth client ID
 * 5. For Android: Select "Android" and add your package name & SHA-1
 * 6. For Web (Expo Go testing): Select "Web application"
 * 7. Copy the Client IDs below
 */

// For Expo Go development, we use the web client ID
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

// For standalone Android builds
export const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';

// For standalone iOS builds (future)
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

// Google Drive API scopes
export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file', // Access to files created by the app
  'https://www.googleapis.com/auth/drive.appdata', // Access to app-specific folder
];

// Validate environment
export const isGoogleConfigured = () => {
  return Boolean(GOOGLE_WEB_CLIENT_ID);
};

