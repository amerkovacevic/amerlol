# Firestore Database Structure

This document describes the complete Firestore database structure for the amer.lol platform, including all collections, subcollections, and security rules.

## Overview

The Firestore database uses a hierarchical structure where all user data is organized under the `users` collection. Each user document contains subcollections for different apps and their settings.

## Database Structure

```
firestore/
  users/
    {userId}/
      (root fields)
        - username: string
        - email: string
        - displayName: string
        - createdAt: Timestamp
        - updatedAt: Timestamp
      
      encryptionSettings/
        default/
          - autoConvert: boolean
          - clearOnTabChange: boolean
          - defaultTab: string
          - fontSize: number
          - createdAt: Timestamp
          - updatedAt: Timestamp
      
      diffCheckerSettings/
        default/
          - fontSize: number
          - showLineNumbers: boolean
          - ignoreWhitespace: boolean
          - ignoreCase: boolean
          - theme: "light" | "dark" | "auto"
          - createdAt: Timestamp
          - updatedAt: Timestamp
      
      timezoneSettings/
        default/
          - defaultTimeZones: string[]
          - timeFormat: "12" | "24"
          - showSeconds: boolean
          - showDayNight: boolean
          - autoRefresh: boolean
          - createdAt: Timestamp
          - updatedAt: Timestamp
      
      {appId}Settings/
        default/
          - (app-specific settings)
          - createdAt: Timestamp
          - updatedAt: Timestamp
```

## Collection: `users`

### Document Path
```
users/{userId}
```

### Document ID
- Format: Firebase Auth UID
- Example: `abc123xyz789`
- Source: `user.uid` from Firebase Authentication

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | No | User's chosen username |
| `email` | string | Yes | User's email address |
| `displayName` | string | No | User's display name |
| `createdAt` | Timestamp | Yes | When the user document was created |
| `updatedAt` | Timestamp | Yes | When the user document was last updated |

### Example Document
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "displayName": "John Doe",
  "createdAt": "2025-01-12T00:00:00Z",
  "updatedAt": "2025-01-12T12:30:00Z"
}
```

### Security Rules
```javascript
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

**Rule Explanation:**
- Users can only read/write their own user document
- `request.auth.uid` must match the document `userId`
- Requires authentication (`request.auth != null`)

---

## Subcollection: `encryptionSettings`

### Document Path
```
users/{userId}/encryptionSettings/default
```

### Purpose
Stores user-specific settings for the Encryption Platform app.

### Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `autoConvert` | boolean | `true` | Automatically convert text as user types |
| `clearOnTabChange` | boolean | `false` | Clear inputs when switching between ciphers |
| `defaultTab` | string | `"base64"` | Default tab to show on load |
| `fontSize` | number | `14` | Font size in pixels |
| `createdAt` | Timestamp | - | When settings were first created |
| `updatedAt` | Timestamp | - | When settings were last updated |

### Example Document
```json
{
  "autoConvert": true,
  "clearOnTabChange": false,
  "defaultTab": "base64",
  "fontSize": 14,
  "createdAt": "2025-01-12T00:00:00Z",
  "updatedAt": "2025-01-12T12:30:00Z"
}
```

### Security Rules
```javascript
match /encryptionSettings/{settingsId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

---

## Subcollection: `diffCheckerSettings`

### Document Path
```
users/{userId}/diffCheckerSettings/default
```

### Purpose
Stores user-specific settings for the Diff Checker app.

### Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `fontSize` | number | `14` | Font size in pixels |
| `showLineNumbers` | boolean | `true` | Display line numbers in diff result |
| `ignoreWhitespace` | boolean | `false` | Ignore whitespace differences when comparing |
| `ignoreCase` | boolean | `false` | Ignore case differences when comparing |
| `theme` | string | `"auto"` | Display theme: "light", "dark", or "auto" |
| `createdAt` | Timestamp | - | When settings were first created |
| `updatedAt` | Timestamp | - | When settings were last updated |

### Security Rules
```javascript
match /diffCheckerSettings/{settingsId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

---

## Subcollection: `timezoneSettings`

### Document Path
```
users/{userId}/timezoneSettings/default
```

### Purpose
Stores user-specific settings for the Time Zone Converter app.

### Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `defaultTimeZones` | string[] | `["America/New_York", "Europe/London", "Asia/Tokyo"]` | Default time zones to show |
| `timeFormat` | string | `"12"` | Time format: "12" or "24" hour |
| `showSeconds` | boolean | `true` | Display seconds in time display |
| `showDayNight` | boolean | `true` | Display day/night indicators |
| `autoRefresh` | boolean | `true` | Automatically update times every second |
| `createdAt` | Timestamp | - | When settings were first created |
| `updatedAt` | Timestamp | - | When settings were last updated |

### Security Rules
```javascript
match /timezoneSettings/{settingsId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

---

## Pattern: `{appId}Settings` Subcollection

### Document Path Pattern
```
users/{userId}/{appId}Settings/default
```

### Naming Convention
- Subcollection name: `{appId}Settings` (PascalCase)
- Document ID: Always `"default"` (single settings document per user per app)
- Example: `calculatorSettings`, `timeZoneConverterSettings`

### Required Fields

Every settings document must include:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `createdAt` | Timestamp | Yes | When settings were first created |
| `updatedAt` | Timestamp | Yes | When settings were last updated |

### Timestamp Usage

**Always use `serverTimestamp()`:**

```typescript
import { serverTimestamp } from "firebase/firestore"

// ✅ Correct
await setDoc(settingsRef, {
  ...settings,
  updatedAt: serverTimestamp(),
})

// ❌ Wrong - don't use client-side Date
await setDoc(settingsRef, {
  ...settings,
  updatedAt: new Date(),
})
```

### Creating Settings Document

```typescript
const settingsRef = doc(
  db, 
  "users", 
  user.uid, 
  "{appId}Settings",  // Subcollection name
  "default"           // Always "default"
)

// Create new document
await setDoc(settingsRef, {
  ...defaultSettings,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
})

// Update existing document
await setDoc(settingsRef, {
  ...settings,
  updatedAt: serverTimestamp(),
}, { merge: true })

// Or use updateDoc (preserves createdAt)
await updateDoc(settingsRef, {
  ...settings,
  updatedAt: serverTimestamp(),
})
```

---

## Security Rules

### Complete Rules File

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    // Document structure: /users/{userId}
    // Fields: username, email, displayName, createdAt, updatedAt
    // Security: Only the authenticated user whose UID matches the document ID can access
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Encryption settings subcollection
      // Document structure: /users/{userId}/encryptionSettings/{settingsId}
      match /encryptionSettings/{settingsId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Diff Checker settings subcollection
      // Document structure: /users/{userId}/diffCheckerSettings/{settingsId}
      match /diffCheckerSettings/{settingsId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Time Zone Converter settings subcollection
      // Document structure: /users/{userId}/timezoneSettings/{settingsId}
      match /timezoneSettings/{settingsId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Pattern for new apps: {appId}Settings subcollection
      // Document structure: /users/{userId}/{appId}Settings/{settingsId}
      // Add new rules following this pattern:
      // match /{appId}Settings/{settingsId} {
      //   allow read, write: if request.auth != null && request.auth.uid == userId;
      // }
    }
  }
}
```

### Rule Pattern for New Apps

When adding a new app, add a rule following this pattern:

```javascript
match /{appId}Settings/{settingsId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

**Important:**
- Replace `{appId}Settings` with your actual subcollection name
- Use PascalCase: `calculatorSettings`, not `calculator-settings`
- The `{settingsId}` is typically `"default"` but the rule allows any ID
- Always verify `request.auth.uid == userId` for security

---

## Data Operations

### Reading Settings

```typescript
import { doc, getDoc } from "firebase/firestore"

const settingsRef = doc(db, "users", user.uid, "{appId}Settings", "default")
const settingsSnap = await getDoc(settingsRef)

if (settingsSnap.exists()) {
  const data = settingsSnap.data()
  // Use data.settingsField
} else {
  // Document doesn't exist, use defaults
}
```

### Writing Settings

```typescript
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore"

const settingsRef = doc(db, "users", user.uid, "{appId}Settings", "default")

// Create or update (overwrites)
await setDoc(settingsRef, {
  ...settings,
  updatedAt: serverTimestamp(),
})

// Update only (preserves other fields)
await updateDoc(settingsRef, {
  ...settings,
  updatedAt: serverTimestamp(),
})
```

### Deleting Settings

```typescript
import { doc, deleteDoc } from "firebase/firestore"

const settingsRef = doc(db, "users", user.uid, "{appId}Settings", "default")
await deleteDoc(settingsRef)
```

---

## Best Practices

### 1. Always Use serverTimestamp()

**Why:**
- Client clocks can be wrong
- Timezone issues
- Consistency across users

**How:**
```typescript
import { serverTimestamp } from "firebase/firestore"

await setDoc(ref, {
  updatedAt: serverTimestamp(),  // ✅ Correct
})
```

### 2. Merge with Defaults

Always merge user settings with defaults:

```typescript
const DEFAULT_SETTINGS = {
  fontSize: 14,
  theme: "auto",
}

// When loading
const data = settingsSnap.data()
const settings = { ...DEFAULT_SETTINGS, ...data }

// When saving
await setDoc(ref, {
  ...DEFAULT_SETTINGS,
  ...userSettings,
  updatedAt: serverTimestamp(),
})
```

### 3. Preserve createdAt

When updating, preserve `createdAt`:

```typescript
// Option 1: Use updateDoc (doesn't overwrite createdAt)
await updateDoc(settingsRef, {
  ...settings,
  updatedAt: serverTimestamp(),
})

// Option 2: Explicitly preserve createdAt
const existing = await getDoc(settingsRef)
await setDoc(settingsRef, {
  ...settings,
  createdAt: existing.data()?.createdAt || serverTimestamp(),
  updatedAt: serverTimestamp(),
}, { merge: true })
```

### 4. Error Handling

Always handle Firestore errors:

```typescript
try {
  await setDoc(settingsRef, settings)
  toast.success("Settings saved")
} catch (error: any) {
  if (error.code === "permission-denied") {
    toast.error("Permission denied. You can only update your own settings.")
  } else if (error.code === "unavailable") {
    toast.error("Service temporarily unavailable. Please try again later.")
  } else {
    console.error("Failed to save settings:", error)
    toast.error("Failed to save settings")
  }
}
```

### 5. localStorage Fallback

Provide localStorage fallback for first-time users:

```typescript
// Load from Firestore first
const settingsSnap = await getDoc(settingsRef)

if (settingsSnap.exists()) {
  setSettings(settingsSnap.data())
} else {
  // Fallback to localStorage
  const localSaved = localStorage.getItem(STORAGE_KEY)
  if (localSaved) {
    const parsed = JSON.parse(localSaved)
    setSettings(parsed)
    // Migrate to Firestore
    await setDoc(settingsRef, {
      ...parsed,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }
}
```

---

## Indexes

Currently, no composite indexes are required. If you need to query across multiple fields or sort by fields, you may need to create indexes in `firestore.indexes.json`.

### Example Index Configuration

```json
{
  "indexes": [],
  "fieldOverrides": []
}
```

---

## Migration Guide

### Adding New Settings Fields

When adding new fields to existing settings:

1. **Update Default Settings:**
```typescript
const DEFAULT_SETTINGS = {
  // Existing fields
  fontSize: 14,
  // New field
  newField: "defaultValue",
}
```

2. **Merge on Load:**
```typescript
const data = settingsSnap.data()
setSettings({ ...DEFAULT_SETTINGS, ...data })
```

3. **Users will automatically get defaults** for new fields on next load

### Renaming Fields

If you need to rename a field:

1. Load old field name
2. Map to new field name
3. Save with new field name
4. Remove old field (optional)

```typescript
const oldData = settingsSnap.data()
const newSettings = {
  ...oldData,
  newFieldName: oldData.oldFieldName,  // Migrate
  // Remove oldFieldName
}
delete newSettings.oldFieldName
await setDoc(settingsRef, newSettings)
```

---

## Validation

### Document Validation

Before saving, validate your data:

```typescript
const validateSettings = (settings: AppSettings): boolean => {
  if (settings.fontSize < 10 || settings.fontSize > 20) {
    toast.error("Font size must be between 10 and 20")
    return false
  }
  // Add more validations
  return true
}

if (validateSettings(settings)) {
  await setDoc(settingsRef, settings)
}
```

---

## Testing

### Test Cases

When testing Firestore operations:

1. **Authenticated User:**
   - Can read own settings ✅
   - Can write own settings ✅
   - Cannot read other user's settings ✅
   - Cannot write other user's settings ✅

2. **Unauthenticated User:**
   - Cannot read any settings ✅
   - Cannot write any settings ✅

3. **Data Integrity:**
   - Timestamps are set correctly ✅
   - Defaults are merged properly ✅
   - Updates preserve createdAt ✅

---

## Troubleshooting

### Permission Denied

**Cause:** Security rules not matching or user not authenticated

**Solutions:**
- Verify user is authenticated
- Check subcollection name matches rules exactly
- Ensure `request.auth.uid == userId` in rules
- Check Firestore rules are deployed

### Timestamp Issues

**Cause:** Using client-side Date instead of serverTimestamp

**Solutions:**
- Always use `serverTimestamp()` from Firestore
- Never use `new Date()` for Firestore timestamps
- Timestamps are converted server-side

### Missing Fields

**Cause:** Settings loaded before defaults merged

**Solutions:**
- Always merge with defaults: `{ ...DEFAULT_SETTINGS, ...data }`
- Check defaults include all required fields
- Validate data before using

---

**Last Updated**: January 2025
**Version**: 1.0
