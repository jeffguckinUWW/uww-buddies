# Firebase Authentication Setup

## IMPORTANT: Prevent Duplicate Accounts

To prevent users from accidentally creating multiple accounts with the same email, you need to configure Firebase Auth settings.

## Firebase Console Configuration

### 1. Go to Firebase Console
- Navigate to: https://console.firebase.google.com
- Select your project: `uww-buddies`

### 2. Authentication Settings
1. Click **Authentication** in left sidebar
2. Click **Settings** tab
3. Scroll down to **User account management** section

### 3. Configure "Link accounts that use the same email"

**You'll see this setting in the User account management section.**

**Your options:**
- ❌ **"Create multiple accounts for each identity provider"** - DON'T select this (creates duplicates)
- ✅ **"Link accounts that use the same email"** - SELECT this one

**What "Link accounts" does:**
- If user signs up with `jeff@gmail.com` + password
- Later tries to sign in with Google using `jeff@gmail.com`
- Firebase will show error: `auth/account-exists-with-different-credential`
- Our code catches this and tells user to use their original sign-in method
- Prevents duplicate accounts with same email address

## What Happens With This Enabled:

### Scenario 1: Email/Password First
```
User: Signs up with jeff@gmail.com + password
Later: Tries Google sign-in with jeff@gmail.com
Result: ❌ Error "Account exists with different sign-in method"
Message: "Please sign in using your email and password instead"
```

### Scenario 2: Google First
```
User: Signs in with Google (jeff@gmail.com)
Later: Tries to register with jeff@gmail.com + password
Result: ❌ Error "Email already in use"
Message: "An account with this email already exists"
```

## Alternative: Account Linking (Advanced)

If you want users to be able to link multiple sign-in methods to one account:

1. Keep "One account per email" enabled
2. Add account linking flow (more complex, but better UX)
3. When error occurs, offer to link accounts
4. User authenticates with existing method, then links new one

**Note:** Account linking requires more code and is more complex. Start with the simple approach above.

## Testing

After enabling the setting:

1. Create account with `test@example.com` + password
2. Sign out
3. Try signing in with Google using `test@example.com`
4. Should see: "Account exists with different sign-in method" error ✅

## Current Code Status

✅ Error handling added in `src/context/AuthContext.js:178-183`
✅ User-friendly error messages displayed
✅ Prevents confusion and duplicate profiles

## Summary

**You must select "Link accounts that use the same email" in Firebase Console** for this protection to work. The code is ready, but Firebase needs to be configured.

## Quick Steps:
1. Firebase Console → Authentication → Settings
2. Find "Link accounts that use the same email"
3. Select that option (NOT "Create multiple accounts")
4. Save
5. Done! Duplicate accounts are now prevented.
