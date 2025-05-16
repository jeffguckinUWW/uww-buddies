import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.diveuww.uwwbuddies',
  appName: 'UWW Buddies',
  webDir: 'build',
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  },
  ios: {
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: false,
    allowsLinkPreview: false,
    // Add these for better iOS WebView performance
    backgroundColor: "#ffffff",
    scrollEnabled: true,
    // More permissive WebView configuration
    webContentsDebuggingEnabled: false // Set to true for debugging, false for production
  },
  loggingBehavior: 'none'  // Reduce console noise
};

export default config;