# Authentication Standardization (v1.1.0)

## Changes Made

### Problem
Google sign-in and email/password authentication created different user experiences:
- Different profile structures
- Duplicate data storage (users + profiles collections)
- Google users appeared to have different capabilities
- Inconsistent name/photo handling

### Solution
Standardized all authentication to work identically regardless of sign-in method.

## Key Changes

### 1. Single Source of Truth
- **ONLY** using `profiles` collection now
- Removed `users` collection references
- All user data stored in one place: `profiles/{uid}`

### 2. Profile Creation
Both Google and email/password now create **identical** profiles with:
```javascript
{
  name: string,              // From Google name OR email username
  email: string,
  photoURL: string,          // Google photo as default, but user can override
  phone: string,
  bio: string,
  city: string,
  state: string,
  certificationLevel: string,
  buddyList: {},             // Now in profiles, not separate users collection
  authProvider: string,      // Tracks: 'google.com' or 'password'
  // ... all other profile fields
}
```

### 3. All Users Can Now:
- ✅ Upload/change profile pictures (even Google users)
- ✅ Edit their name (even Google users)
- ✅ Edit all profile fields identically
- ✅ Use all app features the same way
- ✅ Be buddies with anyone regardless of auth method
- ✅ Send messages, join courses, trips - everything works the same

### 4. What's Different for Google Users?
**Only the initial setup:**
- Google users start with their Google name and photo as defaults
- Email users start with email username and no photo
- **After that, both can customize everything the same way**

## Migration Notes

### Existing Users
- Old profiles are automatically updated on next login
- `buddyList` added if missing
- `authProvider` tracked for analytics

### Database Structure
```
firestore/
  └── profiles/           ← Single source of truth
      └── {uid}/
          ├── name
          ├── email
          ├── photoURL    ← User can override Google photo
          ├── buddyList   ← Moved from users collection
          └── ...all other fields
```

## Testing Checklist

- [ ] Google sign-up creates full profile
- [ ] Email sign-up creates full profile
- [ ] Google users can upload custom photos
- [ ] Google users can edit their name
- [ ] Both can send/receive buddy requests
- [ ] Both can join courses and trips
- [ ] Both can send messages
- [ ] Profile updates work for both
- [ ] Buddy lists work cross-auth-method

## Code References

- Profile creation: `src/context/AuthContext.js:60-146`
- Profile updates: `src/context/AuthContext.js:231-258`
- Photo uploads: `src/components/Profile/Profile.js:1044-1093`
